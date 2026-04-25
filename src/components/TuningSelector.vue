<script setup lang="ts">
import { Search1Outlined, XmarkOutlined } from '@lineiconshq/free-icons'
import { Lineicons } from '@lineiconshq/vue-lineicons'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfig } from '../composables/useConfig'
import { formatNote, type InstrumentCategory } from '../data/tunings'

const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()

const { config, allTunings, activeTuning, selectTuning, deleteCustomTuning } = useConfig()

const CATEGORIES: InstrumentCategory[] = ['guitar', 'ukulele', 'bass', 'violin']

const activeCategory = ref<InstrumentCategory>(activeTuning.value.category)
const search = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)

onMounted(() => {
	searchInputRef.value?.focus()
})

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

function selectCategory(cat: InstrumentCategory) {
	activeCategory.value = cat
	search.value = ''
}

function handleSelect(id: string) {
	selectTuning(id)
	emit('close')
}
</script>

<template>
	<div class="selector-overlay" @click.self="emit('close')">
		<div class="selector-sheet">
			<div class="sheet-header">
				<span class="sheet-title">{{ t('selector.title') }}</span>
				<button class="close-btn" @click="emit('close')">
					<span class="icon"><Lineicons :icon="XmarkOutlined" color="currentColor" /></span>
				</button>
			</div>

			<!-- Instrument category tabs -->
			<div class="category-tabs">
				<button
					v-for="cat in CATEGORIES"
					:key="cat"
					class="cat-tab"
					:class="{ active: activeCategory === cat }"
					@click="selectCategory(cat)"
				>
					{{ t(`selector.${cat}`) }}
				</button>
			</div>

			<!-- Search -->
			<div class="search-row">
				<span class="search-icon icon"
					><Lineicons :icon="Search1Outlined" color="currentColor"
				/></span>
				<input
					ref="searchInputRef"
					v-model="search"
					class="search-input"
					type="search"
					:placeholder="t('selector.searchPlaceholder')"
					autocomplete="off"
					spellcheck="false"
				/>
				<button v-if="search" class="search-clear" @click="search = ''">
					<span class="icon"><Lineicons :icon="XmarkOutlined" color="currentColor" /></span>
				</button>
			</div>

			<!-- Tuning list -->
			<div class="tuning-list">
				<p v-if="filtered.length === 0" class="no-results">
					{{ t('selector.noResults') }}
				</p>

				<button
					v-for="tuning in filtered"
					:key="tuning.id"
					class="tuning-card"
					:class="{ selected: activeTuning.id === tuning.id }"
					@click="handleSelect(tuning.id)"
				>
					<div class="card-top">
						<span class="card-name">{{ tuning.name }}</span>
						<span class="card-strings">{{ tuning.strings }}str</span>
						<span v-if="isCustom(tuning.id)" class="badge-custom">{{ t('selector.custom') }}</span>
						<button
							v-if="isCustom(tuning.id)"
							class="delete-btn"
							@click.stop="deleteCustomTuning(tuning.id)"
						>
							<span class="icon"><Lineicons :icon="XmarkOutlined" color="currentColor" /></span>
						</button>
					</div>
					<div class="card-notes">
						<span v-for="(str, i) in [...tuning.tuning].reverse()" :key="i" class="string-note"
							>{{ formatNote(str.note, tuning.preferFlats) }}<sub>{{ str.octave }}</sub></span
						>
					</div>
				</button>
			</div>
		</div>
	</div>
</template>
