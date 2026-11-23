/**
 * The tuning engine — a sequential string tuner, with no Vue and no audio APIs.
 *
 * Flow:
 *  1. Start on string 0. Stay focused on it until confirmed in tune.
 *  2. Once in tune, auto-advance to the next untuned string.
 *  3. The user can pick any string to jump to it (resets its progress).
 *  4. When all strings are confirmed tuned, report it (onAllTuned).
 *
 * No auto-string detection: the engine only ever listens for the locked string.
 * It is fed one AudioFrame per tick (~60 fps) with the time of the tick, and keeps the values
 * the UI shows in `display`, written at most every DISPLAY_INTERVAL_MS (~30 fps).
 */
import type { AudioFrame } from '../composables/useAudioCapture'
import type { TuningPreset } from '../data/tunings'
import { instrumentConfig, type InstrumentConfig } from './instruments'
import { centsBetween, foldTowardTarget, isHarmonicOf, median } from './pitch'
import type { SessionLog } from './sessionLog'

/** Cents window considered "in tune" (±8¢ is comfortable for guitar) */
const ACCEPT_CENTS = 8
/** Cents above ACCEPT_CENTS before we consider resetting stability (hysteresis) */
const STABILITY_RESET_CENTS = 20
/** How long (ms) pitch must remain outside before stability progress resets */
const STABILITY_RESET_MS = 150
/** Minimum ms between writes of the display values (~30fps) */
const DISPLAY_INTERVAL_MS = 33
/** EMA smoothing factor — 0.04 at 60fps ≈ 500ms settling time */
const CENTS_EMA_ALPHA = 0.04
/** RMS below which the SNR is too poor — apply tighter (decay) clarity gate */
const LOW_RMS_THRESHOLD = 0.04
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
/** Logging interval (ms) — throttles log lines to ~2/s */
const LOG_INTERVAL_MS = 500

export type TunerHint = 'too-high' | 'too-low' | 'in-range' | null

/** What the UI shows */
export interface TunerDisplay {
	frequency: number | null
	cents: number | null
	hint: TunerHint
	/** 0–1: progress toward confirming current string as in tune */
	stabilityProgress: number
	/** Float cents for needle — holds last position on signal loss */
	needleCents: number | null
	/** pitchy clarity (0–1) — drives needle opacity in the UI */
	signalClarity: number
}

/** Ticks by outcome, for the session report */
export interface TickCounters {
	total: number
	hasSignal: number
	coarseHint: number
	overtone: number
	silence: number
	continuityRejected: number
}

export interface TunerEngine {
	readonly display: Readonly<TunerDisplay>
	/** 0-based index into the tuning — the string currently being tuned */
	readonly lockedStringIndex: number
	/** Indices of strings confirmed tuned (a new Set on every change) */
	readonly tunedStrings: ReadonlySet<number>
	readonly allTuned: boolean
	readonly config: InstrumentConfig
	readonly counters: Readonly<TickCounters>
	/** Analyse one frame heard at `now` (ms, performance.now()) */
	process(frame: AudioFrame, now: number): void
	/** Jump to a string; if it was confirmed, un-mark it so it gets checked again */
	selectString(index: number): void
	/** Use another tuning: its instrument's settings and frequency windows (state is kept) */
	setTuning(tuning: TuningPreset): void
	/** Back to the first string, nothing tuned */
	reset(): void
	resetCounters(): void
}

/** How a pitch that made it through the gates is taken in (see `acceptPitch`) */
interface AcceptOptions {
	/** Show this frame's pitch as the frequency instead of the median one */
	showFramePitch: boolean
	/** Count and log the frames the continuity gate drops */
	reportRejects: boolean
	/** Restart the stability timer when the pitch stays STABILITY_RESET_CENTS off */
	resetStabilityWhenOff: boolean
	/** Appended to the confirmation log line */
	via: string
}

/** A frame inside the ±15% window of the locked string */
const DIRECT: AcceptOptions = {
	showFramePitch: false,
	reportRejects: true,
	resetStabilityWhenOff: true,
	via: '',
}

/**
 * A harmonic folded down into the window. It differs from DIRECT in three ways, kept as the
 * engine always had them: the frequency shown is the folded frame's, a rejected jump is
 * dropped silently, and staying off by more than STABILITY_RESET_CENTS does not restart the
 * stability timer.
 */
const FOLDED_OVERTONE: AcceptOptions = {
	showFramePitch: true,
	reportRejects: false,
	resetStabilityWhenOff: false,
	via: ' (via overtone fold)',
}

export function createTunerEngine(
	initialTuning: TuningPreset,
	{ log, onAllTuned }: { log: SessionLog; onAllTuned: () => void },
): TunerEngine {
	let tuning = initialTuning
	let cfg = instrumentConfig(tuning.category)

	const display: TunerDisplay = {
		frequency: null,
		cents: null,
		hint: null,
		stabilityProgress: 0,
		needleCents: null,
		signalClarity: 0,
	}
	let lockedStringIndex = 0
	let tunedStrings = new Set<number>()
	let allTuned = false
	const counters: TickCounters = {
		total: 0,
		hasSignal: 0,
		coarseHint: 0,
		overtone: 0,
		silence: 0,
		continuityRejected: 0,
	}

	// --- Per-string state (written every tick at ~60fps) ---
	let stableStartTime: number | null = null
	let smoothedCents: number | null = null
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

	// --- Frequency window (updated whenever the locked string or the tuning changes) ---
	// Accepts only pitches within ±15% of the locked fundamental.
	// ±15% is tight enough to reject adjacent open strings
	// (e.g. B3 at 247Hz is 33% below E4 at 330Hz) while still
	// covering a guitar that is severely out of tune.
	function cacheFreqBounds() {
		const idx = Math.min(lockedStringIndex, tuning.tuning.length - 1)
		const lockedFreq = tuning.tuning[idx].frequency
		minFreq = lockedFreq * 0.85
		maxFreq = lockedFreq * 1.15
		// ±1 octave — wide window for coarse hint when string is heavily out of tune
		hintMinFreq = lockedFreq * 2 ** (-HINT_WINDOW_CENTS / 1200)
		hintMaxFreq = lockedFreq * 2 ** (HINT_WINDOW_CENTS / 1200)
	}
	cacheFreqBounds()

	function lockString(index: number) {
		lockedStringIndex = index
		cacheFreqBounds()
	}

	function resetStringProgress() {
		stableStartTime = null
		display.stabilityProgress = 0
		advancing = false
		smoothedCents = null
		hasEnteredFineWindow = false
		pitchHistory = []
		outOfRangeStart = null
		inRangeGraceUntil = 0
		lastGoodSignalTime = 0
		lastDisplayTime = 0
		display.frequency = null
		display.cents = null
		display.hint = null
		display.needleCents = null
		display.signalClarity = 0
	}

	function reset() {
		lockString(0)
		tunedStrings = new Set()
		allTuned = false
		resetStringProgress()
	}

	function advanceToNextUntuned(fromIndex: number) {
		const count = tuning.tuning.length
		for (let offset = 1; offset <= count; offset++) {
			const next = (fromIndex + offset) % count
			if (!tunedStrings.has(next)) {
				lockString(next)
				resetStringProgress()
				return
			}
		}
		// All strings tuned. Keep advancing=true so no further tick can re-enter the
		// confirmation block.
		allTuned = true
		onAllTuned()
	}

	function selectString(index: number) {
		if (tunedStrings.has(index)) {
			const next = new Set(tunedStrings)
			next.delete(index)
			tunedStrings = next
		}
		lockString(index)
		resetStringProgress()
	}

	/** The hint while off the in-tune window: still 'in-range' during the grace period */
	function offHint(now: number, displayCents: number): TunerHint {
		return now < inRangeGraceUntil ? 'in-range' : displayCents > 0 ? 'too-high' : 'too-low'
	}

	/**
	 * Take in a pitch inside the fine window: median filter, continuity gate, EMA, display,
	 * hint and stability ring, and confirmation of the string once it has been in tune for
	 * cfg.stableMs.
	 */
	function acceptPitch(
		pitch: number,
		clarity: number,
		now: number,
		isDisplayFrame: boolean,
		options: AcceptOptions,
	) {
		hasEnteredFineWindow = true
		lastGoodSignalTime = now

		// --- Median filter ---
		// Rolling buffer of the last PITCH_BUFFER_SIZE pitches.
		// Median is more robust than mean against occasional octave-error spikes.
		pitchHistory.push(pitch)
		if (pitchHistory.length > PITCH_BUFFER_SIZE) pitchHistory.shift()
		const medianPitch = median(pitchHistory)

		// --- Octave-fold correction ---
		// If pitchy latches onto an upper harmonic (e.g. 2nd harmonic of Low E),
		// dividing by N=2..6 may bring it within 300c of the target. We prefer
		// that folded value when it improves the match by >400c.
		const lockedFreq = tuning.tuning[lockedStringIndex].frequency
		const stablePitch = foldTowardTarget(medianPitch, lockedFreq)

		// --- Pitch continuity gate ---
		// Reject frames where the smoothed cents would jump by more than
		// PITCH_CONTINUITY_CENTS in a single tick (transient noise or string change).
		const rawCents = centsBetween(stablePitch, lockedFreq)
		if (smoothedCents !== null && Math.abs(rawCents - smoothedCents) > PITCH_CONTINUITY_CENTS) {
			if (options.reportRejects) {
				counters.continuityRejected++
				log.add(
					`  CONTINUITY_REJECTED jump=${Math.abs(rawCents - smoothedCents).toFixed(
						0,
					)}¢ (limit=${PITCH_CONTINUITY_CENTS}¢)`,
				)
			}
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

		// --- Display write (~30fps) ---
		// Engine state (smoothedCents, stableStartTime) is updated every tick regardless.
		if (isDisplayFrame) {
			lastDisplayTime = now
			display.frequency = Math.round((options.showFramePitch ? pitch : stablePitch) * 10) / 10
			display.cents = displayCents
			display.needleCents = smoothedCents
			display.signalClarity = clarity
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
				display.hint = 'in-range'
				inRangeGraceUntil = now + HINT_GRACE_MS
				display.stabilityProgress = Math.min(1, elapsed / cfg.stableMs)
			}
			if (elapsed >= cfg.stableMs && !advancing) {
				advancing = true
				log.add(
					`STRING_CONFIRMED str=${lockedStringIndex} after ${elapsed.toFixed(0)}ms${options.via}`,
				)
				const completedIdx = lockedStringIndex
				const next = new Set(tunedStrings)
				next.add(completedIdx)
				tunedStrings = next
				advanceToNextUntuned(completedIdx)
			}
		} else {
			if (isDisplayFrame) display.hint = offHint(now, displayCents)
			if (!options.resetStabilityWhenOff) return
			if (Math.abs(displayCents) > STABILITY_RESET_CENTS) {
				if (outOfRangeStart === null) outOfRangeStart = now
				if (now - outOfRangeStart >= STABILITY_RESET_MS) {
					stableStartTime = null
					outOfRangeStart = null
					if (isDisplayFrame) display.stabilityProgress = 0
				}
			} else {
				outOfRangeStart = null
			}
		}
	}

	function process({ pitch, clarity, rms }: AudioFrame, now: number) {
		const isDisplayFrame = now - lastDisplayTime >= DISPLAY_INTERVAL_MS
		const isLogFrame = now - lastLogTime >= LOG_INTERVAL_MS
		const lockedFreq = tuning.tuning[lockedStringIndex].frequency

		// Dual clarity gate: tighter when RMS is low (decaying string has worse SNR).
		// Both thresholds come from the instrument's settings so bass/guitar/ukulele/violin
		// each use appropriate values for their sustain characteristics.
		const clarityGate = rms < LOW_RMS_THRESHOLD ? cfg.decayClarityThreshold : cfg.clarityThreshold
		// Frequency window rejects pitches outside ±15% of the locked fundamental,
		// blocking harmonics of other strings that fall outside this narrow band.
		const hasSignal = clarity > clarityGate && pitch >= minFreq && pitch <= maxFreq

		counters.total++
		if (isLogFrame) {
			lastLogTime = now
			const stringName = tuning.tuning[lockedStringIndex].note
			log.add(
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
			counters.hasSignal++
			acceptPitch(pitch, clarity, now, isDisplayFrame, DIRECT)
			return
		}

		// --- Overtone fold-and-route ---
		// Pitchy sometimes returns a strong harmonic instead of the fundamental,
		// especially on Low E/B at peak attack (rms high, 2× harmonic dominates).
		// Fold the harmonic down to the fundamental and, if it lands in the fine window,
		// take it in like a direct reading so it contributes to stability progress.
		if (clarity > cfg.clarityThreshold && isHarmonicOf(pitch, lockedFreq)) {
			counters.overtone++
			const foldedPitch = foldTowardTarget(pitch, lockedFreq)
			if (foldedPitch >= minFreq && foldedPitch <= maxFreq) {
				if (isLogFrame)
					log.add(
						`  OVERTONE_FOLDED pitch=${pitch.toFixed(
							1,
						)}Hz → ${foldedPitch.toFixed(1)}Hz (in fine window)`,
					)
				acceptPitch(foldedPitch, clarity, now, isDisplayFrame, FOLDED_OVERTONE)
			} else {
				// Folded pitch still outside fine window — just refresh the latch.
				if (isLogFrame)
					log.add(
						`  OVERTONE_LATCH pitch=${pitch.toFixed(1)}Hz harmonic of ${lockedFreq.toFixed(1)}Hz`,
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
		const isSympathetic = [...tunedStrings].some((idx) => {
			const f = tuning.tuning[idx].frequency
			return isHarmonicOf(pitch, f) || isHarmonicOf(f, pitch)
		})
		if (
			!hasEnteredFineWindow &&
			!isSympathetic &&
			clarity > cfg.clarityThreshold &&
			pitch >= hintMinFreq &&
			pitch <= hintMaxFreq
		) {
			counters.coarseHint++
			lastGoodSignalTime = now
			smoothedCents = null
			pitchHistory = []
			stableStartTime = null
			const rawCents = centsBetween(pitch, lockedFreq)
			if (isLogFrame)
				log.add(
					`  COARSE_HINT pitch=${pitch.toFixed(1)}Hz cents=${
						rawCents > 0 ? '+' : ''
					}${rawCents}¢ hint=${rawCents > 0 ? 'too-high' : 'too-low'}`,
				)
			if (isDisplayFrame) {
				lastDisplayTime = now
				display.frequency = Math.round(pitch * 10) / 10
				display.cents = rawCents
				display.needleCents = rawCents
				display.hint = rawCents > 0 ? 'too-high' : 'too-low'
				display.signalClarity = clarity
				display.stabilityProgress = 0
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
			counters.silence++
			stableStartTime = null
			outOfRangeStart = null
			inRangeGraceUntil = 0
			if (isDisplayFrame) {
				lastDisplayTime = now
				display.frequency = null
				display.cents = null
				display.hint = null
				display.stabilityProgress = 0
				display.signalClarity = 0
			}
		} else if (isDisplayFrame && now < inRangeGraceUntil) {
			display.hint = 'in-range'
		}
	}

	return {
		display,
		get lockedStringIndex() {
			return lockedStringIndex
		},
		get tunedStrings() {
			return tunedStrings
		},
		get allTuned() {
			return allTuned
		},
		get config() {
			return cfg
		},
		counters,
		process,
		selectString,
		setTuning(next) {
			tuning = next
			cfg = instrumentConfig(next.category)
			cacheFreqBounds()
		},
		reset,
		resetCounters() {
			for (const key of Object.keys(counters) as (keyof TickCounters)[]) counters[key] = 0
		},
	}
}
