<script setup lang="ts" generic="T extends string">
import { computed, ref } from 'vue'
import UiIcon from './UiIcon.vue'
import type { IconName } from './icons'

export interface SegmentOption<V extends string = string> {
	value: V
	label: string
	icon?: IconName
}

/**
 * A row of mutually exclusive options in a grey track, like iOS's segmented control. The selected
 * segment is neutral (white/grey), not coloured: colour is kept for meaning. A single thumb
 * slides under the chosen segment. It behaves as a radio group: arrow keys move the choice.
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
const selectedIndex = computed(() => props.options.findIndex((o) => o.value === model.value))

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
	<div
		class="ui-segmented"
		:class="`ui-segmented--${size}`"
		:style="{ '--count': options.length, '--index': selectedIndex }"
		role="radiogroup"
		:aria-label="label"
	>
		<span v-if="selectedIndex >= 0" class="ui-segmented__thumb" aria-hidden="true" />
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
	position: relative;
	isolation: isolate;
	display: flex;
	gap: var(--space-1);
	padding: var(--space-1);
	border-radius: var(--radius-capsule);
	background: var(--fill-secondary);
}

/* The segments share the width equally, so the thumb's place follows from the index alone */
.ui-segmented__thumb {
	position: absolute;
	top: var(--space-1);
	bottom: var(--space-1);
	left: var(--space-1);
	width: calc((100% - (var(--count) + 1) * var(--space-1)) / var(--count));
	border-radius: var(--radius-capsule);
	background: var(--segment-selected);
	box-shadow: var(--shadow-segment);
	transform: translateX(calc(var(--index) * (100% + var(--space-1))));
	transition:
		transform var(--duration-slow) var(--ease-spring),
		scale var(--duration-base) var(--ease-spring),
		background var(--duration-base);
	pointer-events: none;
}

/* Pressing the track squeezes the thumb a little, as on iOS */
.ui-segmented:active .ui-segmented__thumb {
	scale: 0.96;
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
		color var(--duration-base) var(--ease-out),
		font-weight var(--duration-base) var(--ease-out);
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

/* The weight eases too: Nunito is a variable font */
.ui-segment.is-selected {
	color: var(--text-primary);
	font-weight: var(--font-weight-bold);
}

/* The thumb is the feedback: segments do not swell, and the chosen one shows no veil */
.ui-segment:active:not(:disabled) {
	transform: none;
}
.ui-segment.is-selected::before {
	display: none;
}
</style>
