<script setup lang="ts">
import { computed } from 'vue'
import { UiIcon } from '../ui'

interface Props {
	stabilityProgress: number
	note: string
	octave: string
	/** 'idle' | 'in-tune' | 'off' */
	status: string
	/** Every string is in tune: the ring closes around a check mark */
	complete?: boolean
}

const props = defineProps<Props>()

// Drawn on a 260 grid (the phone ring of the design); the whole ring scales with its box
const CENTER = 130
const RING_R = 118
const ringCirc = 2 * Math.PI * RING_R
const progress = computed(() =>
	props.complete ? 1 : Math.min(1, Math.max(0, props.stabilityProgress)),
)
const ringDash = computed(() => `${progress.value * ringCirc} ${ringCirc}`)

// The bright "head" at the tip of the arc, like the dot of the app icon
const head = computed(() => {
	const angle = progress.value * 2 * Math.PI
	return { x: CENTER + RING_R * Math.sin(angle), y: CENTER - RING_R * Math.cos(angle) }
})
</script>

<template>
	<div class="ring-wrapper" :class="[status, { complete }]">
		<div class="ring-lens ui-material" />
		<svg class="ring-svg" viewBox="0 0 260 260" aria-hidden="true">
			<circle class="ring-track" :cx="CENTER" :cy="CENTER" :r="RING_R" />
		</svg>
		<svg v-if="progress > 0" class="ring-svg ring-glow" viewBox="0 0 260 260" aria-hidden="true">
			<circle
				class="ring-progress"
				:cx="CENTER"
				:cy="CENTER"
				:r="RING_R"
				:stroke-dasharray="ringDash"
				:transform="`rotate(-90 ${CENTER} ${CENTER})`"
			/>
			<circle class="ring-head" :cx="head.x" :cy="head.y" r="9" />
		</svg>
		<UiIcon v-if="complete" class="ring-check" name="check" size="51%" :stroke-width="2.15" />
		<div v-else class="note-display" :class="status">
			<span class="note-name">{{ note }}</span>
			<span class="note-octave">{{ octave }}</span>
		</div>
	</div>
</template>

<style scoped>
.ring-wrapper {
	position: relative;
	width: var(--ring-size, 260px);
	aspect-ratio: 1;
	display: grid;
	place-items: center;
	container-type: inline-size;
}

/* Content layer: a standard material lens, not glass */
.ring-lens {
	position: absolute;
	inset: 8.46%;
	border-radius: 50%;
}

.ring-svg {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	overflow: visible;
}

.ring-track,
.ring-progress {
	fill: none;
	stroke-width: 12;
}
.ring-track {
	stroke: var(--ring-track);
}
.ring-progress {
	stroke: var(--green);
	stroke-linecap: round;
}
.ring-head {
	fill: var(--green-dot);
}
.ring-glow {
	filter: var(--glow-green);
}

.note-display {
	position: relative;
	display: flex;
	align-items: baseline;
	gap: 0.77cqi;
	color: var(--note-idle);
	line-height: 1;
	transition: color var(--duration-fast);
}
.note-display.in-tune {
	color: var(--green);
}
.note-display.off {
	color: var(--warn);
}

.note-name {
	font-size: 43.08cqi;
	font-weight: var(--font-weight-extrabold);
	letter-spacing: -0.01em;
}
.note-octave {
	font-size: 13.08cqi;
	font-weight: var(--font-weight-semibold);
	opacity: 0.8;
}

.ring-check {
	position: relative;
	color: var(--green);
	filter: var(--glow-green);
}
</style>
