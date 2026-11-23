import type { InstrumentCategory } from '../data/tunings'

/** Per-instrument analysis configuration */
export interface InstrumentConfig {
	/** Primary FFT window size — larger values improve low-freq fundamental detection */
	primaryFftSize: number
	/** How long (ms) pitch must stay inside ACCEPT_CENTS to confirm the string */
	stableMs: number
	/** Minimum pitchy clarity to accept a pitch reading */
	clarityThreshold: number
	/** Stricter clarity gate when the string RMS is decaying */
	decayClarityThreshold: number
}

export const INSTRUMENT_CONFIGS: Record<InstrumentCategory, InstrumentConfig> = {
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

/** The configuration for `category`, guitar's for anything else (custom tunings, say). */
export function instrumentConfig(category: string): InstrumentConfig {
	return INSTRUMENT_CONFIGS[category as InstrumentCategory] ?? INSTRUMENT_CONFIGS.guitar
}
