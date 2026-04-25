/**
 * useAudioCapture — owns the Web Audio API lifecycle.
 *
 * Responsibilities:
 *   - Request microphone permission via getUserMedia
 *   - Create/destroy AudioContext, BiquadFilterNode, AnalyserNode(s), MediaStreamSource
 *   - Run the requestAnimationFrame tick loop at ~60fps
 *   - Compute RMS, gate noise and attack transients, run pitchy, deliver AudioFrames
 *
 * Knows nothing about tunings, cents, strings, or UI state.
 * The FFT window size and LPF cutoff are controlled externally so callers
 * can tune those parameters per-instrument without coupling to this module.
 */
import { PitchDetector } from 'pitchy'
import { readonly, ref } from 'vue'

/**
 * Default primary FFT window size when none is specified by the caller.
 * 2048 samples at 44100Hz ≈ 46ms window — sufficient for guitar/ukulele/violin.
 * Bass mode passes 8192 via startCapture options to get ~185ms (≈15 cycles of Low E).
 */
const FFT_SIZE = 2048
/**
 * Minimum ms between engine ticks — sets the Engine Layer frame rate.
 * 16ms ≈ 60fps; fast enough to catch the onset of a pluck and react quickly
 * to string changes. The Presentation Layer in useTuner throttles Vue writes
 * independently to ~30fps so the UI stays fluid without Vue batching pressure.
 */
const TICK_INTERVAL_MS = 16
/**
 * Default low-pass filter cutoff (Hz) — applied at session start.
 * Attenuates harmonics before the signal reaches pitchy so it more reliably
 * detects the fundamental. Kept at 300Hz as a conservative default; updated
 * in real time via setLowPassCutoff() each time the locked string changes
 * (cutoff = 3 × fundamental, clamped 280–2000Hz).
 */
const LPF_CUTOFF_HZ = 300
/**
 * Secondary FFT window size used as a clarity fallback for guitar/ukulele/violin.
 * 8192 samples at 44100Hz ≈ 185ms window — gives pitchy ~15 cycles of Low E (82Hz)
 * versus ~4 cycles for the standard 2048-sample window, dramatically improving
 * fundamental-vs-harmonic discrimination on the thickest strings.
 * Not created at all when the primary window is already this size (bass mode).
 */
const FFT_SIZE_LARGE = 8192
/** Clarity threshold below which the engine tries the large-window detector */
const LARGE_DETECTOR_CLARITY_THRESHOLD = 0.92
/**
 * RMS noise gate threshold (0–1 normalised amplitude).
 * Frames quieter than this are silence/noise and skipped entirely.
 * Typical guitar pluck RMS is 0.02–0.2; room noise < 0.008.
 */
const RMS_GATE = 0.01
/**
 * If RMS jumps by this factor in one tick, it's a pick/pluck attack transient.
 * We suppress pitch readings for TRANSIENT_GATE_MS after detecting such a spike.
 */
const RMS_ONSET_RATIO = 3.0
const TRANSIENT_GATE_MS = 80

export interface AudioFrame {
	pitch: number
	clarity: number
	rms: number
}

export function useAudioCapture() {
	const isCapturing = ref(false)
	const captureError = ref<string | null>(null)

	let audioCtx: AudioContext | null = null
	let analyser: AnalyserNode | null = null
	let lpf: BiquadFilterNode | null = null
	let stream: MediaStream | null = null
	let animationId: number | null = null
	let detector: PitchDetector<Float32Array<ArrayBuffer>> | null = null
	let inputBuffer: Float32Array<ArrayBuffer> | null = null
	let onTick: ((frame: AudioFrame) => void) | null = null
	let lastTickTime = 0
	/** RMS from the previous tick — used for onset (attack) detection */
	let prevRms = 0
	/** Timestamp (ms) when the last onset was detected — gate reads until expired */
	let transientGateUntil = 0
	/** Secondary large-window analyser/detector for bass-string clarity fallback */
	let analyserLarge: AnalyserNode | null = null
	let detectorLarge: PitchDetector<Float32Array<ArrayBuffer>> | null = null
	let inputBufferLarge: Float32Array<ArrayBuffer> | null = null

	function tick(timestamp: number) {
		if (!analyser || !detector || !inputBuffer || !audioCtx) return
		animationId = requestAnimationFrame(tick)
		if (timestamp - lastTickTime < TICK_INTERVAL_MS) return
		lastTickTime = timestamp
		analyser.getFloatTimeDomainData(inputBuffer)

		// ── RMS noise gate ──────────────────────────────────────────────────────
		// Compute root-mean-square amplitude. Skip pitch detection entirely when
		// the frame is too quiet — this filters out room noise and the silent
		// gaps between plucks without waiting for pitchy to return low clarity.
		let sumSq = 0
		for (let i = 0; i < inputBuffer.length; i++) sumSq += inputBuffer[i] * inputBuffer[i]
		const rms = Math.sqrt(sumSq / inputBuffer.length)
		if (rms < RMS_GATE) {
			prevRms = 0 // reset onset baseline during silence
			return
		}

		// ── Attack transient gate ───────────────────────────────────────────────
		// A sudden RMS spike (pick/pluck attack) floods the buffer with wide-band
		// noise. Detect it as a >3× jump in RMS from the previous frame, then
		// suppress pitch readings for TRANSIENT_GATE_MS to let the string settle.
		const now = performance.now()
		if (prevRms > 0 && rms / prevRms > RMS_ONSET_RATIO) {
			transientGateUntil = now + TRANSIENT_GATE_MS
		}
		prevRms = rms
		if (now < transientGateUntil) return // inside attack window — skip pitchy

		let [pitch, clarity] = detector.findPitch(inputBuffer, audioCtx.sampleRate)
		// ── Dual-detector: large-window fallback for bass strings ───────────────
		// The standard 2048-sample window covers ~46ms, giving pitchy only ~4
		// cycles of Low E (82Hz). The 8192-sample fallback covers ~185ms (~15
		// cycles), dramatically improving fundamental-vs-harmonic discrimination.
		// Only runs when primary clarity is low, so there's no CPU cost in the
		// normal (clearly-detected) case.
		if (
			clarity < LARGE_DETECTOR_CLARITY_THRESHOLD &&
			analyserLarge &&
			detectorLarge &&
			inputBufferLarge
		) {
			analyserLarge.getFloatTimeDomainData(inputBufferLarge)
			const [pitchL, clarityL] = detectorLarge.findPitch(inputBufferLarge, audioCtx.sampleRate)
			if (clarityL > clarity) {
				pitch = pitchL
				clarity = clarityL
			}
		}
		onTick?.({ pitch, clarity, rms })
	}

	async function startCapture(
		tickCallback: (frame: AudioFrame) => void,
		options?: { primaryFftSize?: number },
	): Promise<void> {
		captureError.value = null
		onTick = tickCallback
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
				video: false,
			})
			audioCtx = new AudioContext()

			// ── Low-pass filter ───────────────────────────────────────────────────
			// Inserted between the mic source and the analyser. Cuts harmonics above
			// LPF_CUTOFF_HZ so pitchy only sees the fundamental frequency range of
			// the instrument. Critical for low-E (82Hz) where mobile mics roll off
			// the fundamental and pitchy would otherwise latch onto the 2nd harmonic.
			lpf = audioCtx.createBiquadFilter()
			lpf.type = 'lowpass'
			lpf.frequency.value = LPF_CUTOFF_HZ
			lpf.Q.value = 0.7 // Butterworth-ish — flat passband, no resonance peak

			const primaryFftSize = options?.primaryFftSize ?? FFT_SIZE
			analyser = audioCtx.createAnalyser()
			analyser.fftSize = primaryFftSize
			detector = PitchDetector.forFloat32Array(analyser.fftSize)
			inputBuffer = new Float32Array(detector.inputLength) as Float32Array<ArrayBuffer>
			const source = audioCtx.createMediaStreamSource(stream)
			source.connect(lpf)
			lpf.connect(analyser)
			// ── Large-window analyser (bass-string fallback) ──────────────────────
			// Skip when primary is already 8192+ (bass mode); the 4× larger window
			// is only needed when the primary window is too short for the fundamental.
			if (primaryFftSize < FFT_SIZE_LARGE) {
				analyserLarge = audioCtx.createAnalyser()
				analyserLarge.fftSize = FFT_SIZE_LARGE
				detectorLarge = PitchDetector.forFloat32Array(analyserLarge.fftSize)
				inputBufferLarge = new Float32Array(detectorLarge.inputLength) as Float32Array<ArrayBuffer>
				lpf.connect(analyserLarge)
			}
			isCapturing.value = true
			lastTickTime = 0
			prevRms = 0
			transientGateUntil = 0
			animationId = requestAnimationFrame(tick)
		} catch (e) {
			captureError.value = e instanceof Error ? e.message : 'Microphone access denied'
		}
	}

	function stopCapture() {
		if (animationId !== null) {
			cancelAnimationFrame(animationId)
			animationId = null
		}
		stream?.getTracks().forEach((t) => t.stop())
		audioCtx?.close()
		audioCtx = null
		analyser = null
		analyserLarge = null
		lpf = null
		stream = null
		detector = null
		detectorLarge = null
		inputBuffer = null
		inputBufferLarge = null
		onTick = null
		isCapturing.value = false
	}

	/** Update the low-pass filter cutoff in real time — call when the locked string changes. */
	function setLowPassCutoff(hz: number) {
		if (lpf) lpf.frequency.value = hz
	}

	return {
		isCapturing: readonly(isCapturing),
		captureError: readonly(captureError),
		startCapture,
		stopCapture,
		setLowPassCutoff,
	}
}
