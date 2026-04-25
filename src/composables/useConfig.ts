import { computed, readonly, ref, watch } from 'vue'
import { PRESET_TUNINGS, type TuningPreset } from '../data/tunings'
import { browserStorage } from '../services/storage'

const STORAGE_KEY = 'accordatore_config'

export interface AppConfig {
	selectedTuningId: string
	customTunings: TuningPreset[]
}

function loadFromStorage(): AppConfig {
	try {
		const raw = browserStorage.get(STORAGE_KEY)
		if (raw) {
			const parsed = JSON.parse(raw) as Partial<AppConfig>
			return {
				selectedTuningId: parsed.selectedTuningId ?? 'std6',
				customTunings: Array.isArray(parsed.customTunings) ? parsed.customTunings : [],
			}
		}
	} catch {
		// ignore parse errors
	}
	return { selectedTuningId: 'std6', customTunings: [] }
}

// Singleton reactive state – shared across all usages of this composable
const config = ref<AppConfig>(loadFromStorage())

watch(
	config,
	(val) => {
		browserStorage.set(STORAGE_KEY, JSON.stringify(val))
	},
	{ deep: true },
)

export function useConfig() {
	const allTunings = computed<TuningPreset[]>(() => [
		...PRESET_TUNINGS,
		...config.value.customTunings,
	])

	const activeTuning = computed<TuningPreset>(
		() => allTunings.value.find((t) => t.id === config.value.selectedTuningId) ?? PRESET_TUNINGS[0],
	)

	function selectTuning(id: string) {
		config.value = { ...config.value, selectedTuningId: id }
	}

	function deleteCustomTuning(id: string) {
		config.value = {
			...config.value,
			customTunings: config.value.customTunings.filter((t) => t.id !== id),
			selectedTuningId:
				config.value.selectedTuningId === id ? 'std6' : config.value.selectedTuningId,
		}
	}

	return {
		config: readonly(config),
		allTunings,
		activeTuning,
		selectTuning,
		deleteCustomTuning,
	}
}
