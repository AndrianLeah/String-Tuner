<script setup lang="ts">
import { computed } from 'vue'

interface Props {
	stabilityProgress: number
	note: string
	octave: string
	/** 'idle' | 'in-tune' | 'off' */
	status: string
}

const props = defineProps<Props>()

const RING_R = 72
const ringCirc = computed(() => 2 * Math.PI * RING_R)
const ringDash = computed(() => props.stabilityProgress * ringCirc.value)
const ringGap = computed(() => ringCirc.value - ringDash.value)
</script>

<template>
	<div class="ring-wrapper">
		<svg class="ring-svg" viewBox="0 0 180 180" aria-hidden="true">
			<circle class="ring-track" cx="90" cy="90" :r="RING_R" fill="none" stroke-width="6" />
			<circle
				class="ring-progress"
				cx="90"
				cy="90"
				:r="RING_R"
				fill="none"
				stroke-width="6"
				stroke-linecap="round"
				:stroke-dasharray="ringDash + ' ' + ringGap"
				transform="rotate(-90 90 90)"
			/>
		</svg>
		<div class="note-display" :class="status">
			<span class="note-name">{{ note }}</span>
			<span class="note-octave">{{ octave }}</span>
		</div>
	</div>
</template>
