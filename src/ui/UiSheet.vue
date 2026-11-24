<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import UiIconButton from './UiIconButton.vue'

/**
 * A modal sheet of Liquid Glass. On a phone it floats at the bottom of the screen; on wider
 * screens it becomes a centred dialog. Inside it use filled controls only (no glass on glass).
 *
 * Mount it with v-if inside <Transition name="ui-sheet"> to animate it in and out.
 * Slots: the default slot is the body, which scrolls when it is too long; `toolbar` sits under
 * the title on a phone and next to it on wider screens (the instrument tabs of the tuning list);
 * `subheader` stays above the scrolling body (a search field).
 * It closes with its button, a tap outside or Escape, and keeps keyboard focus inside while open.
 */
withDefaults(
	defineProps<{
		title: string
		/** Accessible name of the close button */
		closeLabel: string
		/** md: a short form · lg: a long list (taller, and wider as a dialog) */
		size?: 'md' | 'lg'
	}>(),
	{ size: 'md' },
)
const emit = defineEmits<{ close: [] }>()

const titleId = useId()
const panel = ref<HTMLElement | null>(null)
let returnFocusTo: HTMLElement | null = null

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])'

function onKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') {
		event.stopPropagation()
		emit('close')
		return
	}
	if (event.key !== 'Tab' || !panel.value) return
	const items = [...panel.value.querySelectorAll<HTMLElement>(FOCUSABLE)]
	const first = items[0]
	const last = items[items.length - 1]
	if (!first || !last) return
	if (
		event.shiftKey &&
		(document.activeElement === first || document.activeElement === panel.value)
	) {
		event.preventDefault()
		last.focus()
	} else if (!event.shiftKey && document.activeElement === last) {
		event.preventDefault()
		first.focus()
	}
}

onMounted(async () => {
	returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
	await nextTick()
	// A child may already have taken focus (a search field); otherwise start on the sheet itself
	if (!panel.value?.contains(document.activeElement)) panel.value?.focus()
})

onBeforeUnmount(() => returnFocusTo?.focus())
</script>

<template>
	<div class="ui-sheet" @click.self="emit('close')" @keydown="onKeydown">
		<div
			ref="panel"
			class="ui-sheet__panel ui-glass ui-glass--sheet"
			:class="`ui-sheet__panel--${size}`"
			role="dialog"
			aria-modal="true"
			:aria-labelledby="titleId"
			tabindex="-1"
		>
			<div class="ui-sheet__grabber" aria-hidden="true" />
			<header class="ui-sheet__header">
				<h2 :id="titleId" class="ui-sheet__title">{{ title }}</h2>
				<div v-if="$slots.toolbar" class="ui-sheet__toolbar"><slot name="toolbar" /></div>
				<UiIconButton
					class="ui-sheet__close"
					icon="close"
					variant="fill"
					:label="closeLabel"
					@click="emit('close')"
				/>
			</header>
			<div v-if="$slots.subheader" class="ui-sheet__subheader"><slot name="subheader" /></div>
			<div class="ui-sheet__body"><slot /></div>
		</div>
	</div>
</template>

<style scoped>
/* ── Scrim ──────────────────────────────────────────────────────────────── */
.ui-sheet {
	position: fixed;
	inset: 0;
	z-index: 100;
	display: flex;
	align-items: flex-end;
	justify-content: center;
	padding: max(env(safe-area-inset-top), var(--space-6))
		max(env(safe-area-inset-right), var(--space-2)) max(env(safe-area-inset-bottom), var(--space-2))
		max(env(safe-area-inset-left), var(--space-2));
	background: var(--scrim);
	-webkit-backdrop-filter: blur(var(--blur-scrim));
	backdrop-filter: blur(var(--blur-scrim));
}

/* ── Panel: a floating sheet on a phone ─────────────────────────────────── */
.ui-sheet__panel {
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
	width: 100%;
	max-width: 560px;
	max-height: 100%;
	padding: var(--space-2) var(--space-4) var(--space-4);
	border-radius: var(--radius-sheet);
	outline: none;
}
.ui-sheet__panel--lg {
	height: min(690px, 100%);
}

.ui-sheet__grabber {
	align-self: center;
	flex: none;
	width: 40px;
	height: 5px;
	border-radius: var(--radius-capsule);
	background: var(--text-tertiary);
	opacity: 0.6;
}

.ui-sheet__header {
	display: grid;
	grid-template-columns: 1fr auto;
	grid-template-areas:
		'title close'
		'toolbar toolbar';
	align-items: center;
	gap: var(--space-4) var(--space-4);
	padding-inline-start: var(--space-1);
}

.ui-sheet__title {
	grid-area: title;
	min-width: 0;
	color: var(--text-primary);
	font-size: var(--font-size-title);
	font-weight: var(--font-weight-bold);
	line-height: 1.3;
}

.ui-sheet__toolbar {
	grid-area: toolbar;
	margin-inline-start: calc(-1 * var(--space-1));
}

.ui-sheet__close {
	grid-area: close;
}

.ui-sheet__header,
.ui-sheet__subheader {
	flex: none;
}

/* The body scrolls; its padding keeps focus rings from being clipped at the edges */
.ui-sheet__body {
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
	flex: 1 1 auto;
	min-height: 0;
	margin: -6px;
	padding: 6px;
	overflow-y: auto;
	overscroll-behavior: contain;
}

/* ── Wider screens: the toolbar joins the title row ─────────────────────── */
@media (min-width: 640px) {
	.ui-sheet__header {
		grid-template-columns: auto 1fr auto;
		grid-template-areas: 'title toolbar close';
	}
	.ui-sheet__toolbar {
		justify-self: center;
		width: min(100%, 420px);
		margin: 0;
	}
	.ui-sheet__panel--lg {
		max-width: 920px;
	}
}

/* ── Phone in landscape: a wide sheet over most of the height ───────────── */
@media (orientation: landscape) and (max-height: 639px) {
	.ui-sheet {
		padding-top: var(--space-5);
		padding-bottom: 0;
	}
	.ui-sheet__panel {
		border-end-start-radius: 0;
		border-end-end-radius: 0;
		padding-inline: var(--space-6);
	}
	.ui-sheet__panel--lg {
		height: 100%;
	}
}

/* ── Tablet and desktop: a centred dialog ───────────────────────────────── */
@media (min-width: 640px) and (min-height: 640px) {
	.ui-sheet {
		align-items: center;
		padding: var(--space-10);
		-webkit-backdrop-filter: blur(16px);
		backdrop-filter: blur(16px);
	}
	.ui-sheet__panel {
		max-width: 480px;
		padding: var(--space-8);
	}
	.ui-sheet__panel--lg {
		max-width: 780px;
		height: auto;
		max-height: min(720px, 100%);
	}
	.ui-sheet__grabber {
		display: none;
	}
}

/*
 * ── <Transition name="ui-sheet"> ───────────────────────────────────────────
 * The scrim darkens and blurs in while the panel slides up whole, without fading; a dialog
 * rises a little and grows instead. Vue times the transition on the root element, so the
 * scrim and the panel take the same time.
 */
.ui-sheet-enter-active {
	transition:
		background-color var(--duration-slow) var(--ease-out),
		backdrop-filter var(--duration-slow) var(--ease-out),
		-webkit-backdrop-filter var(--duration-slow) var(--ease-out);
}
.ui-sheet-leave-active {
	transition:
		background-color var(--duration-base) var(--ease-in),
		backdrop-filter var(--duration-base) var(--ease-in),
		-webkit-backdrop-filter var(--duration-base) var(--ease-in);
}
.ui-sheet-enter-active .ui-sheet__panel {
	transition: transform var(--duration-slow) var(--ease-out);
	will-change: transform;
}
.ui-sheet-leave-active .ui-sheet__panel {
	transition: transform var(--duration-base) var(--ease-in);
	will-change: transform;
}
.ui-sheet-enter-from,
.ui-sheet-leave-to {
	background-color: transparent;
	-webkit-backdrop-filter: blur(0);
	backdrop-filter: blur(0);
}
.ui-sheet-enter-from .ui-sheet__panel,
.ui-sheet-leave-to .ui-sheet__panel {
	transform: translateY(calc(100% + var(--space-6)));
}

@media (min-width: 640px) and (min-height: 640px) {
	.ui-sheet-enter-active .ui-sheet__panel {
		transition:
			transform var(--duration-slow) var(--ease-spring),
			opacity var(--duration-base) var(--ease-out);
	}
	.ui-sheet-leave-active .ui-sheet__panel {
		transition:
			transform var(--duration-base) var(--ease-in),
			opacity var(--duration-base) var(--ease-in);
	}
	.ui-sheet-enter-from .ui-sheet__panel,
	.ui-sheet-leave-to .ui-sheet__panel {
		opacity: 0;
		transform: translateY(24px) scale(0.95);
	}
}
</style>
