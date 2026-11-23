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

<style scoped>
.ring-wrapper {
	position: relative;
	width: 190px;
	height: 190px;
	display: flex;
	align-items: center;
	justify-content: center;
}
.ring-svg {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}
.ring-track {
	stroke: var(--surface-raised);
}
.ring-progress {
	stroke: var(--green);
}

.note-display {
	position: relative;
	z-index: 1;
	display: flex;
	align-items: baseline;
	gap: 0.15rem;
	color: var(--note-idle);
	transition: color 0.2s;
}
.note-display.in-tune {
	color: var(--green);
}
.note-display.off {
	color: var(--red);
}

.note-name {
	font-size: 4rem;
	font-weight: 700;
	line-height: 1;
}
.note-octave {
	font-size: 1.5rem;
	font-weight: 300;
}

@media (min-width: 640px) and (min-height: 640px) {
	.ring-wrapper {
		width: 230px;
		height: 230px;
	}
	.note-name {
		font-size: 5rem;
	}
	.note-octave {
		font-size: 1.8rem;
	}
}
</style>
