<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfig } from '../composables/useConfig'
import { formatNote, type InstrumentCategory } from '../data/tunings'
import {
	UiIconButton,
	UiListRow,
	UiSearchField,
	UiSegmentedControl,
	UiSheet,
	type SegmentOption,
} from '../ui'

const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()

const { config, allTunings, activeTuning, selectTuning, deleteCustomTuning } = useConfig()

const CATEGORIES: InstrumentCategory[] = ['guitar', 'ukulele', 'bass', 'violin']
const categoryOptions = computed<SegmentOption<InstrumentCategory>[]>(() =>
	CATEGORIES.map((cat) => ({ value: cat, label: t(`selector.${cat}`) })),
)

const activeCategory = ref<InstrumentCategory>(activeTuning.value.category)
const search = ref('')

// A new instrument starts from its full list
watch(activeCategory, () => {
	search.value = ''
})

// Typing is the point of the field with a keyboard; on a touch screen the keyboard would hide the list
const finePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false

const filtered = computed(() => {
	const q = search.value.trim().toLowerCase()
	return allTunings.value.filter((tuning) => {
		const matchesCategory = tuning.category === activeCategory.value
		if (!q) return matchesCategory
		const nameMatch = tuning.name.toLowerCase().includes(q)
		const notesMatch = tuning.tuning
			.map((s) => formatNote(s.note, tuning.preferFlats).toLowerCase())
			.join(' ')
			.includes(q)
		return matchesCategory && (nameMatch || notesMatch)
	})
})

function isCustom(id: string): boolean {
	return config.value.customTunings.some((t) => t.id === id)
}

function handleSelect(id: string) {
	selectTuning(id)
	emit('close')
}
</script>

<template>
	<UiSheet
		:title="t('selector.title')"
		:close-label="t('common.close')"
		size="lg"
		@close="emit('close')"
	>
		<template #toolbar>
			<UiSegmentedControl
				v-model="activeCategory"
				class="category-tabs"
				:options="categoryOptions"
				:label="t('selector.title')"
			/>
		</template>

		<template #subheader>
			<UiSearchField
				v-model="search"
				:placeholder="t('selector.searchPlaceholder')"
				:label="t('selector.searchPlaceholder')"
				:clear-label="t('common.clear')"
				:autofocus="finePointer"
			/>
		</template>

		<!-- Another instrument: its list fades in where the other one was -->
		<Transition name="ui-fade" mode="out-in">
			<div :key="activeCategory" class="tuning-list">
				<p v-if="filtered.length === 0" class="no-results">
					{{ t('selector.noResults') }}
				</p>

				<UiListRow
					v-for="tuning in filtered"
					:key="tuning.id"
					class="tuning-card"
					:title="tuning.name"
					:selected="activeTuning.id === tuning.id"
					@select="handleSelect(tuning.id)"
				>
					<template #meta>
						<span class="card-strings">{{ tuning.strings }} {{ t('tuner.strSuffix') }}</span>
						<span v-if="isCustom(tuning.id)" class="badge-custom">{{ t('selector.custom') }}</span>
					</template>
					<!-- Thinnest string first, as on the chips -->
					<span v-for="(str, i) in [...tuning.tuning].reverse()" :key="i" class="string-note"
						>{{ formatNote(str.note, tuning.preferFlats) }}{{ str.octave }}</span
					>
					<template v-if="isCustom(tuning.id)" #action>
						<UiIconButton
							icon="close"
							variant="plain"
							:label="t('selector.delete', { name: tuning.name })"
							@click="deleteCustomTuning(tuning.id)"
						/>
					</template>
				</UiListRow>
			</div>
		</Transition>
	</UiSheet>
</template>

<style scoped>
.tuning-list {
	display: grid;
	grid-template-columns: 1fr;
	gap: var(--space-2);
	align-content: start;
}

/* Two columns wherever the sheet is wide */
@media (min-width: 640px) {
	.tuning-list {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

.no-results {
	grid-column: 1 / -1;
	padding: var(--space-6) 0;
	color: var(--text-tertiary);
	text-align: center;
}

.card-strings {
	color: var(--text-tertiary);
	font-size: var(--font-size-caption);
	font-weight: var(--font-weight-semibold);
}

.badge-custom {
	padding: 0 var(--space-1);
	border-radius: var(--radius-sm);
	background: var(--fill-secondary);
	color: var(--text-secondary);
	font-size: var(--font-size-caption-2);
	font-weight: var(--font-weight-semibold);
}

.string-note {
	font-variant-numeric: tabular-nums;
}
</style>
