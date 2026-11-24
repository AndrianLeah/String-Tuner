<script setup lang="ts">
/** A container made of one of the three materials, with a radius from the scale. */
withDefaults(
	defineProps<{
		/** glass: controls · sheet: sheets and dialogs · thin: content (ring, meter, card) */
		material?: 'glass' | 'sheet' | 'thin'
		radius?: 'lg' | 'xl' | '2xl' | 'sheet' | 'capsule'
		as?: string
	}>(),
	{ material: 'glass', radius: 'xl', as: 'div' },
)
</script>

<template>
	<component
		:is="as"
		class="ui-surface"
		:class="[
			material === 'thin' ? 'ui-material' : 'ui-glass',
			{ 'ui-glass--sheet': material === 'sheet' },
			`ui-surface--${radius}`,
		]"
	>
		<slot />
	</component>
</template>

<style scoped>
.ui-surface--lg {
	border-radius: var(--radius-lg);
}
.ui-surface--xl {
	border-radius: var(--radius-xl);
}
.ui-surface--2xl {
	border-radius: var(--radius-2xl);
}
.ui-surface--sheet {
	border-radius: var(--radius-sheet);
}
.ui-surface--capsule {
	border-radius: var(--radius-capsule);
}
</style>
