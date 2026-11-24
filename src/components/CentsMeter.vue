<script setup lang="ts">
import { ACCEPT_CENTS } from '../tuner/engine'
import { UiSurface } from '../ui'

interface Props {
	needlePercent: number
	/** 'idle' | 'in-tune' | 'off' */
	status: string
	/** 0–1 pitch confidence — fades the needle when signal is uncertain */
	clarity?: number
}

const props = defineProps<Props>()

// The track spans −50¢…+50¢, so 1¢ is 1% of it. The green band is the engine's in-tune window.
const acceptBand = { left: `${50 - ACCEPT_CENTS}%`, width: `${2 * ACCEPT_CENTS}%` }

// A tick every 10¢, except the centre, which has its own mark
const TICKS = [10, 20, 30, 40, 60, 70, 80, 90]
</script>

<template>
	<UiSurface class="meter-wrapper" material="thin" radius="2xl">
		<div class="meter-track">
			<span v-for="tick in TICKS" :key="tick" class="meter-tick" :style="{ left: `${tick}%` }" />
			<div class="meter-rail" />
			<!-- in-tune band: ±ACCEPT_CENTS around the centre -->
			<div class="meter-range" :style="acceptBand" />
			<!-- centre marker -->
			<div class="meter-center" />
			<!-- needle -->
			<div
				class="meter-needle"
				:class="status"
				:style="{
					left: needlePercent + '%',
					opacity: Math.max(0.15, props.clarity ?? 1),
				}"
			/>
		</div>
		<div class="meter-labels" aria-hidden="true">
			<span>−50¢</span>
			<span>0</span>
			<span>+50¢</span>
		</div>
	</UiSurface>
</template>

<style scoped>
.meter-wrapper {
	width: 100%;
	padding: 14px var(--space-6) var(--space-3);
}

/* 38 px tall: the needle's height; the rail runs through its middle */
.meter-track {
	position: relative;
	height: 38px;
}

.meter-tick {
	position: absolute;
	top: 5px;
	width: 1.5px;
	height: 6px;
	border-radius: 1px;
	background: var(--meter-tick);
	transform: translateX(-50%);
}

.meter-rail {
	position: absolute;
	top: 16px;
	inset-inline: 0;
	height: 6px;
	border-radius: 3px;
	background: var(--meter-track);
}

.meter-range {
	position: absolute;
	top: 12px;
	height: 14px;
	border-radius: 6px;
	background: var(--green-tint);
	box-shadow: inset 0 0 0 1px var(--green-glow);
	pointer-events: none;
}

.meter-center {
	position: absolute;
	left: 50%;
	top: 7px;
	width: 1.5px;
	height: 24px;
	border-radius: 1px;
	background: var(--meter-center);
	transform: translateX(-50%);
}

.meter-needle {
	position: absolute;
	top: 0;
	width: 6px;
	height: 38px;
	border-radius: 3px;
	background: var(--text-tertiary);
	transform: translateX(-50%);
	transition:
		left 0.08s ease-out,
		background var(--duration-fast);
}
.meter-needle.in-tune {
	background: var(--green);
	filter: var(--glow-green);
}
.meter-needle.off {
	background: var(--warn);
}

.meter-labels {
	display: flex;
	justify-content: space-between;
	margin-top: var(--space-0-5);
	color: var(--text-tertiary);
	font-size: var(--font-size-caption);
	font-weight: var(--font-weight-semibold);
	line-height: 18px;
	font-variant-numeric: tabular-nums;
}
</style>
