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
