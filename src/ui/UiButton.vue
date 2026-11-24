<script setup lang="ts">
/**
 * A capsule button in Liquid Glass.
 *  - primary: the one prominent action of a view (tinted glass in the accent colour)
 *  - glass: every other action (neutral glass)
 * Slots: `leading` and `trailing` around the label; with `align="start"` the label sits left
 * and the trailing content goes to the far end (a navigation pill).
 */
withDefaults(
	defineProps<{
		variant?: 'primary' | 'glass'
		size?: 'lg' | 'xl'
		align?: 'center' | 'start'
		block?: boolean
		loading?: boolean
		disabled?: boolean
		type?: 'button' | 'submit' | 'reset'
	}>(),
	{ variant: 'glass', size: 'xl', align: 'center', type: 'button' },
)
</script>

<template>
	<button
		:type="type"
		class="ui-button ui-glass ui-pressable"
		:class="[
			`ui-button--${variant}`,
			`ui-button--${size}`,
			`ui-button--align-${align}`,
			{ 'ui-button--block': block, 'ui-button--has-leading': $slots.leading },
		]"
		:disabled="disabled || loading"
		:aria-busy="loading || undefined"
	>
		<span v-if="loading" class="ui-button__spinner" aria-hidden="true" />
		<slot v-else name="leading" />
		<span class="ui-button__label"><slot /></span>
		<slot name="trailing" />
	</button>
</template>

<style scoped>
.ui-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: var(--space-2);
	min-width: var(--size-hit-min);
	padding: 0 var(--space-6);
	border: none;
	border-radius: var(--radius-capsule);
	color: var(--text-primary);
	font-size: var(--font-size-headline);
	font-weight: var(--font-weight-semibold);
	white-space: nowrap;
}

.ui-button--lg {
	height: var(--size-control-lg);
}
.ui-button--xl {
	height: var(--size-control-xl);
}
.ui-button--block {
	display: flex;
	width: 100%;
}

.ui-button--primary {
	background: var(--accent-fill);
	color: var(--text-on-accent);
}

.ui-button--align-start {
	justify-content: flex-start;
	padding-inline: var(--space-4);
}
.ui-button--align-start .ui-button__label {
	flex: 1;
	min-width: 0;
	text-align: start;
}
.ui-button--has-leading {
	padding-inline-start: var(--space-2);
}

.ui-button__label {
	display: inline-flex;
	align-items: baseline;
	gap: var(--space-2);
	overflow: hidden;
	text-overflow: ellipsis;
}

/* Loading: an activity indicator replaces the leading content */
.ui-button__spinner {
	width: 18px;
	height: 18px;
	border-radius: 50%;
	border: 2px solid currentColor;
	border-right-color: transparent;
	animation: ui-spin 0.8s linear infinite;
}
@keyframes ui-spin {
	to {
		transform: rotate(1turn);
	}
}

/* A loading button is busy, not unavailable: keep it at full strength */
.ui-button[aria-busy='true']:disabled {
	opacity: 1;
}
</style>
