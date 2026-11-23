<script setup lang="ts">
import { ACCEPT_CENTS } from '../tuner/engine'

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
</script>

<template>
	<div class="meter-wrapper">
		<div class="meter-track">
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
		<div class="meter-labels">
			<span>-50¢</span>
			<span>0</span>
			<span>+50¢</span>
		</div>
	</div>
</template>

<style scoped>
.meter-wrapper {
	width: 100%;
	max-width: 300px;
}
.meter-track {
	position: relative;
	height: 6px;
	background: var(--surface-raised);
	border-radius: 3px;
	overflow: visible;
}
.meter-range {
	position: absolute;
	top: -2px;
	height: 10px;
	background: color-mix(in srgb, var(--green) 20%, transparent);
	border: 1px solid color-mix(in srgb, var(--green) 35%, transparent);
	border-radius: 3px;
	pointer-events: none;
}
.meter-center {
	position: absolute;
	left: 50%;
	top: -5px;
	transform: translateX(-50%);
	width: 2px;
	height: 16px;
	background: var(--meter-center);
	border-radius: 1px;
}
.meter-needle {
	position: absolute;
	top: -7px;
	width: 4px;
	height: 20px;
	background: var(--needle);
	border-radius: 2px;
	transform: translateX(-50%);
	transition:
		left 0.08s ease-out,
		background 0.2s;
}
.meter-needle.in-tune {
	background: var(--green);
}
.meter-needle.off {
	background: var(--red);
}

.meter-labels {
	display: flex;
	justify-content: space-between;
	margin-top: 7px;
	font-size: 0.62rem;
	color: var(--meter-labels);
}

/* ── Floating card breakpoint ────────────────────────────────────────────── */
@media (min-width: 640px) and (min-height: 640px) {
	.meter-wrapper {
		max-width: 380px;
	}
	.meter-labels {
		font-size: 0.72rem;
		margin-top: 9px;
	}
}
</style>
