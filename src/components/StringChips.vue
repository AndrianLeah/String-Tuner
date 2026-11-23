<script setup lang="ts">
import { computed } from 'vue'
import { formatNote, type TuningPreset } from '../data/tunings'

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
</script>

<template>
	<div class="strings-display">
		<button
			v-for="(str, di) in displayStrings"
			:key="di"
			class="string-chip"
			:class="{
				tuned: tunedStrings.has(arrayIdx(di)),
				locked: isListening && lockedStringIndex === arrayIdx(di),
			}"
			:disabled="!isListening"
			@click="emit('select', arrayIdx(di))"
		>
			<span class="chip-num">{{ tuning.strings - di }}</span>
			<span class="chip-note">{{ formatNote(str.note, tuning.preferFlats) }}</span>
			<span class="chip-octave">{{ str.octave }}</span>
		</button>
	</div>
</template>

<style scoped>
.strings-display {
	display: flex;
	gap: 0.4rem;
	flex-wrap: wrap;
	justify-content: center;
}

.string-chip {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 0.35rem 0.5rem;
	border-radius: 9px;
	background: var(--surface-low);
	border: 2px solid var(--border-chip);
	cursor: pointer;
	min-width: 34px;
	transition:
		border-color 0.15s,
		background 0.15s,
		transform 0.1s;
}
.string-chip:not(:disabled):hover {
	background: var(--surface-raised);
	border-color: var(--text-muted);
}
.string-chip:not(:disabled):active {
	transform: scale(0.93);
}
.string-chip:disabled {
	cursor: default;
}

.string-chip.tuned {
	background: color-mix(in srgb, var(--green) 15%, transparent);
	border-color: var(--green);
}
.string-chip.locked {
	border-color: var(--needle);
	background: var(--surface-raised);
}
.string-chip.tuned.locked {
	background: color-mix(in srgb, var(--green) 20%, transparent);
	border-color: var(--green-bright);
}
.string-chip.pinned {
	border-color: var(--amber) !important;
	background: color-mix(in srgb, var(--amber) 12%, transparent) !important;
}
.string-chip.pinned .chip-note {
	color: var(--amber) !important;
}
.string-chip.pinned .chip-num {
	color: var(--amber-dark) !important;
}
/* Ghost detector "searching" state — dimmed pulse while confidence builds */
.string-chip.searching {
	border-color: var(--text-muted);
	background: var(--surface-raised);
	opacity: 0.65;
	animation: chip-searching 0.9s ease-in-out infinite alternate;
}
.string-chip.searching .chip-note {
	color: var(--text-secondary);
}
@keyframes chip-searching {
	from {
		opacity: 0.45;
	}
	to {
		opacity: 0.8;
	}
}

.chip-num {
	font-size: 0.6rem;
	color: var(--text-faint);
	line-height: 1;
}
.chip-note {
	font-size: 0.85rem;
	font-weight: 700;
	color: var(--chip-note);
	line-height: 1.3;
}
.chip-octave {
	font-size: 0.58rem;
	color: var(--chip-octave);
	line-height: 1;
}

.string-chip.tuned .chip-note {
	color: var(--green);
}
.string-chip.tuned .chip-num {
	color: var(--green-dark);
}
.string-chip.locked .chip-note {
	color: var(--needle);
}
.string-chip.locked .chip-num {
	color: var(--text-secondary);
}

/* ── Floating card breakpoint ────────────────────────────────────────────── */
@media (min-width: 640px) and (min-height: 640px) {
	.string-chip {
		min-width: 40px;
		padding: 0.45rem 0.65rem;
	}
	.chip-num {
		font-size: 0.68rem;
	}
	.chip-note {
		font-size: 1rem;
	}
	.chip-octave {
		font-size: 0.65rem;
	}
}
</style>
