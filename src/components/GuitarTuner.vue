<script setup lang="ts">
import {
	ArrowDownwardOutlined,
	ArrowRightOutlined,
	ArrowUpwardOutlined,
	CheckCircle1Outlined,
	CheckOutlined,
	Gear1Outlined,
} from '@lineiconshq/free-icons'
import { Lineicons } from '@lineiconshq/vue-lineicons'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfig } from '../composables/useConfig'
import { useTuner } from '../composables/useTuner'
import { formatNote } from '../data/tunings'
import CentsMeter from './CentsMeter.vue'
import SettingsMenu from './SettingsMenu.vue'
import StringChips from './StringChips.vue'
import TunerRing from './TunerRing.vue'
import TuningSelector from './TuningSelector.vue'

const { t } = useI18n()
const { activeTuning } = useConfig()
const {
	isListening,
	frequency,
	lockedStringIndex,
	needleCents,
	hint,
	signalClarity,
	stabilityProgress,
	tunedStrings,
	allTuned,
	error,
	start,
	stop,
	selectString,
} = useTuner(activeTuning)

const selectorOpen = ref(false)
const settingsOpen = ref(false)

// Clamp needleCents (float, holds on signal loss) to ±50 → 0–100% for needle.
// Falls back to 50% (centre) only before the first valid reading.
const needlePercent = computed(() => {
	if (needleCents.value === null) return 50
	return Math.min(100, Math.max(0, ((needleCents.value + 50) / 100) * 100))
})

const lockedStr = computed(() => activeTuning.value.tuning[lockedStringIndex.value])

const noteDisplay = computed(() =>
	lockedStr.value ? formatNote(lockedStr.value.note, activeTuning.value.preferFlats) : '—',
)
const octaveDisplay = computed(() => String(lockedStr.value?.octave ?? ''))
const guitarStringNum = computed(() => activeTuning.value.tuning.length - lockedStringIndex.value)

const statusClass = computed(() => {
	if (!isListening.value || hint.value === null) return 'idle'
	if (hint.value === 'in-range') return 'in-tune'
	return 'off'
})
</script>

<template>
	<div class="tuner">
		<div class="center-card">
			<!-- Top bar: tuning selector + settings button -->
			<div class="top-bar">
				<button class="tuning-bar" @click="selectorOpen = true">
					<span class="tuning-name">{{ activeTuning.name }}</span>
					<span class="tuning-strings">{{ activeTuning.strings }} {{ t('tuner.strSuffix') }}</span>
					<span class="tuning-arrow icon"
						><Lineicons :icon="ArrowRightOutlined" color="currentColor"
					/></span>
				</button>
				<button class="settings-btn" :aria-label="t('settings.title')" @click="settingsOpen = true">
					<span class="icon"><Lineicons :icon="Gear1Outlined" color="currentColor" /></span>
				</button>
			</div>

			<!-- String chips -->
			<StringChips
				:tuning="activeTuning"
				:is-listening="isListening"
				:tuned-strings="tunedStrings"
				:locked-string-index="lockedStringIndex"
				@select="selectString"
			/>

			<!-- All-strings-tuned banner -->
			<div v-if="allTuned" class="all-tuned">
				<div class="all-tuned-icon">
					<span class="icon"><Lineicons :icon="CheckCircle1Outlined" color="currentColor" /></span>
				</div>
				<div class="all-tuned-text">{{ t('tuner.allTuned') }}</div>
			</div>

			<!-- Active tuning view -->
			<template v-else>
				<!-- Note + stability ring + info -->
				<div class="ring-section">
					<TunerRing
						:stability-progress="stabilityProgress"
						:note="noteDisplay"
						:octave="octaveDisplay"
						:status="statusClass"
					/>

					<!-- String number + Hz -->
					<div class="info-row">
						<span class="string-label">{{ t('tuner.string', { n: guitarStringNum }) }}</span>
						<span class="frequency">{{ frequency !== null ? `${frequency} Hz` : '—' }}</span>
					</div>

					<!-- Direction hint -->
					<div class="hint" :class="hint ?? 'idle'">
						<template v-if="hint === 'too-high'"
							><span class="icon"
								><Lineicons :icon="ArrowDownwardOutlined" color="currentColor"
							/></span>
							{{ t('tuner.hintTooHigh') }}</template
						>
						<template v-else-if="hint === 'too-low'"
							><span class="icon"
								><Lineicons :icon="ArrowUpwardOutlined" color="currentColor"
							/></span>
							{{ t('tuner.hintTooLow') }}</template
						>
						<template v-else-if="hint === 'in-range'"
							><span class="icon"><Lineicons :icon="CheckOutlined" color="currentColor" /></span>
							{{ t('tuner.hintInRange') }}</template
						>
						<template v-else>&nbsp;</template>
					</div>
				</div>

				<!-- Meter + button -->
				<div class="controls-section">
					<CentsMeter
						:needle-percent="needlePercent"
						:status="statusClass"
						:clarity="signalClarity"
					/>

					<p v-if="error" class="error">{{ error }}</p>

					<button
						class="toggle-btn"
						:class="{ active: isListening }"
						@click="isListening ? stop() : start()"
					>
						{{ isListening ? t('tuner.stop') : t('tuner.start') }}
					</button>
				</div>
			</template>
		</div>
	</div>

	<Teleport to="body">
		<Transition name="sheet">
			<TuningSelector v-if="selectorOpen" @close="selectorOpen = false" />
		</Transition>
		<Transition name="sheet">
			<SettingsMenu v-if="settingsOpen" @close="settingsOpen = false" />
		</Transition>
	</Teleport>
</template>
