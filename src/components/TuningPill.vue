<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { TuningPreset } from '../data/tunings'
import { UiButton, UiIcon } from '../ui'

/** The current tuning, in the top bar: opens the list of tunings. */
defineProps<{ tuning: TuningPreset }>()
const { t } = useI18n()
</script>

<template>
	<UiButton class="tuning-pill" size="lg" align="start" aria-haspopup="dialog">
		<template #leading>
			<!-- The app icon's tuning fork, as a badge -->
			<span class="fork-badge" aria-hidden="true">
				<svg viewBox="0 0 8.5 22" width="8.5" height="22">
					<defs>
						<linearGradient id="fork-fill" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0" stop-color="#fff" />
							<stop offset="0.45" stop-color="#ede6ff" />
							<stop offset="1" stop-color="#c9b6ff" />
						</linearGradient>
					</defs>
					<path
						fill="url(#fork-fill)"
						d="M0 1.288C0 0.577 0.575 0 1.285 0C1.994 0 2.57 0.577 2.57 1.288L2.57 11.396C2.57 12.327 3.322 13.081 4.25 13.081C5.178 13.081 5.93 12.327 5.93 11.396L5.93 1.288C5.93 0.577 6.506 0 7.215 0C7.925 0 8.5 0.577 8.5 1.288L8.5 11.396C8.5 13.301 7.254 14.913 5.535 15.459L5.535 20.712C5.535 21.423 4.96 22 4.25 22C3.54 22 2.965 21.423 2.965 20.712L2.965 15.459C1.246 14.913 0 13.301 0 11.396Z"
					/>
				</svg>
			</span>
		</template>
		<span class="tuning-name">{{ tuning.name }}</span>
		<span class="tuning-strings">{{ tuning.strings }} {{ t('tuner.strSuffix') }}</span>
		<template #trailing>
			<UiIcon name="chevron-right" class="tuning-chevron" />
		</template>
	</UiButton>
</template>

<style scoped>
.tuning-pill {
	flex: 1;
	min-width: 0;
}

.fork-badge {
	flex: none;
	display: grid;
	place-items: center;
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background: linear-gradient(135deg, #a77bff, #5b21b6);
	box-shadow:
		inset 0 1px 1px rgba(255, 255, 255, 0.4),
		inset 0 0 0 1px rgba(255, 255, 255, 0.35);
}

.tuning-name {
	overflow: hidden;
	text-overflow: ellipsis;
	font-weight: var(--font-weight-bold);
}

.tuning-strings {
	flex: none;
	color: var(--text-tertiary);
	font-size: var(--font-size-footnote);
	font-weight: var(--font-weight-semibold);
}

.tuning-chevron {
	color: var(--text-tertiary);
	margin-inline-end: calc(-1 * var(--space-2));
}
</style>
