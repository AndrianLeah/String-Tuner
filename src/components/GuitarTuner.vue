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

<style scoped>
/* ── Layout wrapper ─────────────────────────────────────────────────────── */
.tuner {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-height: 100dvh;
	gap: 0.9rem;
	color: var(--text-primary);
	font-family: 'Elms Sans', system-ui, sans-serif;
	box-sizing: border-box;
	width: 100%;
}

/* ── Top bar ─────────────────────────────────────────────────────────────── */
.top-bar {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	justify-content: center;
	width: 100%;
}

/* ── Central glass card — fullscreen by default ─────────────────────────── */
/* border-radius and max-width are added only in the floating-card query.    */
.center-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.9rem;
	width: 100%;
	min-height: 100dvh;
	justify-content: center;
	padding: max(env(safe-area-inset-top), 1.25rem) max(env(safe-area-inset-right), 1.5rem)
		max(env(safe-area-inset-bottom), 1.5rem) max(env(safe-area-inset-left), 1.5rem);
	background: var(--card-bg);
	backdrop-filter: var(--card-blur);
	-webkit-backdrop-filter: var(--card-blur);
	box-shadow: var(--card-shadow);
}

/* ── Ring section ────────────────────────────────────────────────────────── */
.ring-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.5rem;
}

/* ── Controls section (meter + button stacked) ───────────────────────────── */
.controls-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.75rem;
	width: 100%;
	max-width: 320px;
}

/* ── Tuning bar ──────────────────────────────────────────────────────────── */
.tuning-bar {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	background: rgba(255, 255, 255, 0.07);
	border: 1px solid rgba(255, 255, 255, 0.1);
	border-radius: 50px;
	padding: 0.45rem 1.1rem;
	cursor: pointer;
	color: var(--text-secondary);
	transition:
		background 0.15s,
		border-color 0.15s,
		color 0.15s;
}
.tuning-bar:hover {
	background: rgba(255, 255, 255, 0.13);
	border-color: rgba(255, 255, 255, 0.2);
	color: var(--text-primary);
}
.tuning-name {
	font-size: 0.9rem;
	font-weight: 500;
}
.tuning-strings {
	font-size: 0.72rem;
	color: var(--text-faint);
}
.tuning-arrow {
	font-size: 1rem;
	color: var(--text-faint);
	margin-left: auto;
}

/* ── Settings button ────────────────────────────────────────────────────── */
.settings-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2rem;
	height: 2rem;
	border-radius: 50%;
	border: 1px solid rgba(255, 255, 255, 0.1);
	background: rgba(255, 255, 255, 0.07);
	color: var(--text-secondary);
	font-size: 1rem;
	cursor: pointer;
	flex-shrink: 0;
	transition:
		background 0.15s,
		border-color 0.15s,
		color 0.15s;
}
.settings-btn:hover {
	background: rgba(255, 255, 255, 0.14);
	border-color: rgba(255, 255, 255, 0.22);
	color: var(--text-primary);
}

/* ── All tuned ───────────────────────────────────────────────────────────── */
.all-tuned {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.5rem;
	padding: 2rem 0;
}
.all-tuned-icon {
	font-size: 4rem;
	color: var(--green);
	line-height: 1;
}
.all-tuned-text {
	font-size: 1.1rem;
	font-weight: 500;
	color: var(--green);
	letter-spacing: 0.05em;
}

/* ── Info row ────────────────────────────────────────────────────────────── */
.info-row {
	display: flex;
	gap: 1rem;
	align-items: center;
}
.string-label {
	font-size: 0.8rem;
	color: var(--text-faint);
}
.frequency {
	font-size: 0.8rem;
	color: var(--text-dim);
	min-width: 70px;
	text-align: right;
}

/* ── Hint ────────────────────────────────────────────────────────────────── */
.hint {
	font-size: 0.95rem;
	font-weight: 600;
	min-height: 1.4rem;
	letter-spacing: 0.03em;
	transition: color 0.15s;
	color: var(--text-dim);
}
.hint.too-high {
	color: var(--red);
}
.hint.too-low {
	color: var(--blue);
}
.hint.in-range {
	color: var(--green);
}

/* ── Error ───────────────────────────────────────────────────────────────── */
.error {
	color: var(--red);
	font-size: 0.8rem;
	text-align: center;
	margin: 0;
}

/* ── Start/Stop ──────────────────────────────────────────────────────────── */
.toggle-btn {
	margin-top: 0.5rem;
	padding: 0.9rem 3.5rem;
	font-size: 1rem;
	font-weight: 600;
	letter-spacing: 0.1em;
	border: none;
	border-radius: 50px;
	cursor: pointer;
	background: var(--accent-dim);
	color: var(--accent);
	transition:
		background 0.2s,
		transform 0.1s;
}
.toggle-btn:active {
	transform: scale(0.97);
}
.toggle-btn.active {
	background: var(--red-stop);
	color: #fff;
}

/* ── Sheet transition ────────────────────────────────────────────────────── */
.sheet-enter-active,
.sheet-leave-active {
	transition:
		opacity 0.2s,
		transform 0.25s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-enter-from,
.sheet-leave-to {
	opacity: 0;
	transform: translateY(100%);
}

/* ── Fullscreen: when either dimension is too small for a floating card ───── */
/* Fires when width < 640 OR height < 640 — already the default above.       */
/* This block resets .tuner layout for the fullscreen case.                  */
@media (max-width: 639px), (max-height: 639px) {
	.tuner {
		gap: 0;
		align-items: stretch;
		justify-content: stretch;
	}
}

/* ── Landscape short: two-column grid ───────────────────────────────────── */
@media (orientation: landscape) and (max-height: 639px) {
	.center-card {
		display: grid;
		grid-template-columns: 1fr 1fr;
		grid-template-rows: auto 1fr auto;
		grid-template-areas:
			'topbar   topbar'
			'chips    ring'
			'controls ring';
		align-items: start;
		padding: 0.75rem 1.25rem;
		gap: 0.4rem 1.5rem;
		justify-content: unset;
	}
	.top-bar {
		grid-area: topbar;
	}
	.strings-display {
		grid-area: chips;
		justify-content: flex-start;
	}
	.ring-section {
		grid-area: ring;
		grid-row: 2 / 4;
		align-self: center;
		justify-self: center;
	}
	.controls-section {
		grid-area: controls;
		max-width: none;
		align-self: end;
	}
	.all-tuned {
		grid-column: 1 / -1;
		padding: 1rem 0;
	}
	.ring-wrapper {
		width: 140px;
		height: 140px;
	}
	:deep(.note-name) {
		font-size: 2.75rem;
	}
	:deep(.note-octave) {
		font-size: 1.1rem;
	}
	.toggle-btn {
		padding: 0.7rem 2.5rem;
		font-size: 0.9rem;
	}
}

/* ── Floating card: both dimensions ≥640px ──────────────────────────────── */
@media (min-width: 640px) and (min-height: 640px) {
	.tuner {
		padding: max(env(safe-area-inset-top), 1rem) max(env(safe-area-inset-right), 1.25rem)
			max(env(safe-area-inset-bottom), 1.5rem) max(env(safe-area-inset-left), 1.25rem);
	}
	.center-card {
		min-height: auto;
		max-width: 500px;
		border-radius: 28px;
		padding: 2rem 2.5rem 2.25rem;
		gap: 1.25rem;
	}
	.controls-section {
		max-width: 380px;
	}
	.tuning-name {
		font-size: 1.05rem;
	}
	.tuning-strings {
		font-size: 0.82rem;
	}
	.string-label,
	.frequency {
		font-size: 0.92rem;
	}
	.all-tuned-text {
		font-size: 1.25rem;
	}
}
</style>
