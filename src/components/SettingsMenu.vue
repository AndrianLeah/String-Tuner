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
