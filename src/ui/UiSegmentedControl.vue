<script setup lang="ts" generic="T extends string">
import { ref } from 'vue'
import UiIcon from './UiIcon.vue'
import type { IconName } from './icons'

export interface SegmentOption<V extends string = string> {
	value: V
	label: string
	icon?: IconName
}

/**
 * A row of mutually exclusive options in a grey track, like iOS's segmented control. The selected
 * segment is neutral (white/grey), not coloured: colour is kept for meaning. It behaves as a
 * radio group: arrow keys move the choice.
 */
const props = withDefaults(
	defineProps<{
		options: SegmentOption<T>[]
		/** Accessible name of the group */
		label: string
		size?: 'sm' | 'md' | 'lg'
	}>(),
	{ size: 'md' },
)
const model = defineModel<T>({ required: true })

const buttons = ref<HTMLButtonElement[]>([])

function select(index: number) {
	const option = props.options[index]
	if (!option) return
	model.value = option.value
	buttons.value[index]?.focus()
}

function onKeydown(event: KeyboardEvent, index: number) {
	const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
	if (step === undefined) return
	event.preventDefault()
	const count = props.options.length
	select((index + step + count) % count)
}
</script>

<template>
	<div class="ui-segmented" :class="`ui-segmented--${size}`" role="radiogroup" :aria-label="label">
		<button
			v-for="(option, index) in options"
			:key="option.value"
			ref="buttons"
			type="button"
			role="radio"
			class="ui-segment ui-pressable"
			:class="{ 'is-selected': option.value === model }"
			:aria-checked="option.value === model"
			:tabindex="option.value === model ? 0 : -1"
			@click="select(index)"
			@keydown="onKeydown($event, index)"
		>
			<UiIcon v-if="option.icon" :name="option.icon" :size="20" />
			{{ option.label }}
		</button>
	</div>
</template>

<style scoped>
.ui-segmented {
	display: flex;
	gap: var(--space-1);
	padding: var(--space-1);
	border-radius: var(--radius-capsule);
	background: var(--fill-secondary);
}

.ui-segment {
	flex: 1 1 0;
	min-width: 0;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: var(--space-2);
	padding: 0 var(--space-3);
	border: none;
	border-radius: var(--radius-capsule);
	background: transparent;
	color: var(--text-secondary);
	font-size: var(--font-size-subhead);
	font-weight: var(--font-weight-semibold);
	white-space: nowrap;
	transition:
		background var(--duration-fast),
		color var(--duration-fast),
		box-shadow var(--duration-fast);
}

.ui-segmented--sm .ui-segment {
	height: var(--size-control-sm);
}
.ui-segmented--md .ui-segment {
	height: 40px;
}
.ui-segmented--lg .ui-segment {
	height: var(--size-control-md);
	font-size: var(--font-size-callout);
}

.ui-segment.is-selected {
	background: var(--segment-selected);
	box-shadow: var(--shadow-segment);
	color: var(--text-primary);
	font-weight: var(--font-weight-bold);
}

/* The selected segment does not swell: it is already chosen */
.ui-segment.is-selected:active {
	transform: none;
}
</style>
