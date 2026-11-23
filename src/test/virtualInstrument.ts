/**
 * A virtual instrument and a fake Web Audio API, for testing the real audio chain
 * (useAudioCapture → pitchy → useTuner) without a microphone or an instrument.
 *
 * The instrument is a sum of decaying harmonics per pluck, plus a little noise below the
 * capture's RMS gate. The fake low-pass filter shapes each harmonic with the magnitude of a
 * 2nd-order Butterworth at the cutoff useTuner sets, as the real BiquadFilterNode would.
 * Time is the fake performance.now() of Vitest's timers.
 */
import { vi } from 'vitest'

export interface PluckOptions {
	/** Harmonic amplitudes, fundamental first. Default: a plucked string, 1/k for k = 1..6 */
	harmonics?: number[]
	/** Seconds for the sound to fall to 1/e. Default 1.2 s (a plucked steel string) */
	decay?: number
	/** Peak amplitude, 0–1. Default 0.3 */
	amplitude?: number
	/** Seconds until the note is stopped (a bow lifted, a string muted). Default: rings out */
	duration?: number
}

interface Sound {
	start: number
	freq: number
	gains: number[]
	phases: number[]
	decay: number
	amplitude: number
	end: number
}

/** Seconds a stopped note takes to fall to 1/e */
const RELEASE = 0.03

/** Small deterministic PRNG (mulberry32), so every run hears the same noise and phases. */
function prng(seed: number) {
	let a = seed >>> 0
	return () => {
		a = (a + 0x6d2b79f5) >>> 0
		let t = a
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

export const PLUCKED = [1, 1 / 2, 1 / 3, 1 / 4, 1 / 5, 1 / 6]

export class VirtualInstrument {
	readonly sampleRate = 48000
	/** Set by the fake BiquadFilterNode: useTuner moves it with the string being tuned */
	lowPassHz = 300
	private sounds: Sound[] = []
	private random = prng(42)

	pluck(freq: number, options: PluckOptions = {}) {
		const harmonics = options.harmonics ?? PLUCKED
		const start = performance.now() / 1000
		this.sounds.push({
			start,
			freq,
			gains: harmonics,
			phases: harmonics.map(() => this.random() * 2 * Math.PI),
			decay: options.decay ?? 1.2,
			amplitude: options.amplitude ?? 0.3,
			end: start + (options.duration ?? Infinity),
		})
	}

	/** Envelope of `s` at time `t` (seconds): decay while it rings, a quick release once stopped. */
	private envelope(s: Sound, t: number) {
		if (t < s.start) return 0
		const ringing = s.amplitude * Math.exp(-(Math.min(t, s.end) - s.start) / s.decay)
		return t <= s.end ? ringing : ringing * Math.exp(-(t - s.end) / RELEASE)
	}

	/** Fill `buffer` with the samples that end now, as AnalyserNode.getFloatTimeDomainData does. */
	fill(buffer: Float32Array) {
		const sr = this.sampleRate
		const now = performance.now() / 1000
		const n = buffer.length
		const first = now - (n - 1) / sr
		this.sounds = this.sounds.filter((s) => this.envelope(s, now) > 1e-4 || now < s.start)

		for (let i = 0; i < n; i++) buffer[i] = (this.random() - 0.5) * 0.004

		for (const s of this.sounds) {
			const from = Math.max(0, Math.ceil((s.start - first) * sr))
			if (from >= n) continue
			const t0 = first + from / sr
			// The envelope changes slowly: compute it every 64 samples and hold it in between
			const env = new Float32Array(Math.ceil((n - from) / 64) + 1)
			for (let j = 0; j < env.length; j++) env[j] = this.envelope(s, t0 + (j * 64) / sr)

			for (let k = 0; k < s.gains.length; k++) {
				const f = s.freq * (k + 1)
				// Magnitude of a 2nd-order Butterworth low-pass at the filter's cutoff
				const gain = s.gains[k] / Math.sqrt(1 + (f / this.lowPassHz) ** 4)
				if (gain < 1e-4) continue
				// Rotate a phasor instead of calling Math.sin for every sample
				const w = (2 * Math.PI * f) / sr
				const cw = Math.cos(w)
				const sw = Math.sin(w)
				const phase = 2 * Math.PI * f * (t0 - s.start) + s.phases[k]
				let re = Math.cos(phase)
				let im = Math.sin(phase)
				for (let i = from; i < n; i++) {
					buffer[i] += env[(i - from) >> 6] * gain * im
					const r = re * cw - im * sw
					im = re * sw + im * cw
					re = r
				}
			}
		}
	}
}

/**
 * Replace the browser APIs useAudioCapture uses with ones that listen to `instrument`.
 * Call after vi.useFakeTimers(); undo with vi.unstubAllGlobals().
 */
export function installFakeAudio(instrument: VirtualInstrument) {
	class FakeNode {
		connect() {}
	}
	class FakeBiquadFilter extends FakeNode {
		type = 'lowpass'
		Q = { value: 1 }
		frequency = {
			get value() {
				return instrument.lowPassHz
			},
			set value(hz: number) {
				instrument.lowPassHz = hz
			},
		}
	}
	class FakeAnalyser extends FakeNode {
		fftSize = 2048
		getFloatTimeDomainData(buffer: Float32Array) {
			instrument.fill(buffer)
		}
	}
	class FakeAudioContext {
		sampleRate = instrument.sampleRate
		createBiquadFilter() {
			return new FakeBiquadFilter()
		}
		createAnalyser() {
			return new FakeAnalyser()
		}
		createMediaStreamSource() {
			return new FakeNode()
		}
		close() {
			return Promise.resolve()
		}
	}
	vi.stubGlobal('AudioContext', FakeAudioContext)
	vi.stubGlobal('navigator', {
		mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) },
	})
	vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
		setTimeout(() => cb(performance.now()), 16),
	)
	vi.stubGlobal('cancelAnimationFrame', (id: ReturnType<typeof setTimeout>) => clearTimeout(id))
}
