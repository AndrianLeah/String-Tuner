<script setup lang="ts">
/**
 * The "strings in resonance" background (mockup/background), behind everything. A radial veil
 * calms the centre, where the ring and the texts are; the edges stay lively. When every string is
 * in tune the orb behind the ring turns green.
 */
defineProps<{ celebrate?: boolean }>()
</script>

<template>
	<div class="app-background" :class="{ celebrate }" aria-hidden="true" />
</template>

<style scoped>
.app-background {
	--orb-ring: var(--orb-violet);
	--veil: radial-gradient(
		ellipse 80% 57% at 50% 48%,
		var(--bg-calm) 0%,
		var(--bg-calm) 50%,
		var(--bg-calm-0) 100%
	);
	--orbs:
		radial-gradient(circle at 68% 44%, var(--orb-ring), transparent 32%),
		radial-gradient(circle at 12% 84%, var(--orb-green), transparent 26%);

	position: fixed;
	inset: 0;
	z-index: -1;
	background-color: var(--bg-base);
	background-image: var(--veil), var(--orbs), url('../assets/background/resonance-dark.jpg');
	background-image:
		var(--veil), var(--orbs),
		image-set(
			url('../assets/background/resonance-dark.avif') type('image/avif'),
			url('../assets/background/resonance-dark.jpg') type('image/jpeg')
		);
	background-size: cover;
	background-position: center;
}

[data-theme='light'] .app-background {
	background-image: var(--veil), var(--orbs), url('../assets/background/resonance-light.jpg');
	background-image:
		var(--veil), var(--orbs),
		image-set(
			url('../assets/background/resonance-light.avif') type('image/avif'),
			url('../assets/background/resonance-light.jpg') type('image/jpeg')
		);
}

.app-background.celebrate {
	--orb-ring: var(--orb-green);
}
</style>
