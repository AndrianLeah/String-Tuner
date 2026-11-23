<script setup lang="ts">
import { MoonHalfRight5Outlined, Sun1Outlined, XmarkOutlined } from '@lineiconshq/free-icons'
import { Lineicons } from '@lineiconshq/vue-lineicons'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettings } from '../composables/useSettings'
import { useTheme } from '../composables/useTheme'
import { i18n } from '../i18n'

const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const { isDark, setTheme } = useTheme()
const { setLanguage } = useSettings()

const currentLocale = computed(() => i18n.global.locale.value)
function setLocale(lang: string) {
	i18n.global.locale.value = lang as 'en' | 'it' | 'zh'
	setLanguage(lang as 'en' | 'it' | 'zh')
}
</script>

<template>
	<div class="settings-overlay" @click.self="emit('close')">
		<div class="settings-sheet">
			<div class="sheet-header">
				<span class="sheet-title">{{ t('settings.title') }}</span>
				<button class="close-btn" @click="emit('close')">
					<span class="icon"><Lineicons :icon="XmarkOutlined" color="currentColor" /></span>
				</button>
			</div>

			<div class="sheet-body">
				<!-- Theme section -->
				<div class="settings-section">
					<span class="settings-label">{{ t('settings.theme') }}</span>
					<div class="options-row">
						<button class="option-btn" :class="{ active: !isDark }" @click="setTheme('light')">
							<span class="icon"><Lineicons :icon="Sun1Outlined" color="currentColor" /></span>
							{{ t('settings.light') }}
						</button>
						<button class="option-btn" :class="{ active: isDark }" @click="setTheme('dark')">
							<span class="icon"
								><Lineicons :icon="MoonHalfRight5Outlined" color="currentColor"
							/></span>
							{{ t('settings.dark') }}
						</button>
					</div>
				</div>

				<!-- Language section -->
				<div class="settings-section">
					<span class="settings-label">{{ t('settings.language') }}</span>
					<div class="options-row">
						<button
							class="option-btn"
							:class="{ active: currentLocale === 'en' }"
							@click="setLocale('en')"
						>
							English
						</button>
						<button
							class="option-btn"
							:class="{ active: currentLocale === 'it' }"
							@click="setLocale('it')"
						>
							Italiano
						</button>
						<button
							class="option-btn"
							:class="{ active: currentLocale === 'zh' }"
							@click="setLocale('zh')"
						>
							中文
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.settings-overlay {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.6);
	display: flex;
	align-items: flex-end;
	z-index: 100;
}

.settings-sheet {
	width: 100%;
	background: var(--surface);
	border-radius: 16px 16px 0 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	padding-bottom: max(env(safe-area-inset-bottom), 1rem);
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

.sheet-body {
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
	padding: 1.25rem;
}

.settings-section {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.settings-label {
	font-size: 0.7rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.09em;
	color: var(--text-muted);
}

.options-row {
	display: flex;
	gap: 0.5rem;
}

.option-btn {
	flex: 1;
	padding: 0.55rem 0.75rem;
	border-radius: 10px;
	border: none;
	background: transparent;
	color: var(--text-muted);
	font-size: 0.9rem;
	font-weight: 500;
	font-family: 'Elms Sans', system-ui, sans-serif;
	cursor: pointer;
	transition:
		background 0.15s,
		color 0.15s;
}
.option-btn:hover {
	background: var(--surface-raised);
	color: var(--text-primary);
}
.option-btn.active {
	background: var(--accent-dim);
	color: var(--accent);
	font-weight: 600;
}
</style>
