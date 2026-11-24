<script setup lang="ts">
import { computed } from 'vue'
import { formatNote, type TuningPreset } from '../data/tunings'
import { UiIcon, UiSurface } from '../ui'

interface Props {
	tuning: TuningPreset
	isListening: boolean
	tunedStrings: ReadonlySet<number>
	lockedStringIndex: number
}

const props = defineProps<Props>()
const emit = defineEmits<{ select: [index: number] }>()

// Display thinnest-first (High E at left) — reversed vs. tuning array (Low E = index 0)
const displayStrings = computed(() => [...props.tuning.tuning].reverse())

// Map display position index → tuning array index
function arrayIdx(di: number): number {
	return props.tuning.tuning.length - 1 - di
}

// The string being tuned. Once every string is in tune the last one stays locked: show it as tuned
function isLocked(di: number): boolean {
	const index = arrayIdx(di)
	return props.isListening && props.lockedStringIndex === index && !props.tunedStrings.has(index)
}

// The locked outline is one cursor that slides from string to string
const cursorIndex = computed(() => displayStrings.value.findIndex((_, di) => isLocked(di)))
</script>

<template>
	<!-- One glass track holds every chip: no glass on glass -->
	<UiSurface
		class="strings-display"
		material="glass"
		radius="xl"
		:style="{ '--count': displayStrings.length }"
	>
		<!-- The index sits on the cursor itself, so a cursor fading out stays where it was -->
		<Transition name="ui-fade">
			<span
				v-if="cursorIndex >= 0"
				class="chip-cursor"
				:style="{ '--index': cursorIndex }"
				aria-hidden="true"
			/>
		</Transition>
		<button
			v-for="(str, di) in displayStrings"
			:key="di"
			type="button"
			class="string-chip ui-pressable"
			:class="{ tuned: tunedStrings.has(arrayIdx(di)), locked: isLocked(di) }"
			:aria-pressed="isLocked(di)"
			:disabled="!isListening"
			@click="emit('select', arrayIdx(di))"
		>
			<!-- String numbers count from the thinnest (1), which is shown first -->
			<span class="chip-num">{{ di + 1 }}</span>
			<span class="chip-note">{{ formatNote(str.note, tuning.preferFlats) }}</span>
			<span class="chip-octave">{{ str.octave }}</span>
			<!-- Tuned is said with a check too, not by colour alone -->
			<Transition name="ui-pop">
				<UiIcon
					v-if="tunedStrings.has(arrayIdx(di))"
					class="chip-check"
					name="check"
					:size="14"
					:stroke-width="3.4"
				/>
			</Transition>
		</button>
	</UiSurface>
</template>

<style scoped>
.strings-display {
	display: flex;
	gap: var(--space-1);
	padding: var(--space-1);
}

.string-chip {
	flex: 1 1 0;
	min-width: 0;
	height: var(--chip-height, 68px);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 0;
	border: none;
	border-radius: var(--radius-lg);
	background: transparent;
	color: var(--text-primary);
	font-variant-numeric: tabular-nums;
	transition:
		background-color var(--duration-slow) var(--ease-out),
		transform var(--duration-base) var(--ease-spring),
		opacity var(--duration-base);
}
.string-chip > span {
	transition: color var(--duration-base) var(--ease-out);
}

/* The string being tuned: accent tint and outline, sliding from chip to chip. The chips share
   the width equally, so its place follows from the index alone */
.chip-cursor {
	position: absolute;
	top: var(--space-1);
	bottom: var(--space-1);
	left: var(--space-1);
	width: calc((100% - (var(--count) + 1) * var(--space-1)) / var(--count));
	border-radius: var(--radius-lg);
	background: var(--accent-tint);
	box-shadow: inset 0 0 0 1.5px var(--accent);
	transform: translateX(calc(var(--index) * (100% + var(--space-1))));
	transition:
		transform var(--duration-slow) var(--ease-spring),
		opacity var(--duration-base);
	pointer-events: none;
}

.chip-num,
.chip-octave {
	color: var(--text-tertiary);
	font-size: var(--font-size-caption-2);
	font-weight: var(--font-weight-semibold);
	line-height: 15px;
}

.chip-note {
	font-size: 22px;
	font-weight: var(--font-weight-bold);
	line-height: 28px;
}

.chip-check {
	position: absolute;
	top: 3px;
	right: 3px;
}

.string-chip.locked .chip-num,
.string-chip.locked .chip-octave {
	color: var(--accent);
}

/* A string already in tune: green, with a check */
.string-chip.tuned {
	background: var(--green-tint);
}
.string-chip.tuned > * {
	color: var(--green);
}
</style>
