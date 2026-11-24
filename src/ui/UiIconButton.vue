<script setup lang="ts">
import UiIcon from './UiIcon.vue'
import type { IconName } from './icons'

/**
 * A round button holding one icon.
 *  - glass: a control on the background (52 px, Liquid Glass)
 *  - fill: inside a sheet, where glass would sit on glass (40 px, grey fill)
 *  - plain: no background, for a small action inside a row or a field
 */
withDefaults(
	defineProps<{
		icon: IconName
		/** Accessible name: the button shows no text */
		label: string
		variant?: 'glass' | 'fill' | 'plain'
	}>(),
	{ variant: 'glass' },
)
</script>

<template>
	<button
		type="button"
		class="ui-icon-button ui-pressable"
		:class="[`ui-icon-button--${variant}`, { 'ui-glass': variant === 'glass' }]"
		:aria-label="label"
		:title="label"
	>
		<UiIcon :name="icon" />
	</button>
</template>

<style scoped>
.ui-icon-button {
	flex: none;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	border: none;
	border-radius: var(--radius-capsule);
	background: none;
	color: var(--text-secondary);
}

.ui-icon-button--glass {
	width: var(--size-control-lg);
	height: var(--size-control-lg);
	background: var(--glass-fill);
}

.ui-icon-button--fill {
	width: 40px;
	height: 40px;
	background: var(--fill-secondary);
}

/* Small to the eye, still 44 pt to the finger */
.ui-icon-button--plain {
	width: var(--size-hit-min);
	height: var(--size-hit-min);
	margin: calc((var(--size-control-sm) - var(--size-hit-min)) / 2);
	color: var(--text-tertiary);
}
</style>
