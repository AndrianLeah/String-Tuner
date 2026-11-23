/**
 * The whole audio chain with a virtual instrument instead of a microphone: the real
 * useAudioCapture (RMS gate, attack gate, two pitchy windows), the real useTuner, and a fake
 * Web Audio API that plays synthetic plucked strings (see src/test/virtualInstrument.ts).
 * Nothing of the app is mocked except the browser.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { PRESET_TUNINGS, type TuningPreset } from '../data/tunings'
import { installFakeAudio, type PluckOptions, VirtualInstrument } from '../test/virtualInstrument'
import { useTuner } from './useTuner'

const preset = (id: string) => PRESET_TUNINGS.find((t) => t.id === id) as TuningPreset

interface Player {
	/** Cents off for this string on its n-th pluck (1-based). Default: in tune */
	cents?: (stringIndex: number, pluck: number) => number
	/** How each string sounds. Default: a plucked steel string */
	sound?: (stringIndex: number) => PluckOptions
	/** Give up after this many plucks in all */
	maxPlucks?: number
}

/**
 * A player who plucks the string the tuner is waiting for and plucks it again every 2.5 s until
 * the tuner moves on, then waits 0.4 s and plucks the next one. Earlier strings keep ringing.
 */
async function play(tuning: TuningPreset, player: Player = {}) {
	const instrument = new VirtualInstrument()
	installFakeAudio(instrument)
	const tuner = useTuner(ref(tuning))
	await tuner.start()

	const hints = new Map<number, Set<string>>()
	const plucksPerString = new Map<number, number>()
	let plucks = 0
	const started = performance.now()

	while (!tuner.allTuned.value && plucks < (player.maxPlucks ?? 24)) {
		const index = tuner.lockedStringIndex.value
		const n = (plucksPerString.get(index) ?? 0) + 1
		plucksPerString.set(index, n)
		const cents = player.cents?.(index, n) ?? 0
		instrument.pluck(tuning.tuning[index].frequency * 2 ** (cents / 1200), player.sound?.(index))
		plucks++

		for (let t = 0; t < 2500; t += 100) {
			await vi.advanceTimersByTimeAsync(100)
			if (tuner.hint.value) {
				if (!hints.has(index)) hints.set(index, new Set())
				hints.get(index)?.add(tuner.hint.value)
			}
			if (tuner.lockedStringIndex.value !== index || tuner.allTuned.value) {
				await vi.advanceTimersByTimeAsync(400)
				break
			}
		}
	}
	return {
		tuner,
		plucks,
		plucksPerString,
		hints,
		seconds: (performance.now() - started) / 1000,
	}
}

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] })
	vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
	vi.useRealTimers()
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

describe('every string in tune is confirmed, one or two plucks each', () => {
	const instruments: [id: string, name: string, sound: PluckOptions][] = [
		['std6', 'guitar, standard', {}],
		['dropd', 'guitar, drop D', {}],
		['bass_std4', 'bass, 4 strings', { decay: 2 }],
		['bass_std5', 'bass, 5 strings (low B, 31 Hz)', { decay: 2 }],
		['uke_std', 'ukulele, re-entrant G', { decay: 0.6, harmonics: [1, 0.3, 0.12, 0.05] }],
		[
			'violin_std',
			'violin, bowed for 2 s',
			{ decay: 30, duration: 2, harmonics: [1, 0.5, 0.33, 0.25, 0.2, 0.17], amplitude: 0.15 },
		],
	]
	it.each(instruments)(
		'%s (%s)',
		async (id, _name, sound) => {
			const tuning = preset(id)
			const session = await play(tuning, { sound: () => sound })
			expect(session.tuner.allTuned.value).toBe(true)
			for (let i = 0; i < tuning.tuning.length; i++) {
				expect(session.plucksPerString.get(i), `string ${i + 1} plucks`).toBeLessThanOrEqual(2)
			}
		},
		30_000,
	)
})

describe('a string out of tune', () => {
	const guitar = preset('std6')

	it('25 cents sharp: "tune down", never confirmed', async () => {
		const session = await play(guitar, { cents: () => 25, maxPlucks: 3 })
		expect(session.tuner.tunedStrings.value.size).toBe(0)
		expect(session.hints.get(0)).toContain('too-high')
		expect(session.hints.get(0)).not.toContain('in-range')
	}, 30_000)

	it('25 cents flat: "tune up", never confirmed', async () => {
		const session = await play(guitar, { cents: () => -25, maxPlucks: 3 })
		expect(session.tuner.tunedStrings.value.size).toBe(0)
		expect(session.hints.get(0)).toContain('too-low')
	}, 30_000)

	it('a whole tone flat (low E tuned to D): "tune up", never confirmed', async () => {
		const session = await play(guitar, { cents: () => -200, maxPlucks: 3 })
		expect(session.tuner.tunedStrings.value.size).toBe(0)
		expect(session.hints.get(0)).toContain('too-low')
	}, 30_000)

	it('confirmed once the player brings it into tune', async () => {
		const session = await play(guitar, {
			cents: (string, pluck) => (string === 0 ? [30, 12, 0][Math.min(pluck, 3) - 1] : 0),
		})
		expect(session.hints.get(0)).toContain('too-high')
		expect(session.tuner.allTuned.value).toBe(true)
		expect(session.plucksPerString.get(0)).toBeGreaterThanOrEqual(3)
	}, 30_000)
})

describe('silence', () => {
	// Known: below its RMS gate useAudioCapture sends no frames at all, so useTuner's 500 ms
	// latch-and-fade never runs: "Hold steady…" and a half-full ring stay on screen while
	// nothing is playing. `it.fails` passes while that is so; make it `it` once it is fixed.
	it.fails('clears the reading and the ring within a second after the string stops', async () => {
		const guitar = preset('std6')
		const instrument = new VirtualInstrument()
		installFakeAudio(instrument)
		const tuner = useTuner(ref(guitar))
		await tuner.start()

		instrument.pluck(guitar.tuning[0].frequency, { duration: 0.6 })
		await vi.advanceTimersByTimeAsync(600)
		expect(tuner.hint.value).toBe('in-range')

		await vi.advanceTimersByTimeAsync(1000)
		expect(tuner.hint.value).toBeNull()
		expect(tuner.stabilityProgress.value).toBe(0)
	})
})

describe('a phone microphone that barely hears the low fundamentals', () => {
	it('still confirms every guitar string when the 2nd harmonic is 4× the fundamental', async () => {
		const weakFundamental = [0.25, 1, 0.6, 0.4, 0.25, 0.15]
		const session = await play(preset('std6'), { sound: () => ({ harmonics: weakFundamental }) })
		expect(session.tuner.allTuned.value).toBe(true)
	}, 30_000)
})
