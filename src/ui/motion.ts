/**
 * Motion helpers of the design system.
 */

// Where the last tap was, so a change can grow from under the finger. A key press resets it,
// and the change then grows from the centre of the screen.
let origin: { x: number; y: number } | null = null
if (typeof window !== 'undefined') {
	const options = { capture: true, passive: true }
	window.addEventListener('pointerdown', (e) => (origin = { x: e.clientX, y: e.clientY }), options)
	window.addEventListener('keydown', () => (origin = null), options)
}

export function prefersReducedMotion(): boolean {
	return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

const REVEAL_MS = 560

/**
 * Runs `update` (a change of the whole page, such as the theme) as a circle that opens from the
 * last tap, using the View Transitions API. Where the API is missing, or with Reduce Motion, the
 * change simply happens. `update` must have changed the DOM when its promise resolves.
 */
export async function revealChange(update: () => unknown): Promise<void> {
	if (typeof document.startViewTransition !== 'function' || prefersReducedMotion()) {
		await update()
		return
	}
	const { innerWidth: w, innerHeight: h } = window
	const { x, y } = origin ?? { x: w / 2, y: h / 2 }
	const radius = Math.hypot(Math.max(x, w - x), Math.max(y, h - y))

	const root = document.documentElement
	root.classList.add('ui-theme-reveal')
	const transition = document.startViewTransition(async () => {
		await update()
	})
	try {
		await transition.ready
		root.animate(
			{ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
			{
				duration: REVEAL_MS,
				easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
				pseudoElement: '::view-transition-new(root)',
			},
		)
		await transition.finished
	} catch {
		// Skipped (another transition started, or the page was hidden): the change is done anyway
	} finally {
		root.classList.remove('ui-theme-reveal')
	}
}
