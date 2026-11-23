import { describe, expect, it } from 'vitest'
import { formatNote, noteToFrequency, PRESET_TUNINGS } from './tunings'

/** The note names noteToFrequency understands: anything else gives a wrong frequency. */
const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const CATEGORIES = ['guitar', 'ukulele', 'bass', 'violin']

describe('noteToFrequency', () => {
	it.each([
		['A', 4, 440],
		['A', 2, 110],
		['C', 4, 261.626],
		['E', 2, 82.407],
		['E', 4, 329.628],
		['B', 0, 30.868],
		['E', 5, 659.255],
	])('%s%i is %f Hz (equal temperament, A4 = 440 Hz)', (note, octave, hz) => {
		expect(noteToFrequency(note, octave)).toBeCloseTo(hz, 2)
	})

	it('goes up by 2^(1/12) per semitone and doubles per octave', () => {
		expect(noteToFrequency('A#', 4) / noteToFrequency('A', 4)).toBeCloseTo(2 ** (1 / 12), 10)
		expect(noteToFrequency('E', 3) / noteToFrequency('E', 2)).toBeCloseTo(2, 10)
	})
})

describe('formatNote', () => {
	it('keeps sharps unless the tuning prefers flats', () => {
		expect(formatNote('D#')).toBe('D#')
		expect(formatNote('D#', true)).toBe('Eb')
		expect(formatNote('G#', true)).toBe('Ab')
	})

	it('leaves natural notes alone', () => {
		expect(formatNote('E', true)).toBe('E')
	})
})

describe('PRESET_TUNINGS', () => {
	it('has unique ids', () => {
		const ids = PRESET_TUNINGS.map((t) => t.id)
		expect(new Set(ids).size).toBe(ids.length)
	})

	it('has no two presets of the same instrument with the same notes, except named aliases', () => {
		// A tenor ukulele with a low G is tuned like 'Low G (GCEA)': listed under its own name on purpose
		const aliases = ['uke_tenor = uke_low_g']
		const seen = new Map<string, string>()
		const duplicates: string[] = []
		for (const t of PRESET_TUNINGS) {
			const key = `${t.category}:${t.tuning.map((s) => s.note + s.octave).join(' ')}`
			const other = seen.get(key)
			if (other) duplicates.push(`${t.id} = ${other}`)
			else seen.set(key, t.id)
		}
		expect(duplicates).toEqual(aliases)
	})

	describe.each(PRESET_TUNINGS.map((t) => [t.id, t] as const))('%s', (_id, preset) => {
		it('has as many strings as it says', () => {
			expect(preset.tuning).toHaveLength(preset.strings)
		})

		it('belongs to an instrument the tuner has settings for', () => {
			expect(CATEGORIES).toContain(preset.category)
		})

		it('names every note with a sharp name (a flat would get a wrong frequency)', () => {
			for (const s of preset.tuning) expect(SHARP_NOTES).toContain(s.note)
		})

		it("stores each string's frequency for its note and octave", () => {
			for (const s of preset.tuning) {
				expect(s.frequency).toBeCloseTo(noteToFrequency(s.note, s.octave), 6)
			}
		})

		it('stays inside the range the audio chain listens to (low-pass cutoff ≤ 2000 Hz)', () => {
			for (const s of preset.tuning) {
				expect(s.frequency).toBeGreaterThan(25)
				expect(s.frequency * 3).toBeLessThanOrEqual(2100)
			}
		})
	})
})
