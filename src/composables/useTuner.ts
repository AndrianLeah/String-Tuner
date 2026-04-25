/**
 * useTuner — simplified sequential string tuner.
 *
 * Flow:
 *  1. Start on string 0. Stay focused on it until confirmed in tune.
 *  2. Once in tune, auto-advance to the next untuned string.
 *  3. User can click any chip to jump to that string (resets its progress).
 *  4. When all strings are confirmed tuned, stop listening and reset.
 *
 * No auto-string detection. No ghost detector. No manual-lock concept.
 * The engine only ever listens for the currently locked string.
 *
 * Audio capture is delegated to useAudioCapture (Dependency Inversion).
 */
import { readonly, ref, watch, type Ref } from 'vue'
import type { TuningPreset } from '../data/tunings'
import { useAudioCapture, type AudioFrame } from './useAudioCapture'
/** Cents window considered "in tune" (±8¢ is comfortable for guitar) */
const ACCEPT_CENTS = 8
/** Cents above ACCEPT_CENTS before we consider resetting stability (hysteresis) */
const STABILITY_RESET_CENTS = 20
/** How long (ms) pitch must remain outside before stability progress resets */
const STABILITY_RESET_MS = 150
/** Minimum ms between Presentation Layer writes to Vue reactive refs (~30fps) */
const DISPLAY_INTERVAL_MS = 33
/** EMA smoothing factor — 0.04 at 60fps ≈ 500ms settling time */
const CENTS_EMA_ALPHA = 0.04
/** How long (ms) to show the all-tuned banner before auto-stopping */
const ALL_TUNED_RESET_MS = 2000
/** RMS below which the SNR is too poor — apply tighter (decay) clarity gate */
const LOW_RMS_THRESHOLD = 0.04

/** Per-instrument analysis configuration */
interface InstrumentConfig {
	/** Primary FFT window size — larger values improve low-freq fundamental detection */
	primaryFftSize: number
	/** How long (ms) pitch must stay inside ACCEPT_CENTS to confirm the string */
	stableMs: number
	/** Minimum pitchy clarity to accept a pitch reading */
	clarityThreshold: number
	/** Stricter clarity gate when the string RMS is decaying */
	decayClarityThreshold: number
}

const INSTRUMENT_CONFIGS: Record<string, InstrumentConfig> = {
	// decayClarityThreshold MUST always be <= clarityThreshold:
	// decaying strings produce noisier signals (lower RMS → worse SNR),
	// so the clarity gate must be more permissive when the string is quiet,
	// not stricter. Inverted values cause valid quiet-tail frames to be
	// rejected, fragmenting the stability timer and requiring many plucks.
	//
	// bass:    8192 FFT resolves E1(41Hz) cleanly; long sustain warrants
	//          1500ms hold. Low strings have heavy overtone content so
	//          decay threshold is relaxed to match guitar's tuned value.
	// guitar:  confirmed via session logs — 0.80 decay threshold accepts
	//          quiet-tail frames at 0.83-0.91 while rejecting noise at ≤0.76.
	// ukulele: nylon strings, short sustain; quiet tail is brief but noisy.
	// violin:  bowed, no sharp attack; clarity drops fast after bow lift.
	bass: {
		primaryFftSize: 8192,
		stableMs: 1500,
		clarityThreshold: 0.93,
		decayClarityThreshold: 0.82,
	},
	guitar: {
		primaryFftSize: 2048,
		stableMs: 1100,
		clarityThreshold: 0.92,
		decayClarityThreshold: 0.8,
	},
	ukulele: {
		primaryFftSize: 2048,
		stableMs: 800,
		clarityThreshold: 0.85,
		decayClarityThreshold: 0.75,
	},
	violin: {
		primaryFftSize: 2048,
		stableMs: 600,
		clarityThreshold: 0.8,
		decayClarityThreshold: 0.7,
	},
}
const DEFAULT_INSTRUMENT_CONFIG: InstrumentConfig = INSTRUMENT_CONFIGS.guitar
/** Rolling median buffer size (22 × 16ms ≈ 350ms history) */
const PITCH_BUFFER_SIZE = 22
/** Max cents jump between EMA and incoming pitch before discarding as noise */
const PITCH_CONTINUITY_CENTS = 500
/** Wide hint window (±1 octave) — shows too-high/too-low even when heavily out of tune */
const HINT_WINDOW_CENTS = 1200
/** How long (ms) to hold the 'in-range' hint after pitch drifts slightly out */
const HINT_GRACE_MS = 250
/** How long (ms) to keep display alive after the last valid signal frame */
const SIGNAL_HOLD_MS = 500
/** Logging interval (ms) — throttles console output to ~2 logs/s */
const LOG_INTERVAL_MS = 500

// --- Session log collector ---
// Entries accumulate while tuning; flushed to console as a single pasteable
// block when stop() is called. Reset on every start().
let sessionLog: string[] = []
function slog(msg: string) {
	sessionLog.push(msg)
}

export type TunerHint = 'too-high' | 'too-low' | 'in-range' | null

function centsBetween(freq: number, targetFreq: number): number {
	return Math.round(1200 * Math.log2(freq / targetFreq))
}

/**
 * Returns true if `pitch` is approximately an integer harmonic (2×–6×) of
 * `fundamentalFreq`. Tolerance ±8% covers natural intonation variance.
 */
function isHarmonicOf(pitch: number, fundamentalFreq: number): boolean {
	for (let n = 2; n <= 6; n++) {
		if (Math.abs(pitch / fundamentalFreq - n) < 0.08) return true
	}
	return false
}

function median(arr: number[]): number {
	const s = [...arr].sort((a, b) => a - b)
	return s[Math.floor(s.length / 2)]
}

/**
 * Fold `pitch` toward `targetFreq` by dividing by N = 2..6.
 * If dividing brings it within 300¢ AND improves the match by >400¢,
 * return the folded value. Corrects pitchy latching onto upper harmonics.
 */
function foldTowardTarget(pitch: number, targetFreq: number): number {
	const rawCents = Math.abs(centsBetween(pitch, targetFreq))
	let best = pitch
	let bestCents = rawCents
	for (let n = 2; n <= 6; n++) {
		const folded = pitch / n
		const fc = Math.abs(centsBetween(folded, targetFreq))
		if (fc < bestCents && rawCents - fc > 400 && fc < 300) {
			bestCents = fc
			best = folded
		}
	}
	return best
}

export function useTuner(activeTuning: Ref<TuningPreset>) {
	const { isCapturing, captureError, startCapture, stopCapture, setLowPassCutoff } =
		useAudioCapture()

	// --- Reactive state (Presentation Layer) ---
	// Written only on display frames (~30fps) to avoid Vue batching pressure.
	const frequency = ref<number | null>(null)
	/** 0-based index into tuning array — the string currently being tuned */
	const lockedStringIndex = ref<number>(0)
	const cents = ref<number | null>(null)
	const hint = ref<TunerHint>(null)
	/** 0–1: progress toward confirming current string as in tune */
	const stabilityProgress = ref<number>(0)
	/** Indices of strings that have been confirmed tuned */
	const tunedStrings = ref<Set<number>>(new Set())
	const allTuned = ref(false)
	/** Float cents for needle — holds last position on signal loss */
	const needleCents = ref<number | null>(null)
	/** pitchy clarity (0–1) — drives needle opacity in the UI */
	const signalClarity = ref(0)

	// --- Engine state (internal, written every tick at ~60fps) ---
	let cfg: InstrumentConfig =
		INSTRUMENT_CONFIGS[activeTuning.value.category] ?? DEFAULT_INSTRUMENT_CONFIG
	let stableStartTime: number | null = null
	let smoothedCents: number | null = null
	let allTunedResetTimer: ReturnType<typeof setTimeout> | null = null
	let advancing = false
	let minFreq = 0
	let maxFreq = 0
	let hintMinFreq = 0
	let hintMaxFreq = 0
	/** True once the pitch has entered the ±15% acceptance window for the current string.
	 * Disables the wide coarse-hint path so it cannot flicker back mid-tune. */
	let hasEnteredFineWindow = false
	let pitchHistory: number[] = []
	let outOfRangeStart: number | null = null
	let inRangeGraceUntil = 0
	let lastGoodSignalTime = 0
	let lastDisplayTime = 0
	let lastLogTime = 0
	// --- Tick counters for the session report ---
	let tickTotal = 0
	let tickHasSignal = 0
	let tickCoarseHint = 0
	let tickOvertone = 0
	let tickSilence = 0
	let tickContinuityRejected = 0

	// --- Frequency window (updated whenever the locked string changes) ---
	// Accepts only pitches within ±15% of the locked fundamental.
	// ±15% is tight enough to reject adjacent open strings
	// (e.g. B3 at 247Hz is 33% below E4 at 330Hz) while still
	// covering a guitar that is severely out of tune.
	function cacheFreqBounds() {
		const tuning = activeTuning.value.tuning
		const idx = Math.min(lockedStringIndex.value, tuning.length - 1)
		const lockedFreq = tuning[idx].frequency
		// ±15% — tight enough to reject adjacent strings (e.g. B3 when listening for E4)
		minFreq = lockedFreq * 0.85
		maxFreq = lockedFreq * 1.15
		// ±1 octave — wide window for coarse hint when string is heavily out of tune
		hintMinFreq = lockedFreq * 2 ** (-HINT_WINDOW_CENTS / 1200)
		hintMaxFreq = lockedFreq * 2 ** (HINT_WINDOW_CENTS / 1200)
	}
	cacheFreqBounds()

	watch(activeTuning, async (newVal, oldVal) => {
		cfg = INSTRUMENT_CONFIGS[newVal.category] ?? DEFAULT_INSTRUMENT_CONFIG
		if (isCapturing.value) {
			// Category change requires restarting audio to apply a new FFT size
			if (newVal.category !== oldVal?.category) {
				stop()
				await start()
			} else {
				resetState()
			}
		}
		cacheFreqBounds()
	})

	watch(lockedStringIndex, () => {
		cacheFreqBounds()
		updateLpf()
	})

	// --- State helpers ---
	function updateLpf() {
		const tuningArr = activeTuning.value.tuning
		const lockedFreq = tuningArr[Math.min(lockedStringIndex.value, tuningArr.length - 1)].frequency
		setLowPassCutoff(Math.min(2000, Math.max(280, lockedFreq * 3)))
	}

	function resetStringProgress() {
		stableStartTime = null
		stabilityProgress.value = 0
		advancing = false
		smoothedCents = null
		hasEnteredFineWindow = false
		pitchHistory = []
		outOfRangeStart = null
		inRangeGraceUntil = 0
		lastGoodSignalTime = 0
		lastDisplayTime = 0
		frequency.value = null
		cents.value = null
		hint.value = null
		needleCents.value = null
		signalClarity.value = 0
	}

	function resetState() {
		lockedStringIndex.value = 0
		tunedStrings.value = new Set()
		allTuned.value = false
		resetStringProgress()
		if (allTunedResetTimer !== null) {
			clearTimeout(allTunedResetTimer)
			allTunedResetTimer = null
		}
	}

	function advanceToNextUntuned(fromIndex: number) {
		const count = activeTuning.value.tuning.length
		for (let offset = 1; offset <= count; offset++) {
			const next = (fromIndex + offset) % count
			if (!tunedStrings.value.has(next)) {
				lockedStringIndex.value = next
				resetStringProgress()
				return
			}
		}
		// All strings tuned — show banner then stop.
		// Keep advancing=true so no further tick can re-enter the confirmation block.
		allTuned.value = true
		allTunedResetTimer = setTimeout(() => {
			allTunedResetTimer = null
			stop()
		}, ALL_TUNED_RESET_MS)
	}

	/**
	 * Jump to a string and reset its tuning state.
	 * If the string was already marked tuned, un-mark it so it gets re-checked.
	 */
	function selectString(index: number) {
		if (tunedStrings.value.has(index)) {
			const next = new Set(tunedStrings.value)
			next.delete(index)
			tunedStrings.value = next
		}
		lockedStringIndex.value = index
		resetStringProgress()
	}

	// --- Audio processing (called on every Engine tick at ~60fps) ---
	function processTick({ pitch, clarity, rms }: AudioFrame) {
		const now = performance.now()
		const isDisplayFrame = now - lastDisplayTime >= DISPLAY_INTERVAL_MS
		const isLogFrame = now - lastLogTime >= LOG_INTERVAL_MS

		// Dual clarity gate: tighter when RMS is low (decaying string has worse SNR).
		// Both thresholds come from INSTRUMENT_CONFIGS so bass/guitar/ukulele/violin
		// each use appropriate values for their sustain characteristics.
		const clarityGate = rms < LOW_RMS_THRESHOLD ? cfg.decayClarityThreshold : cfg.clarityThreshold
		// Frequency window rejects pitches outside ±15% of the locked fundamental,
		// blocking harmonics of other strings that fall outside this narrow band.
		const hasSignal = clarity > clarityGate && pitch >= minFreq && pitch <= maxFreq

		tickTotal++
		if (isLogFrame) {
			lastLogTime = now
			const lockedFreq = activeTuning.value.tuning[lockedStringIndex.value].frequency
			const stringName = activeTuning.value.tuning[lockedStringIndex.value].note
			slog(
				`t=${(now / 1000).toFixed(2)}s str=${stringName}(${lockedFreq.toFixed(1)}Hz)` +
					` pitch=${pitch.toFixed(1)}Hz clarity=${clarity.toFixed(
						3,
					)} rms=${rms.toFixed(4)} gate=${clarityGate.toFixed(3)}` +
					` window=[${minFreq.toFixed(1)}-${maxFreq.toFixed(1)}]` +
					` hintWindow=[${hintMinFreq.toFixed(1)}-${hintMaxFreq.toFixed(1)}]` +
					` hasSignal=${hasSignal}` +
					` fineEntered=${hasEnteredFineWindow}` +
					` clarityOk=${clarity > clarityGate}` +
					` inFine=${pitch >= minFreq && pitch <= maxFreq}` +
					` inHint=${pitch >= hintMinFreq && pitch <= hintMaxFreq}`,
			)
		}

		if (hasSignal) {
			hasEnteredFineWindow = true
			tickHasSignal++
			lastGoodSignalTime = now

			// --- Median filter ---
			// Rolling buffer of the last PITCH_BUFFER_SIZE raw pitches.
			// Median is more robust than mean against occasional octave-error spikes.
			pitchHistory.push(pitch)
			if (pitchHistory.length > PITCH_BUFFER_SIZE) pitchHistory.shift()
			const medianPitch = median(pitchHistory)

			// --- Octave-fold correction ---
			// If pitchy latches onto an upper harmonic (e.g. 2nd harmonic of Low E),
			// dividing by N=2..6 may bring it within 300c of the target. We prefer
			// that folded value when it improves the match by >400c.
			const lockedFreq = activeTuning.value.tuning[lockedStringIndex.value].frequency
			const stablePitch = foldTowardTarget(medianPitch, lockedFreq)

			// --- Pitch continuity gate ---
			// Reject frames where the smoothed cents would jump by more than
			// PITCH_CONTINUITY_CENTS in a single tick (transient noise or string change).
			const rawCents = centsBetween(stablePitch, lockedFreq)
			if (smoothedCents !== null && Math.abs(rawCents - smoothedCents) > PITCH_CONTINUITY_CENTS) {
				tickContinuityRejected++
				slog(
					`  CONTINUITY_REJECTED jump=${Math.abs(rawCents - smoothedCents).toFixed(
						0,
					)}¢ (limit=${PITCH_CONTINUITY_CENTS}¢)`,
				)
				return
			}

			// --- EMA smoothing ---
			// Exponential moving average over the raw-cents readings.
			// alpha=0.04 at 60fps gives ~500ms settling time — heavy enough
			// to prevent needle jitter without hiding genuine pitch drift.
			smoothedCents =
				smoothedCents === null
					? rawCents
					: smoothedCents + CENTS_EMA_ALPHA * (rawCents - smoothedCents)
			const displayCents = Math.round(smoothedCents)

			// --- Presentation write (~30fps) ---
			// Only update Vue reactive refs on display frames to keep the reactive
			// system from thrashing. Engine state (smoothedCents, stableStartTime)
			// is updated every tick regardless.
			if (isDisplayFrame) {
				lastDisplayTime = now
				frequency.value = Math.round(stablePitch * 10) / 10
				cents.value = displayCents
				needleCents.value = smoothedCents
				signalClarity.value = clarity
			}

			// --- Hint + stability ring ---
			// stableStartTime tracks when the pitch first entered the ACCEPT_CENTS
			// window. cfg.stableMs varies by instrument (600ms violin – 1500ms bass).
			// advanceToNextUntuned() is called exactly once per string via `advancing`.
			if (Math.abs(displayCents) <= ACCEPT_CENTS) {
				outOfRangeStart = null
				if (stableStartTime === null) stableStartTime = now
				const elapsed = now - stableStartTime
				if (isDisplayFrame) {
					hint.value = 'in-range'
					inRangeGraceUntil = now + HINT_GRACE_MS
					stabilityProgress.value = Math.min(1, elapsed / cfg.stableMs)
				}
				if (elapsed >= cfg.stableMs && !advancing) {
					advancing = true
					slog(`STRING_CONFIRMED str=${lockedStringIndex.value} after ${elapsed.toFixed(0)}ms`)
					const completedIdx = lockedStringIndex.value
					const next = new Set(tunedStrings.value)
					next.add(completedIdx)
					tunedStrings.value = next
					advanceToNextUntuned(completedIdx)
				}
			} else {
				if (isDisplayFrame) {
					hint.value =
						now < inRangeGraceUntil ? 'in-range' : displayCents > 0 ? 'too-high' : 'too-low'
				}
				if (Math.abs(displayCents) > STABILITY_RESET_CENTS) {
					if (outOfRangeStart === null) outOfRangeStart = now
					if (now - outOfRangeStart >= STABILITY_RESET_MS) {
						stableStartTime = null
						outOfRangeStart = null
						if (isDisplayFrame) stabilityProgress.value = 0
					}
				} else {
					outOfRangeStart = null
				}
			}
		} else {
			// --- Overtone fold-and-route ---
			// Pitchy sometimes returns a strong harmonic instead of the fundamental,
			// especially on Low E/B at peak attack (rms high, 2× harmonic dominates).
			// Previously we only refreshed the latch; now we attempt to fold the harmonic
			// down to the fundamental and, if it lands in the fine window, route it through
			// the normal hasSignal path so it contributes to stability progress.
			const lockedFreqForOvertone = activeTuning.value.tuning[lockedStringIndex.value].frequency
			if (clarity > cfg.clarityThreshold && isHarmonicOf(pitch, lockedFreqForOvertone)) {
				tickOvertone++
				const foldedPitch = foldTowardTarget(pitch, lockedFreqForOvertone)
				if (foldedPitch >= minFreq && foldedPitch <= maxFreq) {
					// Folded pitch is in the fine window — treat it as a valid hasSignal tick.
					if (isLogFrame)
						slog(
							`  OVERTONE_FOLDED pitch=${pitch.toFixed(
								1,
							)}Hz → ${foldedPitch.toFixed(1)}Hz (in fine window)`,
						)
					hasEnteredFineWindow = true
					lastGoodSignalTime = now
					pitchHistory.push(foldedPitch)
					if (pitchHistory.length > PITCH_BUFFER_SIZE) pitchHistory.shift()
					const medianPitch = median(pitchHistory)
					const rawCents = centsBetween(medianPitch, lockedFreqForOvertone)
					if (smoothedCents !== null && Math.abs(rawCents - smoothedCents) > PITCH_CONTINUITY_CENTS)
						return
					smoothedCents =
						smoothedCents === null
							? rawCents
							: smoothedCents + CENTS_EMA_ALPHA * (rawCents - smoothedCents)
					const displayCents = Math.round(smoothedCents)
					if (isDisplayFrame) {
						lastDisplayTime = now
						frequency.value = Math.round(foldedPitch * 10) / 10
						cents.value = displayCents
						needleCents.value = smoothedCents
						signalClarity.value = clarity
					}
					if (Math.abs(displayCents) <= ACCEPT_CENTS) {
						outOfRangeStart = null
						if (stableStartTime === null) stableStartTime = now
						const elapsed = now - stableStartTime
						if (isDisplayFrame) {
							hint.value = 'in-range'
							inRangeGraceUntil = now + HINT_GRACE_MS
							stabilityProgress.value = Math.min(1, elapsed / cfg.stableMs)
						}
						if (elapsed >= cfg.stableMs && !advancing) {
							advancing = true
							slog(
								`STRING_CONFIRMED str=${
									lockedStringIndex.value
								} after ${elapsed.toFixed(0)}ms (via overtone fold)`,
							)
							const completedIdx = lockedStringIndex.value
							const next = new Set(tunedStrings.value)
							next.add(completedIdx)
							tunedStrings.value = next
							advanceToNextUntuned(completedIdx)
						}
					} else if (isDisplayFrame) {
						hint.value =
							now < inRangeGraceUntil ? 'in-range' : displayCents > 0 ? 'too-high' : 'too-low'
					}
				} else {
					// Folded pitch still outside fine window — just refresh latch as before.
					if (isLogFrame)
						slog(
							`  OVERTONE_LATCH pitch=${pitch.toFixed(
								1,
							)}Hz harmonic of ${lockedFreqForOvertone.toFixed(1)}Hz`,
						)
					lastGoodSignalTime = now
				}
				return
			}

			// --- Coarse hint (heavily out of tune) ---
			// Only active before the pitch has ever entered the ±15% fine-tuning window
			// for this string. Once hasEnteredFineWindow is set, this path is disabled
			// so it cannot flicker back on mid-tune if the pitch briefly dips outside
			// the acceptance window. Resets when the string resets (selectString / advance).
			// Suppress coarse hint if the pitch is a harmonic of an already-tuned string
			// (sympathetic resonance from a recently confirmed string can produce a
			// spurious too-high/too-low flash before the user plucks the next string).
			const isSympathetic = [...tunedStrings.value].some((idx) => {
				const f = activeTuning.value.tuning[idx].frequency
				return isHarmonicOf(pitch, f) || isHarmonicOf(f, pitch)
			})
			if (
				!hasEnteredFineWindow &&
				!isSympathetic &&
				clarity > cfg.clarityThreshold &&
				pitch >= hintMinFreq &&
				pitch <= hintMaxFreq
			) {
				tickCoarseHint++
				lastGoodSignalTime = now
				smoothedCents = null
				pitchHistory = []
				stableStartTime = null
				const rawCents = centsBetween(pitch, lockedFreqForOvertone)
				if (isLogFrame)
					slog(
						`  COARSE_HINT pitch=${pitch.toFixed(1)}Hz cents=${
							rawCents > 0 ? '+' : ''
						}${rawCents}¢ hint=${rawCents > 0 ? 'too-high' : 'too-low'}`,
					)
				if (isDisplayFrame) {
					lastDisplayTime = now
					frequency.value = Math.round(pitch * 10) / 10
					cents.value = rawCents
					needleCents.value = rawCents
					hint.value = rawCents > 0 ? 'too-high' : 'too-low'
					signalClarity.value = clarity
					stabilityProgress.value = 0
				}
				return
			}

			// --- Latch-and-Fade ---
			// Keep the display alive for SIGNAL_HOLD_MS after the last valid frame.
			// This bridges the natural decay gap when a string fades to silence,
			// preventing the needle from snapping to blank between plucks.
			// needleCents is intentionally NOT cleared — needle holds its last position.
			pitchHistory = []
			const held = now - lastGoodSignalTime < SIGNAL_HOLD_MS
			if (!held) {
				tickSilence++
				stableStartTime = null
				outOfRangeStart = null
				inRangeGraceUntil = 0
				if (isDisplayFrame) {
					lastDisplayTime = now
					frequency.value = null
					cents.value = null
					hint.value = null
					stabilityProgress.value = 0
					signalClarity.value = 0
					// needleCents intentionally NOT cleared — needle holds last position
				}
			} else if (isDisplayFrame && now < inRangeGraceUntil) {
				hint.value = 'in-range'
			}
		}
	}

	async function start() {
		sessionLog = []
		tickTotal = 0
		tickHasSignal = 0
		tickCoarseHint = 0
		tickOvertone = 0
		tickSilence = 0
		tickContinuityRejected = 0
		slog(
			`=== TUNER SESSION START === instrument=${activeTuning.value.category} tuning=${activeTuning.value.name}`,
		)
		slog(
			`cfg: fftSize=${cfg.primaryFftSize} stableMs=${cfg.stableMs} clarityThreshold=${cfg.clarityThreshold} decayThreshold=${cfg.decayClarityThreshold}`,
		)
		resetState()
		await startCapture(processTick, { primaryFftSize: cfg.primaryFftSize })
		// LPF watcher fires before the audio graph exists; set it now for string 0.
		updateLpf()
	}

	function stop() {
		stopCapture()
		slog(`=== TUNER SESSION STOP ===`)
		slog(
			`ticks: total=${tickTotal} hasSignal=${tickHasSignal} coarseHint=${tickCoarseHint} overtone=${tickOvertone} silence=${tickSilence} continuityRejected=${tickContinuityRejected}`,
		)
		slog(`tunedStrings=${[...tunedStrings.value].join(',') || 'none'} allTuned=${allTuned.value}`)
		console.log(
			'\n===== TUNER SESSION LOG (paste to Copilot) =====\n' +
				sessionLog.join('\n') +
				'\n================================================\n',
		)
		resetState()
	}

	return {
		isListening: isCapturing,
		frequency: readonly(frequency),
		lockedStringIndex: readonly(lockedStringIndex),
		cents: readonly(cents),
		needleCents: readonly(needleCents),
		hint: readonly(hint),
		stabilityProgress: readonly(stabilityProgress),
		tunedStrings: readonly(tunedStrings),
		allTuned: readonly(allTuned),
		error: captureError,
		signalClarity: readonly(signalClarity),
		start,
		stop,
		selectString,
	}
}
