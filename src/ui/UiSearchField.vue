<script setup lang="ts">
import { onMounted, ref } from 'vue'
import UiIcon from './UiIcon.vue'
import UiIconButton from './UiIconButton.vue'

/** A capsule search field with a clear button. */
const props = withDefaults(
	defineProps<{
		placeholder?: string
		/** Accessible name of the field */
		label: string
		/** Accessible name of the clear button */
		clearLabel: string
		size?: 'sm' | 'md'
		autofocus?: boolean
	}>(),
	{ placeholder: '', size: 'md' },
)
const model = defineModel<string>({ default: '' })

const input = ref<HTMLInputElement | null>(null)
onMounted(() => {
	if (props.autofocus) input.value?.focus()
})

function clear() {
	model.value = ''
	input.value?.focus()
}
</script>

<template>
	<label class="ui-search" :class="`ui-search--${size}`">
		<UiIcon name="search" class="ui-search__icon" />
		<input
			ref="input"
			v-model="model"
			class="ui-search__input"
			type="search"
			:placeholder="placeholder"
			:aria-label="label"
			autocomplete="off"
			spellcheck="false"
		/>
		<UiIconButton v-if="model" icon="close" variant="plain" :label="clearLabel" @click="clear" />
	</label>
</template>

<style scoped>
.ui-search {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	padding: 0 var(--space-2) 0 var(--space-3);
	border-radius: var(--radius-capsule);
	background: var(--fill-secondary);
	color: var(--text-tertiary);
	cursor: text;
}
.ui-search--sm {
	height: var(--size-control-md);
}
.ui-search--md {
	height: 48px;
}

.ui-search:focus-within {
	outline: var(--focus-ring-width) solid var(--accent);
	outline-offset: 2px;
}

.ui-search__icon {
	flex: none;
}

.ui-search__input {
	flex: 1;
	min-width: 0;
	height: 100%;
	padding: 0;
	border: none;
	outline: none;
	background: none;
	color: var(--text-primary);
	font-size: var(--font-size-callout);
	font-weight: var(--font-weight-medium);
	user-select: text;
	-webkit-user-select: text;
}
.ui-search__input::placeholder {
	color: var(--text-tertiary);
}
.ui-search__input::-webkit-search-cancel-button {
	display: none;
}
</style>
