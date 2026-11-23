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
						<span class="card-strings">{{ tuning.strings }} {{ t('tuner.strSuffix') }}</span>
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

<style scoped>
.selector-overlay {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.6);
	display: flex;
	align-items: flex-end;
	z-index: 100;
}

.selector-sheet {
	width: 100%;
	max-height: 82dvh;
	background: var(--surface);
	border-radius: 16px 16px 0 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	padding-bottom: max(env(safe-area-inset-bottom), 0.5rem);
}

.sheet-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 1rem 1.25rem 0.75rem;
	border-bottom: 1px solid var(--border);
	flex-shrink: 0;
}

.sheet-title {
	font-size: 1rem;
	font-weight: 600;
	letter-spacing: 0.05em;
	color: var(--text-primary);
}

.close-btn {
	background: none;
	border: none;
	color: var(--text-muted);
	font-size: 1.1rem;
	cursor: pointer;
	padding: 0.25rem;
	line-height: 1;
}
.close-btn:hover {
	color: var(--text-primary);
}

/* ── Category tabs ─────────────────────────────────────────────────────────── */
.category-tabs {
	display: flex;
	padding: 0.75rem 1rem 0;
	gap: 0.5rem;
	flex-shrink: 0;
}

.cat-tab {
	flex: 1;
	padding: 0.5rem 0.25rem;
	border-radius: 8px;
	border: none;
	background: transparent;
	color: var(--text-muted);
	font-size: 0.85rem;
	font-weight: 500;
	font-family: 'Elms Sans', system-ui, sans-serif;
	cursor: pointer;
	transition:
		background 0.15s,
		color 0.15s;
}
.cat-tab:hover {
	background: var(--surface-raised);
	color: var(--text-primary);
}
.cat-tab.active {
	background: var(--accent-dim);
	border: none;
	color: var(--accent);
	font-weight: 600;
}

/* ── Search ────────────────────────────────────────────────────────────────── */
.search-row {
	display: flex;
	align-items: center;
	margin: 0.6rem 1rem 0.5rem;
	background: var(--surface-low);
	border: none;
	border-radius: 10px;
	padding: 0 0.75rem;
	gap: 0.5rem;
	flex-shrink: 0;
}

.search-icon {
	font-size: 0.85rem;
	color: var(--text-muted);
	flex-shrink: 0;
}

.search-input {
	flex: 1;
	background: none;
	border: none;
	outline: none;
	padding: 0.55rem 0;
	font-size: 0.9rem;
	font-family: 'Elms Sans', system-ui, sans-serif;
	color: var(--text-primary);
	user-select: text;
	-webkit-user-select: text;
}
.search-input::placeholder {
	color: var(--text-faint);
}
.search-input::-webkit-search-cancel-button {
	display: none;
}

.search-clear {
	background: none;
	border: none;
	color: var(--text-muted);
	font-size: 0.8rem;
	cursor: pointer;
	padding: 0;
	line-height: 1;
	flex-shrink: 0;
}
.search-clear:hover {
	color: var(--text-primary);
}

/* ── Tuning list ───────────────────────────────────────────────────────────── */
.tuning-list {
	overflow-y: auto;
	padding: 0 1rem;
	flex: 1;
	display: grid;
	grid-template-columns: 1fr;
	gap: 0.5rem;
	align-content: start;
	padding-bottom: 0.75rem;
}

@media (orientation: landscape) {
	.tuning-list {
		grid-template-columns: repeat(2, 1fr);
	}
}

.no-results {
	grid-column: 1 / -1;
	text-align: center;
	color: var(--text-muted);
	font-size: 0.9rem;
	padding: 1.5rem 0;
	margin: 0;
}

.tuning-card {
	background: transparent;
	border: none;
	border-radius: 10px;
	padding: 0.6rem 0.75rem;
	cursor: pointer;
	text-align: left;
	transition: background 0.15s;
	width: 100%;
}
.tuning-card:hover {
	background: var(--surface-low);
}
.tuning-card.selected {
	background: var(--accent-dim);
}

.card-top {
	display: flex;
	align-items: center;
	gap: 0.4rem;
	margin-bottom: 0.35rem;
}

.card-name {
	font-size: 0.85rem;
	font-weight: 600;
	color: var(--text-primary);
	flex: 1;
}
.tuning-card.selected .card-name {
	color: var(--accent);
}

.card-strings {
	font-size: 0.65rem;
	color: var(--text-faint);
	font-weight: 500;
}

.badge-custom {
	font-size: 0.6rem;
	background: var(--surface-raised);
	color: var(--text-secondary);
	border-radius: 4px;
	padding: 1px 4px;
}

.delete-btn {
	background: none;
	border: none;
	color: var(--red);
	font-size: 0.75rem;
	cursor: pointer;
	padding: 0;
	line-height: 1;
}

.card-notes {
	display: flex;
	gap: 0.3rem;
	flex-wrap: wrap;
}

.string-note {
	font-size: 1.05rem;
	color: var(--chip-note);
	font-family: 'Courier New', monospace;
}
.string-note sub {
	font-size: 0.72rem;
	color: var(--text-faint);
}
</style>
