/**
 * useTuner — connects the tuning engine (src/tuner/engine.ts) to the microphone and to Vue.
 *
 * Audio capture is delegated to useAudioCapture, the analysis to the engine; this composable
 * feeds one to the other, mirrors the engine's state into read-only refs for the UI, steers
 * the low-pass filter to the string being tuned, and stops on its own once every string is
 * in tune.
 */
import { readonly, ref, watch, type Ref } from 'vue'
import type { TuningPreset } from '../data/tunings'
import { createTunerEngine, type TunerHint } from '../tuner/engine'
import { createSessionLog } from '../tuner/sessionLog'
import { useAudioCapture, type AudioFrame } from './useAudioCapture'

export type { TunerHint }

/** How long (ms) to show the all-tuned banner before auto-stopping */
const ALL_TUNED_RESET_MS = 2000

export function useTuner(activeTuning: Ref<TuningPreset>) {
	const { isCapturing, captureError, startCapture, stopCapture, setLowPassCutoff } =
		useAudioCapture()

	const log = createSessionLog()
	let allTunedResetTimer: ReturnType<typeof setTimeout> | null = null
	const engine = createTunerEngine(activeTuning.value, {
		log,
		// All strings tuned — show the banner, then stop.
		onAllTuned() {
			allTunedResetTimer = setTimeout(() => {
				allTunedResetTimer = null
				stop()
			}, ALL_TUNED_RESET_MS)
		},
	})

	// --- Reactive state for the UI, copied from the engine after each change ---
	const frequency = ref<number | null>(null)
	const lockedStringIndex = ref<number>(0)
	const cents = ref<number | null>(null)
	const hint = ref<TunerHint>(null)
	const stabilityProgress = ref<number>(0)
	const tunedStrings = ref<Set<number>>(new Set())
	const allTuned = ref(false)
	const needleCents = ref<number | null>(null)
	const signalClarity = ref(0)

	function sync() {
		const d = engine.display
		frequency.value = d.frequency
		cents.value = d.cents
		hint.value = d.hint
		stabilityProgress.value = d.stabilityProgress
		needleCents.value = d.needleCents
		signalClarity.value = d.signalClarity
		lockedStringIndex.value = engine.lockedStringIndex
		tunedStrings.value = engine.tunedStrings as Set<number>
		allTuned.value = engine.allTuned
	}

	watch(activeTuning, async (newVal, oldVal) => {
		engine.setTuning(newVal)
		if (isCapturing.value) {
			// Category change requires restarting audio to apply a new FFT size
			if (newVal.category !== oldVal?.category) {
				stop()
				await start()
			} else {
				resetState()
			}
		}
	})

	watch(lockedStringIndex, updateLpf)

	function updateLpf() {
		const tuningArr = activeTuning.value.tuning
		const lockedFreq = tuningArr[Math.min(lockedStringIndex.value, tuningArr.length - 1)].frequency
		setLowPassCutoff(Math.min(2000, Math.max(280, lockedFreq * 3)))
	}

	function resetState() {
		engine.reset()
		if (allTunedResetTimer !== null) {
			clearTimeout(allTunedResetTimer)
			allTunedResetTimer = null
		}
		sync()
	}

	function processTick(frame: AudioFrame) {
		engine.process(frame, performance.now())
		sync()
	}

	/**
	 * Jump to a string and reset its tuning state.
	 * If the string was already marked tuned, un-mark it so it gets re-checked.
	 */
	function selectString(index: number) {
		engine.selectString(index)
		sync()
	}

	async function start() {
		log.clear()
		engine.resetCounters()
		const cfg = engine.config
		log.add(
			`=== TUNER SESSION START === instrument=${activeTuning.value.category} tuning=${activeTuning.value.name}`,
		)
		log.add(
			`cfg: fftSize=${cfg.primaryFftSize} stableMs=${cfg.stableMs} clarityThreshold=${cfg.clarityThreshold} decayThreshold=${cfg.decayClarityThreshold}`,
		)
		resetState()
		await startCapture(processTick, { primaryFftSize: cfg.primaryFftSize })
		// The LPF watcher fires before the audio graph exists; set it now for string 0.
		updateLpf()
	}

	function stop() {
		stopCapture()
		const c = engine.counters
		log.add(`=== TUNER SESSION STOP ===`)
		log.add(
			`ticks: total=${c.total} hasSignal=${c.hasSignal} coarseHint=${c.coarseHint} overtone=${c.overtone} silence=${c.silence} continuityRejected=${c.continuityRejected}`,
		)
		log.add(
			`tunedStrings=${[...engine.tunedStrings].join(',') || 'none'} allTuned=${engine.allTuned}`,
		)
		log.print()
		resetState()
	}

	return {
		isListening: isCapturing,
		frequency: readonly(frequency),
		lockedStringIndex: readonly(lockedStringIndex),
		cents: readonly(cents),
		needleCents: readonly(needleCents),
		hint: readonly(hint),
		stabilityProgress: readonly(stabilityProgress),
		tunedStrings: readonly(tunedStrings),
		allTuned: readonly(allTuned),
		error: captureError,
		signalClarity: readonly(signalClarity),
		start,
		stop,
		selectString,
	}
}
