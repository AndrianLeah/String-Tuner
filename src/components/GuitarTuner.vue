<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfig } from '../composables/useConfig'
import { useTuner } from '../composables/useTuner'
import { formatNote } from '../data/tunings'
import { UiButton, UiIconButton, UiStatusPill, UiSurface, type IconName } from '../ui'
import AppBackground from './AppBackground.vue'
import CentsMeter from './CentsMeter.vue'
import SettingsMenu from './SettingsMenu.vue'
import StringChips from './StringChips.vue'
import TunerRing from './TunerRing.vue'
import TuningPill from './TuningPill.vue'
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

// Start waits for the microphone permission: show it as busy meanwhile
const starting = ref(false)
async function toggle() {
	if (isListening.value) return stop()
	starting.value = true
	try {
		await start()
	} finally {
		starting.value = false
	}
}

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

// The direction hint: an arrow and a word, orange when off, green when in range
const HINTS: Record<string, { tone: 'success' | 'warning'; icon: IconName; text: string }> = {
	'too-high': { tone: 'warning', icon: 'arrow-down', text: 'tuner.hintTooHigh' },
	'too-low': { tone: 'warning', icon: 'arrow-up', text: 'tuner.hintTooLow' },
	'in-range': { tone: 'success', icon: 'check', text: 'tuner.hintInRange' },
}
const hintPill = computed(() => (hint.value ? HINTS[hint.value] : undefined))
</script>

<template>
	<AppBackground :celebrate="allTuned" />

	<div class="tuner" :class="{ 'is-complete': allTuned }">
		<UiSurface as="main" class="tuner-card" material="thin" radius="sheet">
			<!-- Top bar: tuning + settings -->
			<header class="top-bar">
				<TuningPill :tuning="activeTuning" @click="selectorOpen = true" />
				<UiIconButton icon="gear" :label="t('settings.title')" @click="settingsOpen = true" />
			</header>

			<StringChips
				class="chips"
				:tuning="activeTuning"
				:is-listening="isListening"
				:tuned-strings="tunedStrings"
				:locked-string-index="lockedStringIndex"
				@select="selectString"
			/>

			<!-- Note, stability ring, string and frequency, direction -->
			<section class="ring-section">
				<TunerRing
					:stability-progress="stabilityProgress"
					:note="noteDisplay"
					:octave="octaveDisplay"
					:status="statusClass"
					:complete="allTuned"
				/>

				<!-- The reading gives way to the final message -->
				<Transition name="ui-swap" mode="out-in">
					<p v-if="allTuned" class="all-tuned" role="status">{{ t('tuner.allTuned') }}</p>
					<div v-else class="readout">
						<p class="info-row">
							<span class="string-label">{{ t('tuner.string', { n: guitarStringNum }) }}</span>
							<span class="info-sep" aria-hidden="true" />
							<span class="frequency">{{
								frequency !== null ? `${frequency.toFixed(1)} Hz` : '—'
							}}</span>
						</p>
						<UiStatusPill
							class="hint"
							:tone="hintPill?.tone"
							:icon="hintPill?.icon"
							:hidden="!hintPill"
						>
							{{ hintPill ? t(hintPill.text) : '' }}
						</UiStatusPill>
					</div>
				</Transition>
			</section>

			<!-- Meter + Start/Stop, near the thumb -->
			<Transition name="ui-fade">
				<section v-if="!allTuned" class="controls">
					<CentsMeter
						:needle-percent="needlePercent"
						:status="statusClass"
						:clarity="signalClarity"
					/>

					<p v-if="error" class="error" role="alert">{{ error }}</p>

					<UiButton
						:variant="isListening ? 'glass' : 'primary'"
						:loading="starting"
						block
						@click="toggle"
					>
						{{ starting ? t('tuner.starting') : isListening ? t('tuner.stop') : t('tuner.start') }}
					</UiButton>
				</section>
			</Transition>
		</UiSurface>
	</div>

	<Teleport to="body">
		<Transition name="ui-sheet">
			<TuningSelector v-if="selectorOpen" @close="selectorOpen = false" />
		</Transition>
		<Transition name="ui-sheet">
			<SettingsMenu v-if="settingsOpen" @close="settingsOpen = false" />
		</Transition>
	</Teleport>
</template>

<style scoped>
/*
 * Layouts (see mockup/README.md):
 *   phone portrait    one column, controls at the bottom near the thumb
 *   phone landscape   controls on the left, the ring on the right
 *   tablet portrait   a card of material, one column
 *   tablet landscape  a wide card: the ring on the left, chips and controls on the right
 *   desktop           as tablet landscape, larger
 */

/*
 * Components are sized through their tokens, never restyled here:
 *   --ring-size (TunerRing), --chip-height (StringChips),
 *   --status-pill-height and --status-pill-font-size (UiStatusPill)
 */

/* ── Phone portrait (default) ───────────────────────────────────────────── */
.tuner {
	--ring-size: clamp(
		160px,
		min(
			100vw - 120px,
			100dvh - 470px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)
		),
		260px
	);
	flex: 1;
	display: flex;
	justify-content: center;
	min-height: 100dvh;
	padding: calc(env(safe-area-inset-top, 0px) + var(--space-4))
		calc(env(safe-area-inset-right, 0px) + var(--space-5))
		max(env(safe-area-inset-bottom, 0px), var(--space-5))
		calc(env(safe-area-inset-left, 0px) + var(--space-5));
}

.tuner-card {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	gap: var(--space-4);
	width: 100%;
	max-width: 480px;
}

/* On a phone the card is the screen itself: no material of its own */
@media (max-width: 639px), (max-height: 639px) {
	.tuner-card {
		background: none;
		border-color: transparent;
		border-radius: 0;
		-webkit-backdrop-filter: none;
		backdrop-filter: none;
	}
}

.top-bar {
	grid-area: top;
	display: flex;
	align-items: center;
	gap: var(--space-3);
}

.chips {
	grid-area: chips;
}

.ring-section {
	grid-area: ring;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--space-3);
}

.readout {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: inherit;
}

.controls {
	grid-area: controls;
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
}

.info-row {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	font-size: var(--font-size-subhead);
	line-height: 20px;
	font-variant-numeric: tabular-nums;
}
.string-label {
	color: var(--text-secondary);
	font-weight: var(--font-weight-semibold);
}
.info-sep {
	width: 4px;
	height: 4px;
	border-radius: 50%;
	background: var(--text-tertiary);
}
.frequency {
	color: var(--text-tertiary);
	font-weight: var(--font-weight-medium);
}

.all-tuned {
	color: var(--green);
	font-size: var(--font-size-title-2);
	font-weight: var(--font-weight-bold);
	text-align: center;
}

.error {
	color: var(--error);
	font-size: var(--font-size-footnote);
	font-weight: var(--font-weight-semibold);
	text-align: center;
}

/* The screen comes in piece by piece, top to bottom */
.tuner-card > * {
	animation: ui-rise var(--duration-slow) var(--ease-out) both;
}
.tuner-card > :nth-child(2) {
	animation-delay: 50ms;
}
.tuner-card > :nth-child(3) {
	animation-delay: 100ms;
}
.tuner-card > :nth-child(4) {
	animation-delay: 150ms;
}

/* All in tune: the ring and the message take the space of the controls */
.is-complete .tuner-card {
	justify-content: flex-start;
}
.is-complete .ring-section {
	flex: 1;
	justify-content: center;
	gap: var(--space-6);
}

/* ── Phone landscape ────────────────────────────────────────────────────── */
@media (orientation: landscape) and (max-height: 639px) {
	.tuner {
		--ring-size: clamp(130px, calc(100dvh - 160px), 220px);
		padding: max(env(safe-area-inset-top, 0px), var(--space-4))
			max(env(safe-area-inset-right, 0px), var(--space-8))
			max(env(safe-area-inset-bottom, 0px), var(--space-5))
			max(env(safe-area-inset-left, 0px), var(--space-8));
	}
	.tuner-card {
		display: grid;
		grid-template-columns: minmax(0, 430px) minmax(0, 1fr);
		grid-template-rows: auto auto auto;
		grid-template-areas:
			'top ring'
			'chips ring'
			'controls ring';
		align-content: space-between;
		column-gap: var(--space-8);
		row-gap: var(--space-4);
		max-width: 800px;
	}
	.ring-section {
		align-self: center;
	}
	.is-complete .tuner-card {
		grid-template-areas:
			'top ring'
			'chips ring';
		align-content: start;
	}
	.is-complete .ring-section {
		gap: var(--space-3);
	}
	.all-tuned {
		font-size: var(--font-size-headline);
	}
	.tuner-card {
		--chip-height: 66px;
	}
}

/* ── Tablet and desktop: a centred card of material ─────────────────────── */
@media (min-width: 640px) and (min-height: 640px) {
	.tuner {
		align-items: center;
		padding: max(env(safe-area-inset-top, 0px), var(--space-10))
			max(env(safe-area-inset-right, 0px), var(--space-10))
			max(env(safe-area-inset-bottom, 0px), var(--space-10))
			max(env(safe-area-inset-left, 0px), var(--space-10));
	}
	.tuner-card {
		--chip-height: 84px;
		justify-content: flex-start;
		gap: var(--space-8);
		max-width: 560px;
		padding: var(--space-8);
	}
	.ring-section {
		--status-pill-height: 50px;
		--status-pill-font-size: 20px;
		gap: var(--space-4);
	}
	.info-row {
		font-size: 19px;
		line-height: 26px;
	}
}

/* Tablet portrait */
@media (min-width: 640px) and (min-height: 640px) and (orientation: portrait) {
	.tuner {
		--ring-size: clamp(220px, calc(100dvh - 700px), 325px);
	}
}

/* Tablet landscape and desktop: two zones */
@media (min-width: 640px) and (min-height: 640px) and (orientation: landscape) {
	.tuner {
		--ring-size: clamp(220px, calc(100dvh - 400px), 351px);
	}
	.tuner-card {
		display: grid;
		grid-template-columns: var(--ring-size) minmax(0, 1fr);
		grid-template-rows: auto 1fr auto auto 1fr;
		grid-template-areas:
			'top top'
			'ring .'
			'ring chips'
			'ring controls'
			'ring .';
		column-gap: var(--space-12);
		row-gap: 0;
		max-width: 1000px;
	}
	.top-bar {
		margin-bottom: var(--space-8);
	}
	.ring-section {
		align-self: center;
	}
	.chips {
		margin-bottom: 28px;
	}
	.is-complete .tuner-card {
		grid-template-rows: auto 1fr auto 1fr;
		grid-template-areas:
			'top top'
			'ring .'
			'ring chips'
			'ring .';
	}
}

@media (min-width: 1280px) and (min-height: 760px) and (orientation: landscape) {
	.tuner {
		--ring-size: clamp(260px, calc(100dvh - 420px), 404px);
	}
	.tuner-card {
		--chip-height: 96px;
		max-width: 1120px;
		padding: var(--space-10);
	}
	.chips {
		margin-bottom: var(--space-8);
	}
	.ring-section {
		--status-pill-height: 62px;
		--status-pill-font-size: 24px;
	}
	.info-row {
		font-size: 23px;
		line-height: 32px;
	}
}
</style>
