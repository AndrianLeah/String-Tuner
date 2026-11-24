<script setup lang="ts">
import { computed } from 'vue'
import { ICONS, type IconName } from './icons'

const props = withDefaults(
	defineProps<{
		name: IconName
		/** Rendered size in px (24 is the grid the icons are drawn on) */
		size?: number | string
		/** Line width in grid units, for an icon drawn much larger or smaller than 24 px */
		strokeWidth?: number
		/** Accessible name; without it the icon is decorative and hidden from screen readers */
		label?: string
		/** Draw the strokes in when the icon appears (a check that writes itself) */
		draw?: boolean
	}>(),
	{ size: 24, strokeWidth: undefined, label: undefined },
)

const icon = computed(() => ICONS[props.name])
</script>

<template>
	<svg
		class="ui-icon"
		:width="size"
		:height="size"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		:stroke-width="strokeWidth ?? icon.stroke"
		stroke-linecap="round"
		stroke-linejoin="round"
		:role="label ? 'img' : undefined"
		:aria-label="label"
		:aria-hidden="label ? undefined : 'true'"
		focusable="false"
	>
		<path
			v-for="(d, i) in icon.paths"
			:key="i"
			:d="d"
			:pathLength="draw ? 1 : undefined"
			:class="{ 'ui-icon__draw': draw }"
		/>
	</svg>
</template>

<style scoped>
.ui-icon {
	flex: none;
	display: block;
}

.ui-icon__draw {
	stroke-dasharray: 1;
	animation: ui-draw var(--duration-slow) var(--ease-out) var(--ui-icon-draw-delay, 0ms) both;
}
</style>
