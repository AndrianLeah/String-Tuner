// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { revealChange } from './motion'

// happy-dom has no View Transitions API: tests add a stand-in and remove it after
const doc = document as unknown as Record<string, unknown>

function fakeViewTransition() {
	const start = vi.fn((update: () => Promise<void>) => {
		const done = update()
		return { ready: done, finished: done }
	})
	doc.startViewTransition = start
	const animate = vi.fn()
	document.documentElement.animate = animate
	return { start, animate }
}

function reduceMotion(on: boolean) {
	window.matchMedia = vi.fn().mockReturnValue({ matches: on }) as typeof window.matchMedia
}

afterEach(() => {
	delete doc.startViewTransition
	vi.restoreAllMocks()
})

describe('revealChange', () => {
	it('just makes the change where the browser has no view transitions', async () => {
		reduceMotion(false)
		const update = vi.fn()
		await revealChange(update)
		expect(update).toHaveBeenCalledOnce()
	})

	it('opens the new state as a circle from the last tap', async () => {
		reduceMotion(false)
		const { start, animate } = fakeViewTransition()
		window.dispatchEvent(new PointerEvent('pointerdown', { clientX: 40, clientY: 60 }))
		const update = vi.fn()
		await revealChange(update)

		expect(start).toHaveBeenCalledOnce()
		expect(update).toHaveBeenCalledOnce()
		const [keyframes, options] = animate.mock.calls[0]
		expect(keyframes.clipPath[0]).toBe('circle(0px at 40px 60px)')
		expect(options.pseudoElement).toBe('::view-transition-new(root)')
		expect(document.documentElement.classList.contains('ui-theme-reveal')).toBe(false)
	})

	it('grows from the centre after a key press', async () => {
		reduceMotion(false)
		const { animate } = fakeViewTransition()
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
		await revealChange(() => {})
		const centre = `circle(0px at ${window.innerWidth / 2}px ${window.innerHeight / 2}px)`
		expect(animate.mock.calls[0][0].clipPath[0]).toBe(centre)
	})

	it('skips the animation with Reduce Motion', async () => {
		reduceMotion(true)
		const { start } = fakeViewTransition()
		const update = vi.fn()
		await revealChange(update)
		expect(start).not.toHaveBeenCalled()
		expect(update).toHaveBeenCalledOnce()
	})
})
