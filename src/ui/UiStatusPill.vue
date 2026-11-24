<script setup lang="ts">
import UiIcon from './UiIcon.vue'
import type { IconName } from './icons'

/**
 * A tinted capsule that states a condition: an icon and a short text, never colour alone.
 * `hidden` keeps its place in the layout so nothing jumps when it appears.
 * Component tokens: --status-pill-height (40px) and --status-pill-font-size (16px); the padding
 * and the icon follow the height.
 */
withDefaults(
	defineProps<{
		tone?: 'success' | 'warning' | 'neutral'
		icon?: IconName
		hidden?: boolean
	}>(),
	{ tone: 'neutral', icon: undefined },
)
</script>

<template>
	<p
		class="ui-status-pill"
		:class="[`ui-status-pill--${tone}`, { 'is-hidden': hidden }]"
		:aria-hidden="hidden || undefined"
	>
		<UiIcon v-if="icon" class="ui-status-pill__icon" :name="icon" />
		<span><slot /></span>
	</p>
</template>

<style scoped>
.ui-status-pill {
	--h: var(--status-pill-height, 40px);
	display: inline-flex;
	align-items: center;
	gap: calc(var(--h) * 0.1);
	height: var(--h);
	padding: 0 calc(var(--h) * 0.4) 0 calc(var(--h) * 0.2);
	border-radius: var(--radius-capsule);
	font-size: var(--status-pill-font-size, var(--font-size-callout));
	font-weight: var(--font-weight-bold);
	white-space: nowrap;
	transition:
		background var(--duration-fast),
		color var(--duration-fast),
		opacity var(--duration-fast);
}

/* The 24 px grid leaves 5 px around a check: 0.6 × height keeps the glyph's optical padding */
.ui-status-pill__icon {
	width: calc(var(--h) * 0.6);
	height: calc(var(--h) * 0.6);
}

.ui-status-pill--neutral {
	background: var(--fill-secondary);
	color: var(--text-secondary);
}
.ui-status-pill--success {
	background: var(--green-tint);
	color: var(--green);
}
.ui-status-pill--warning {
	background: var(--warn-tint);
	color: var(--warn);
}

.ui-status-pill.is-hidden {
	visibility: hidden;
	opacity: 0;
}
</style>
