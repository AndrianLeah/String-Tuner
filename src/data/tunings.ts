const NOTE_ORDER = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

const SHARP_TO_FLAT: Record<string, string> = {
	'C#': 'Db',
	'D#': 'Eb',
	'F#': 'Gb',
	'G#': 'Ab',
	'A#': 'Bb',
}

export function noteToFrequency(note: string, octave: number): number {
	const semitones = NOTE_ORDER.indexOf(note as (typeof NOTE_ORDER)[number])
	const midi = (octave + 1) * 12 + semitones
	return 440 * Math.pow(2, (midi - 69) / 12)
}

export interface TuningString {
	note: string
	octave: number
	frequency: number
}

export type InstrumentCategory = 'guitar' | 'ukulele' | 'bass' | 'violin'

export interface TuningPreset {
	id: string
	name: string
	strings: number
	category: InstrumentCategory
	/** Use flat names (Eb, Ab…) when displaying notes */
	preferFlats?: boolean
	/** From index 0 (thickest/lowest) to last (thinnest/highest) */
	tuning: TuningString[]
}

function s(note: string, octave: number): TuningString {
	return { note, octave, frequency: noteToFrequency(note, octave) }
}

export function formatNote(note: string, preferFlats = false): string {
	return preferFlats ? (SHARP_TO_FLAT[note] ?? note) : note
}

export const PRESET_TUNINGS: readonly TuningPreset[] = [
	// ── Guitar ────────────────────────────────────────────────────────────────
	{
		id: 'std6',
		name: 'Standard',
		strings: 6,
		category: 'guitar',
		tuning: [s('E', 2), s('A', 2), s('D', 3), s('G', 3), s('B', 3), s('E', 4)],
	},
	{
		id: 'dropd',
		name: 'Drop D',
		strings: 6,
		category: 'guitar',
		tuning: [s('D', 2), s('A', 2), s('D', 3), s('G', 3), s('B', 3), s('E', 4)],
	},
	{
		id: 'hstep6',
		name: 'Half Step Down',
		strings: 6,
		category: 'guitar',
		preferFlats: true,
		tuning: [s('D#', 2), s('G#', 2), s('C#', 3), s('F#', 3), s('A#', 3), s('D#', 4)],
	},
	{
		id: 'fstep6',
		name: 'Full Step Down',
		strings: 6,
		category: 'guitar',
		tuning: [s('D', 2), s('G', 2), s('C', 3), s('F', 3), s('A', 3), s('D', 4)],
	},
	{
		id: 'dropc',
		name: 'Drop C',
		strings: 6,
		category: 'guitar',
		tuning: [s('C', 2), s('G', 2), s('C', 3), s('F', 3), s('A', 3), s('D', 4)],
	},
	{
		id: 'dropb',
		name: 'Drop B',
		strings: 6,
		category: 'guitar',
		preferFlats: true,
		tuning: [s('B', 1), s('F#', 2), s('B', 2), s('E', 3), s('G#', 3), s('C#', 4)],
	},
	{
		id: 'openg',
		name: 'Open G',
		strings: 6,
		category: 'guitar',
		tuning: [s('D', 2), s('G', 2), s('D', 3), s('G', 3), s('B', 3), s('D', 4)],
	},
	{
		id: 'opend',
		name: 'Open D',
		strings: 6,
		category: 'guitar',
		tuning: [s('D', 2), s('A', 2), s('D', 3), s('F#', 3), s('A', 3), s('D', 4)],
	},
	{
		id: 'opene',
		name: 'Open E',
		strings: 6,
		category: 'guitar',
		tuning: [s('E', 2), s('B', 2), s('E', 3), s('G#', 3), s('B', 3), s('E', 4)],
	},
	{
		id: 'opena',
		name: 'Open A',
		strings: 6,
		category: 'guitar',
		tuning: [s('E', 2), s('A', 2), s('E', 3), s('A', 3), s('C#', 4), s('E', 4)],
	},
	{
		id: 'dadgad',
		name: 'DADGAD',
		strings: 6,
		category: 'guitar',
		tuning: [s('D', 2), s('A', 2), s('D', 3), s('G', 3), s('A', 3), s('D', 4)],
	},
	{
		id: 'openc',
		name: 'Open C',
		strings: 6,
		category: 'guitar',
		tuning: [s('C', 2), s('G', 2), s('C', 3), s('G', 3), s('C', 4), s('E', 4)],
	},
	// ── Ukulele ───────────────────────────────────────────────────────────────
	{
		id: 'uke_std',
		name: 'Standard (GCEA)',
		strings: 4,
		category: 'ukulele',
		tuning: [s('G', 4), s('C', 4), s('E', 4), s('A', 4)],
	},
	{
		id: 'uke_baritone',
		name: 'Baritone (DGBE)',
		strings: 4,
		category: 'ukulele',
		tuning: [s('D', 3), s('G', 3), s('B', 3), s('E', 4)],
	},
	{
		id: 'uke_low_g',
		name: 'Low G (GCEA)',
		strings: 4,
		category: 'ukulele',
		tuning: [s('G', 3), s('C', 4), s('E', 4), s('A', 4)],
	},
	{
		id: 'uke_d_std',
		name: 'D Tuning (ADF#B)',
		strings: 4,
		category: 'ukulele',
		tuning: [s('A', 4), s('D', 4), s('F#', 4), s('B', 4)],
	},
	{
		id: 'uke_slack',
		name: 'Slack Key (GCEG)',
		strings: 4,
		category: 'ukulele',
		tuning: [s('G', 4), s('C', 4), s('E', 4), s('G', 4)],
	},
	{
		id: 'uke_tenor',
		name: 'Tenor Low G',
		strings: 4,
		category: 'ukulele',
		tuning: [s('G', 3), s('C', 4), s('E', 4), s('A', 4)],
	},
	{
		id: 'uke_open_d',
		name: 'Open D',
		strings: 4,
		category: 'ukulele',
		preferFlats: true,
		tuning: [s('F#', 4), s('D', 4), s('F#', 4), s('A', 4)],
	},

	// ── Bass ──────────────────────────────────────────────────────────────────
	{
		id: 'bass_std4',
		name: 'Standard 4',
		strings: 4,
		category: 'bass',
		tuning: [s('E', 1), s('A', 1), s('D', 2), s('G', 2)],
	},
	{
		id: 'bass_dropd',
		name: 'Drop D',
		strings: 4,
		category: 'bass',
		tuning: [s('D', 1), s('A', 1), s('D', 2), s('G', 2)],
	},
	{
		id: 'bass_hstep',
		name: 'Half Step Down',
		strings: 4,
		category: 'bass',
		preferFlats: true,
		tuning: [s('D#', 1), s('G#', 1), s('C#', 2), s('F#', 2)],
	},
	{
		id: 'bass_fstep',
		name: 'Full Step Down',
		strings: 4,
		category: 'bass',
		tuning: [s('D', 1), s('G', 1), s('C', 2), s('F', 2)],
	},
	{
		id: 'bass_std5',
		name: 'Standard 5',
		strings: 5,
		category: 'bass',
		tuning: [s('B', 0), s('E', 1), s('A', 1), s('D', 2), s('G', 2)],
	},
	{
		id: 'bass_dropd5',
		name: 'Drop D 5',
		strings: 5,
		category: 'bass',
		tuning: [s('B', 0), s('E', 1), s('A', 1), s('D', 2), s('G', 2)],
	},
	{
		id: 'bass_std6',
		name: 'Standard 6',
		strings: 6,
		category: 'bass',
		tuning: [s('B', 0), s('E', 1), s('A', 1), s('D', 2), s('G', 2), s('C', 3)],
	},
	{
		id: 'bass_piccolo',
		name: 'Piccolo',
		strings: 4,
		category: 'bass',
		tuning: [s('E', 2), s('A', 2), s('D', 3), s('G', 3)],
	},

	// ── Violin ────────────────────────────────────────────────────────────────
	{
		id: 'violin_std',
		name: 'Standard (GDAE)',
		strings: 4,
		category: 'violin',
		tuning: [s('G', 3), s('D', 4), s('A', 4), s('E', 5)],
	},
	{
		id: 'violin_scordatura_adae',
		name: 'Scordatura (ADAE)',
		strings: 4,
		category: 'violin',
		tuning: [s('A', 3), s('D', 4), s('A', 4), s('E', 5)],
	},
	{
		id: 'violin_scordatura_gdgd',
		name: 'Scordatura (GDGD)',
		strings: 4,
		category: 'violin',
		tuning: [s('G', 3), s('D', 4), s('G', 4), s('D', 5)],
	},
	{
		id: 'violin_scordatura_aeae',
		name: 'Scordatura (AEAE)',
		strings: 4,
		category: 'violin',
		tuning: [s('A', 3), s('E', 4), s('A', 4), s('E', 5)],
	},
]
