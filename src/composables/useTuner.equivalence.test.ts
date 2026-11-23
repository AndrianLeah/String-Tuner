/**
 * The engine moved out of useTuner must behave exactly as before. The old useTuner (a verbatim
 * copy in src/test/legacyUseTuner.ts) and the new one get the same random frames, string
 * choices, tuning changes and restarts, at the same fake time, and everything the UI can see
 * is compared after every step. Removed in the next commit together with the copy.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { PRESET_TUNINGS } from '../data/tunings'
import { useTuner as useLegacyTuner } from '../test/legacyUseTuner'
import type { AudioFrame } from './useAudioCapture'
import { useTuner } from './useTuner'

interface FakeCapture {
	onTick: ((frame: AudioFrame) => void) | null
	options: unknown
	cutoffs: number[]
	stops: number
}
const captures = vi.hoisted(() => [] as FakeCapture[])

vi.mock('./useAudioCapture', async () => {
	const { readonly, ref } = await import('vue')
	return {
		useAudioCapture() {
			const isCapturing = ref(false)
			const c: FakeCapture = { onTick: null, options: undefined, cutoffs: [], stops: 0 }
			captures.push(c)
			return {
				isCapturing: readonly(isCapturing),
				captureError: readonly(ref<string | null>(null)),
				async startCapture(onTick: (frame: AudioFrame) => void, options?: unknown) {
					c.onTick = onTick
					c.options = options
					isCapturing.value = true
				},
				stopCapture() {
					c.onTick = null
					c.stops++
					isCapturing.value = false
				},
				setLowPassCutoff(hz: number) {
					c.cutoffs.push(hz)
				},
			}
		},
	}
})

function prng(seed: number) {
	let a = seed >>> 0
	return () => {
		a = (a + 0x6d2b79f5) >>> 0
		let t = a
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

type Tuner = ReturnType<typeof useTuner>
const snapshot = (t: Tuner) => ({
	isListening: t.isListening.value,
	frequency: t.frequency.value,
	lockedStringIndex: t.lockedStringIndex.value,
	cents: t.cents.value,
	needleCents: t.needleCents.value,
	hint: t.hint.value,
	stabilityProgress: t.stabilityProgress.value,
	tunedStrings: [...t.tunedStrings.value].sort(),
	allTuned: t.allTuned.value,
	signalClarity: t.signalClarity.value,
})

beforeEach(() => {
	captures.length = 0
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] })
	vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
	vi.useRealTimers()
	vi.restoreAllMocks()
})

describe('the engine in src/tuner/ behaves as useTuner did', () => {
	it.each([1, 2, 3, 4, 5, 6, 7, 8])(
		'random session %i: same state after every step',
		async (seed) => {
			const random = prng(seed)
			const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)]
			const active = ref(pick(PRESET_TUNINGS))
			const legacy = useLegacyTuner(active)
			const current = useTuner(active)
			const [legacyCapture, currentCapture] = captures
			const seen = { confirmed: 0, allTuned: 0, hints: new Set<string>(), steps: 0 }

			const compare = (step: string) => {
				seen.steps++
				expect(snapshot(current), step).toEqual(snapshot(legacy as unknown as Tuner))
				expect(currentCapture.cutoffs, step).toEqual(legacyCapture.cutoffs)
				expect(currentCapture.options, step).toEqual(legacyCapture.options)
				expect(currentCapture.stops, step).toBe(legacyCapture.stops)
			}

			await legacy.start()
			await current.start()
			compare('start')

			for (let tick = 0; tick < 6000; tick++) {
				const roll = random()
				if (!current.isListening.value) {
					await legacy.start()
					await current.start()
					compare(`restart at ${tick}`)
					continue
				}
				if (roll < 0.004) {
					const index = Math.floor(random() * active.value.tuning.length)
					legacy.selectString(index)
					current.selectString(index)
					await nextTick()
					compare(`selectString(${index}) at ${tick}`)
					continue
				}
				if (roll < 0.006) {
					active.value = pick(PRESET_TUNINGS)
					await vi.advanceTimersByTimeAsync(0)
					await nextTick()
					compare(`tuning ${active.value.id} at ${tick}`)
					continue
				}

				const strings = active.value.tuning
				const target =
					strings[Math.min(current.lockedStringIndex.value, strings.length - 1)].frequency
				const kind = random()
				let pitch: number
				if (kind < 0.35)
					pitch = target * 2 ** (((random() - 0.5) * 16) / 1200) // in tune
				else if (kind < 0.5)
					pitch = target * 2 ** (((random() - 0.5) * 90) / 1200) // near
				else if (kind < 0.62)
					pitch = target * 2 ** (((random() - 0.5) * 1400) / 1200) // far
				else if (kind < 0.75)
					pitch = target * (2 + Math.floor(random() * 5)) * (1 + (random() - 0.5) * 0.02)
				else if (kind < 0.85) pitch = pick(strings).frequency * (1 + Math.floor(random() * 3))
				else pitch = 30 + random() * 2000
				const frame: AudioFrame = {
					pitch,
					clarity: random() < 0.75 ? 0.75 + random() * 0.25 : random(),
					rms: random() < 0.3 ? 0.01 + random() * 0.03 : 0.04 + random() * 0.3,
				}

				await vi.advanceTimersByTimeAsync(8 + Math.floor(random() * 40))
				if (!current.isListening.value) continue // the all-tuned timer fired
				legacyCapture.onTick?.(frame)
				currentCapture.onTick?.(frame)
				await nextTick()
				compare(`tick ${tick} ${JSON.stringify(frame)}`)

				if (current.hint.value) seen.hints.add(current.hint.value)
				seen.confirmed = Math.max(seen.confirmed, current.tunedStrings.value.size)
				if (current.allTuned.value) seen.allTuned++
			}

			// The session went through the paths that matter, not only silence
			expect(seen.hints).toEqual(new Set(['in-range', 'too-high', 'too-low']))
			expect(seen.confirmed).toBeGreaterThan(0)
			expect(seen.steps).toBeGreaterThan(5000)
		},
		60_000,
	)
})
