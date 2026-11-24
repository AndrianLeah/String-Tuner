<script setup lang="ts">
import UiIcon from './UiIcon.vue'

/**
 * A selectable row of a list inside a sheet: a filled row, never glass. The selected row takes the
 * accent tint and a check mark.
 * Slots: `meta` next to the title, the default slot as the second line, `action` for a secondary
 * button at the end of the row (kept outside the row's own button).
 */
defineProps<{
	title: string
	selected?: boolean
}>()
const emit = defineEmits<{ select: [] }>()
</script>

<template>
	<div class="ui-list-row" :class="{ 'has-action': $slots.action }">
		<button
			type="button"
			class="ui-list-row__main ui-pressable"
			:class="{ 'is-selected': selected }"
			:aria-current="selected || undefined"
			@click="emit('select')"
		>
			<span class="ui-list-row__top">
				<span class="ui-list-row__title">{{ title }}</span>
				<slot name="meta" />
				<UiIcon v-if="selected" name="check" class="ui-list-row__check" />
			</span>
			<span v-if="$slots.default" class="ui-list-row__subtitle"><slot /></span>
		</button>
		<div v-if="$slots.action" class="ui-list-row__action"><slot name="action" /></div>
	</div>
</template>

<style scoped>
.ui-list-row {
	position: relative;
}

.ui-list-row__main {
	display: flex;
	flex-direction: column;
	gap: var(--space-1);
	width: 100%;
	min-height: 70px;
	padding: var(--space-3) var(--space-4);
	border: none;
	border-radius: var(--radius-xl);
	background: var(--fill-tertiary);
	color: var(--text-primary);
	text-align: start;
}
.has-action .ui-list-row__main {
	padding-inline-end: calc(var(--space-4) + var(--size-hit-min));
}

.ui-list-row__main.is-selected {
	background: var(--accent-tint);
}

/* Rows of a list are many: a swell would make the list wobble */
.ui-list-row__main:active:not(:disabled) {
	transform: none;
}

.ui-list-row__top {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	min-height: 22px;
}

.ui-list-row__title {
	font-size: var(--font-size-callout);
	font-weight: var(--font-weight-bold);
}

.ui-list-row__check {
	margin-inline-start: auto;
	margin-block: -1px;
	color: var(--accent);
}

.ui-list-row__subtitle {
	display: flex;
	flex-wrap: wrap;
	gap: var(--space-0-5) var(--space-3);
	color: var(--text-secondary);
	font-size: var(--font-size-subhead);
	font-weight: var(--font-weight-semibold);
}
.is-selected .ui-list-row__subtitle {
	color: var(--text-primary);
	opacity: 0.85;
}

.ui-list-row__action {
	position: absolute;
	top: 50%;
	inset-inline-end: var(--space-2);
	transform: translateY(-50%);
}
</style>
