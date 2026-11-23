import { describe, expect, it } from 'vitest'
import { centsBetween, foldTowardTarget, isHarmonicOf, median } from './pitch'

const E2 = 82.4069

describe('centsBetween', () => {
	it('is 0 for the same frequency, ±1200 for an octave, ±100 for a semitone', () => {
		expect(centsBetween(E2, E2)).toBe(0)
		expect(centsBetween(E2 * 2, E2)).toBe(1200)
		expect(centsBetween(E2 / 2, E2)).toBe(-1200)
		expect(centsBetween(E2 * 2 ** (1 / 12), E2)).toBe(100)
	})

	it('rounds to the nearest cent', () => {
		expect(centsBetween(E2 * 2 ** (7.4 / 1200), E2)).toBe(7)
		expect(centsBetween(E2 * 2 ** (-7.6 / 1200), E2)).toBe(-8)
	})
})

describe('isHarmonicOf', () => {
	it('recognises the 2nd to 6th harmonics, within 8%', () => {
		for (const n of [2, 3, 4, 5, 6]) expect(isHarmonicOf(E2 * n, E2)).toBe(true)
		expect(isHarmonicOf(E2 * 3 * 1.02, E2)).toBe(true)
	})

	it('does not count the fundamental, the 7th harmonic or notes in between', () => {
		expect(isHarmonicOf(E2, E2)).toBe(false)
		expect(isHarmonicOf(E2 * 7, E2)).toBe(false)
		expect(isHarmonicOf(E2 * 2.5, E2)).toBe(false)
	})
})

describe('median', () => {
	it('is the middle value, the upper middle one for an even count', () => {
		expect(median([3, 1, 2])).toBe(2)
		expect(median([4, 1, 3, 2])).toBe(3)
	})

	it('ignores a single octave-error spike', () => {
		expect(median([82, 82.4, 164.8, 82.3, 82.5])).toBe(82.4)
	})

	it('does not reorder its input', () => {
		const input = [3, 1, 2]
		median(input)
		expect(input).toEqual([3, 1, 2])
	})
})

describe('foldTowardTarget', () => {
	it('brings a harmonic down to the fundamental', () => {
		expect(foldTowardTarget(E2 * 2, E2)).toBeCloseTo(E2, 6)
		expect(foldTowardTarget(E2 * 3, E2)).toBeCloseTo(E2, 6)
	})

	it('keeps a slightly sharp harmonic slightly sharp', () => {
		const folded = foldTowardTarget(E2 * 2 * 2 ** (10 / 1200), E2)
		expect(centsBetween(folded, E2)).toBe(10)
	})

	it('leaves a pitch near the target alone', () => {
		expect(foldTowardTarget(E2 * 1.1, E2)).toBe(E2 * 1.1)
	})

	it('leaves a pitch that no division brings within 300 cents', () => {
		expect(foldTowardTarget(E2 * 2.5, E2)).toBe(E2 * 2.5)
	})
})
