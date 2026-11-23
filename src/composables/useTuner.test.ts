/**
 * The tuning engine, fed frame by frame. useAudioCapture is replaced by a stand-in that hands
 * useTuner's tick callback to the test, so each frame (pitch, clarity, rms) is chosen here and
 * time only moves when the test moves it (fake timers, performance.now included).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { PRESET_TUNINGS, type TuningPreset } from '../data/tunings'
import type { AudioFrame } from './useAudioCapture'
import { useTuner } from './useTuner'

const capture = vi.hoisted(() => ({
	onTick: null as ((frame: AudioFrame) => void) | null,
	options: undefined as { primaryFftSize?: number } | undefined,
	cutoffs: [] as number[],
	starts: 0,
	stops: 0,
}))

vi.mock('./useAudioCapture', async () => {
	const { readonly, ref } = await import('vue')
	return {
		useAudioCapture() {
			const isCapturing = ref(false)
			return {
				isCapturing: readonly(isCapturing),
				captureError: readonly(ref<string | null>(null)),
				async startCapture(
					onTick: (frame: AudioFrame) => void,
					options?: { primaryFftSize?: number },
				) {
					capture.onTick = onTick
					capture.options = options
					capture.starts++
					isCapturing.value = true
				},
				stopCapture() {
					capture.onTick = null
					capture.stops++
					isCapturing.value = false
				},
				setLowPassCutoff(hz: number) {
					capture.cutoffs.push(hz)
				},
			}
		},
	}
})

const TICK_MS = 16
const preset = (id: string) => PRESET_TUNINGS.find((t) => t.id === id) as TuningPreset
const GUITAR = preset('std6')
const BASS = PRESET_TUNINGS.find((t) => t.category === 'bass') as TuningPreset

/** A clean, loud frame at `hz` shifted by `cents`. */
const note = (hz: number, cents = 0, clarity = 0.98, rms = 0.1): AudioFrame => ({
	pitch: hz * 2 ** (cents / 1200),
	clarity,
	rms,
})

/** Feed the same frame every 16 ms for `ms`, letting Vue's watchers run between ticks. */
async function feed(frame: AudioFrame, ms: number) {
	for (let t = 0; t < ms; t += TICK_MS) {
		await vi.advanceTimersByTimeAsync(TICK_MS)
		capture.onTick?.(frame)
		await nextTick()
	}
}

async function setup(tuning: TuningPreset = GUITAR) {
	const active = ref(tuning)
	const tuner = useTuner(active)
	await tuner.start()
	return { active, tuner }
}

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] })
	vi.spyOn(console, 'log').mockImplementation(() => {})
	Object.assign(capture, { onTick: null, options: undefined, cutoffs: [], starts: 0, stops: 0 })
})

afterEach(() => {
	vi.useRealTimers()
	vi.restoreAllMocks()
})

describe('start', () => {
	it('asks for a 2048-sample window for guitar and 8192 for bass', async () => {
		await setup(GUITAR)
		expect(capture.options?.primaryFftSize).toBe(2048)
		await setup(BASS)
		expect(capture.options?.primaryFftSize).toBe(8192)
	})

	it('starts on the first (lowest) string, nothing tuned yet', async () => {
		const { tuner } = await setup()
		expect(tuner.isListening.value).toBe(true)
		expect(tuner.lockedStringIndex.value).toBe(0)
		expect(tuner.tunedStrings.value.size).toBe(0)
	})
})

describe('a string held in tune', () => {
	const E2 = GUITAR.tuning[0].frequency

	it('fills the stability ring, then confirms the string after 1.1 s (guitar)', async () => {
		const { tuner } = await setup()
		await feed(note(E2), 1000)
		expect(tuner.tunedStrings.value.has(0)).toBe(false)
		expect(tuner.stabilityProgress.value).toBeGreaterThan(0.8)
		expect(tuner.hint.value).toBe('in-range')

		await feed(note(E2), 200)
		expect(tuner.tunedStrings.value.has(0)).toBe(true)
		expect(tuner.lockedStringIndex.value).toBe(1)
	})

	it('counts up to ±8 cents as in tune', async () => {
		const { tuner } = await setup()
		await feed(note(E2, 7), 1200)
		expect(tuner.tunedStrings.value.has(0)).toBe(true)
	})

	it('shows the frequency it hears, in Hz with one decimal', async () => {
		const { tuner } = await setup()
		await feed(note(E2), 100)
		expect(tuner.frequency.value).toBe(82.4)
		expect(tuner.cents.value).toBe(0)
	})
})

describe('a string out of tune', () => {
	const E2 = GUITAR.tuning[0].frequency

	it('30 cents sharp: says "tune down" and never confirms', async () => {
		const { tuner } = await setup()
		await feed(note(E2, 30), 3000)
		expect(tuner.hint.value).toBe('too-high')
		expect(tuner.cents.value).toBe(30)
		expect(tuner.tunedStrings.value.size).toBe(0)
	})

	it('30 cents flat: says "tune up" and never confirms', async () => {
		const { tuner } = await setup()
		await feed(note(E2, -30), 3000)
		expect(tuner.hint.value).toBe('too-low')
		expect(tuner.tunedStrings.value.size).toBe(0)
	})

	it('far off (a few semitones): coarse direction hint, no stability progress', async () => {
		const { tuner } = await setup()
		await feed(note(E2, -400), 500)
		expect(tuner.hint.value).toBe('too-low')
		expect(tuner.cents.value).toBe(-400)
		expect(tuner.stabilityProgress.value).toBe(0)

		const fresh = await setup()
		await feed(note(E2, 500), 500)
		expect(fresh.tuner.hint.value).toBe('too-high')
	})

	it('confirms once the string is brought back into tune', async () => {
		const { tuner } = await setup()
		await feed(note(E2, 30), 1500)
		await feed(note(E2, 15), 500)
		await feed(note(E2), 2500)
		expect(tuner.tunedStrings.value.has(0)).toBe(true)
	})
})

describe('noisy readings', () => {
	const E2 = GUITAR.tuning[0].frequency

	it('ignores frames below the clarity gate', async () => {
		const { tuner } = await setup()
		await feed(note(E2, 0, 0.5), 500)
		expect(tuner.frequency.value).toBeNull()
		expect(tuner.hint.value).toBeNull()
	})

	it('accepts a less clear frame while the string is fading (quiet), not while it is loud', async () => {
		// Guitar: clarity 0.92 normally, 0.80 when rms < 0.04
		const loud = await setup()
		await feed(note(E2, 0, 0.85, 0.1), 300)
		expect(loud.tuner.frequency.value).toBeNull()

		const quiet = await setup()
		await feed(note(E2, 0, 0.85, 0.02), 300)
		expect(quiet.tuner.frequency.value).toBe(82.4)
	})

	it('reads the 2nd harmonic of the low string as its fundamental (octave fold)', async () => {
		const { tuner } = await setup()
		await feed(note(E2 * 2), 300)
		expect(tuner.frequency.value).toBe(82.4)
		expect(tuner.hint.value).toBe('in-range')

		await feed(note(E2 * 2), 900)
		expect(tuner.tunedStrings.value.has(0)).toBe(true)
	})

	it('keeps the reading through a 500 ms unclear tail, then clears it but leaves the needle', async () => {
		const { tuner } = await setup()
		await feed(note(E2, 5), 300)
		await feed(note(E2, 0, 0.3, 0.02), 300)
		expect(tuner.frequency.value).not.toBeNull()

		await feed(note(E2, 0, 0.3, 0.02), 400)
		expect(tuner.frequency.value).toBeNull()
		expect(tuner.hint.value).toBeNull()
		expect(tuner.stabilityProgress.value).toBe(0)
		expect(tuner.needleCents.value).not.toBeNull()
	})
})

describe('silence (no frames at all: the capture gates them out)', () => {
	const E2 = GUITAR.tuning[0].frequency

	it('blanks the reading 500 ms after the last frame, keeping the needle', async () => {
		const { tuner } = await setup()
		await feed(note(E2, 4), 600)
		expect(tuner.hint.value).toBe('in-range')

		await vi.advanceTimersByTimeAsync(450)
		expect(tuner.hint.value).toBe('in-range')

		await vi.advanceTimersByTimeAsync(100)
		expect(tuner.hint.value).toBeNull()
		expect(tuner.frequency.value).toBeNull()
		expect(tuner.stabilityProgress.value).toBe(0)
		expect(tuner.needleCents.value).not.toBeNull()
	})

	it('shows the reading again with the next frame', async () => {
		const { tuner } = await setup()
		await feed(note(E2), 300)
		await vi.advanceTimersByTimeAsync(800)
		expect(tuner.frequency.value).toBeNull()

		await feed(note(E2), 100)
		expect(tuner.frequency.value).toBe(82.4)
	})
})

describe('moving through the strings', () => {
	it('after the last string: "all in tune", then stops by itself 2 s later', async () => {
		const { tuner } = await setup()
		for (const s of GUITAR.tuning) await feed(note(s.frequency), 1200)
		expect(tuner.allTuned.value).toBe(true)
		expect(tuner.tunedStrings.value.size).toBe(6)

		await vi.advanceTimersByTimeAsync(2000)
		expect(capture.stops).toBe(1)
		expect(tuner.isListening.value).toBe(false)
		expect(tuner.allTuned.value).toBe(false)
	})

	it('choosing a tuned string un-marks it so it is checked again', async () => {
		const { tuner } = await setup()
		await feed(note(GUITAR.tuning[0].frequency), 1200)
		expect(tuner.tunedStrings.value.has(0)).toBe(true)

		tuner.selectString(0)
		expect(tuner.tunedStrings.value.has(0)).toBe(false)
		expect(tuner.lockedStringIndex.value).toBe(0)
		expect(tuner.stabilityProgress.value).toBe(0)
	})

	it("ignores the next string's note while still on the current one", async () => {
		const { tuner } = await setup()
		await feed(note(GUITAR.tuning[1].frequency), 1500) // A2 while waiting for E2
		expect(tuner.tunedStrings.value.size).toBe(0)
		expect(tuner.lockedStringIndex.value).toBe(0)
	})

	it('sets the low-pass filter to 3× the string, between 280 and 2000 Hz', async () => {
		await setup()
		expect(capture.cutoffs.at(-1)).toBe(280) // E2 × 3 = 247 → 280
		await feed(note(GUITAR.tuning[0].frequency), 1200)
		expect(capture.cutoffs.at(-1)).toBeCloseTo(GUITAR.tuning[1].frequency * 3, 6) // A2 → 330
	})
})

describe('changing tuning while listening', () => {
	it('restarts capture with the new window size when the instrument changes', async () => {
		const { active, tuner } = await setup(GUITAR)
		active.value = BASS
		await vi.advanceTimersByTimeAsync(0)
		await nextTick()
		expect(capture.stops).toBe(1)
		expect(capture.starts).toBe(2)
		expect(capture.options?.primaryFftSize).toBe(8192)
		expect(tuner.isListening.value).toBe(true)
	})

	it('starts again from the first string within the same instrument', async () => {
		const { active, tuner } = await setup(GUITAR)
		await feed(note(GUITAR.tuning[0].frequency), 1200)
		active.value = preset('dropd')
		await nextTick()
		expect(capture.stops).toBe(0)
		expect(tuner.lockedStringIndex.value).toBe(0)
		expect(tuner.tunedStrings.value.size).toBe(0)
	})
})
