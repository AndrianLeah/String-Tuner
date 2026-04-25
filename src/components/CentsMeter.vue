<script setup lang="ts">
interface Props {
	needlePercent: number
	/** 'idle' | 'in-tune' | 'off' */
	status: string
	/** 0–1 pitch confidence — fades the needle when signal is uncertain */
	clarity?: number
}

const props = defineProps<Props>()
</script>

<template>
	<div class="meter-wrapper">
		<div class="meter-track">
			<!-- ±5¢ acceptance band: 45%–55% of track -->
			<div class="meter-range" />
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
