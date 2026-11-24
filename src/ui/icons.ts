/**
 * The icon set, drawn in the design file (mockup/string-tuner-liquid-glass.figcraft) and placed
 * on a 24 × 24 grid. Every icon is a stroke in currentColor; `stroke` is its line width at 24 px.
 */
export interface IconShape {
	paths: string[]
	stroke: number
}

const circle = (cx: number, cy: number, r: number) =>
	`M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`

export const ICONS = {
	'arrow-down': { paths: ['M12 5v14M6 13l6 6 6-6'], stroke: 2.4 },
	'arrow-up': { paths: ['M12 19V5M6 11l6-6 6 6'], stroke: 2.4 },
	check: { paths: ['M5 12.25l5 5 9-10.5'], stroke: 2.4 },
	'chevron-right': { paths: ['M9 6l6 6-6 6'], stroke: 2 },
	close: { paths: ['M6 6l12 12M18 6 6 18'], stroke: 2 },
	gear: {
		paths: [
			'M9.99 5.09L10.37 2.64L13.63 2.64L14.01 5.09L15.47 5.69L17.46 4.23L19.77 6.54L18.31 8.53L18.91 9.99L21.36 10.37L21.36 13.63L18.91 14.01L18.31 15.47L19.77 17.46L17.46 19.77L15.47 18.31L14.01 18.91L13.63 21.36L10.37 21.36L9.99 18.91L8.53 18.31L6.54 19.77L4.23 17.46L5.69 15.47L5.09 14.01L2.64 13.63L2.64 10.37L5.09 9.99L5.69 8.53L4.23 6.54L6.54 4.23L8.53 5.69Z',
			circle(12, 12, 2.65),
		],
		stroke: 1.7,
	},
	moon: {
		paths: [
			'M20 14.75C18.9 15.25 17.7 15.55 16.4 15.55C11.9 15.55 8.3 11.95 8.3 7.45C8.3 6.15 8.6 4.95 9.1 3.85C6.1 5.15 4 8.15 4 11.65C4 16.35 7.8 20.15 12.5 20.15C16 20.15 19 18.05 20 14.75Z',
		],
		stroke: 1.8,
	},
	search: { paths: [circle(10, 10, 5), 'M15 15l5 5'], stroke: 2 },
	sun: {
		paths: [
			circle(12, 12, 3.1),
			'M12 5.2V3M16.8 7.2l1.6-1.6M18.8 12H21M16.8 16.8l1.6 1.6M12 18.8V21M7.2 16.8l-1.6 1.6M5.2 12H3M7.2 7.2 5.6 5.6',
		],
		stroke: 1.8,
	},
} satisfies Record<string, IconShape>

export type IconName = keyof typeof ICONS
