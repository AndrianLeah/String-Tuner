/** Pure pitch arithmetic used by the tuning engine. No state, no Vue. */

/** Cents from `targetFreq` to `freq`, rounded to the nearest cent. */
export function centsBetween(freq: number, targetFreq: number): number {
	return Math.round(1200 * Math.log2(freq / targetFreq))
}

/**
 * Returns true if `pitch` is approximately an integer harmonic (2×–6×) of
 * `fundamentalFreq`. Tolerance ±8% covers natural intonation variance.
 */
export function isHarmonicOf(pitch: number, fundamentalFreq: number): boolean {
	for (let n = 2; n <= 6; n++) {
		if (Math.abs(pitch / fundamentalFreq - n) < 0.08) return true
	}
	return false
}

/** Median of `arr` (the upper one of the two middle values for an even length). */
export function median(arr: number[]): number {
	const s = [...arr].sort((a, b) => a - b)
	return s[Math.floor(s.length / 2)]
}

/**
 * Fold `pitch` toward `targetFreq` by dividing by N = 2..6.
 * If dividing brings it within 300¢ AND improves the match by >400¢,
 * return the folded value. Corrects pitchy latching onto upper harmonics.
 */
export function foldTowardTarget(pitch: number, targetFreq: number): number {
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
