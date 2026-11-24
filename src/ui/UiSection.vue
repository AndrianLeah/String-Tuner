<script setup lang="ts">
/** A labelled group inside a sheet: a small uppercase label above its content. */
defineProps<{ label: string }>()
</script>

<template>
	<section class="ui-section">
		<h3 class="ui-section__label">{{ label }}</h3>
		<slot />
	</section>
</template>

<style scoped>
.ui-section {
	display: flex;
	flex-direction: column;
	gap: var(--space-2);
}

.ui-section__label {
	padding-inline: var(--space-1);
	color: var(--text-tertiary);
	font-size: var(--font-size-caption);
	font-weight: var(--font-weight-bold);
	letter-spacing: 0.06em;
	text-transform: uppercase;
}
</style>
