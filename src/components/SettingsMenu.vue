<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettings, type AppLanguage, type AppTheme } from '../composables/useSettings'
import { useTheme } from '../composables/useTheme'
import { i18n } from '../i18n'
import { UiSection, UiSegmentedControl, UiSheet, type SegmentOption } from '../ui'

const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const { isDark, setTheme } = useTheme()
const { setLanguage } = useSettings()

const themeOptions = computed<SegmentOption<AppTheme>[]>(() => [
	{ value: 'light', label: t('settings.light'), icon: 'sun' },
	{ value: 'dark', label: t('settings.dark'), icon: 'moon' },
])
const theme = computed<AppTheme>({
	get: () => (isDark.value ? 'dark' : 'light'),
	set: setTheme,
})

// Each language is written in itself
const languageOptions: SegmentOption<AppLanguage>[] = [
	{ value: 'en', label: 'English' },
	{ value: 'it', label: 'Italiano' },
	{ value: 'zh', label: '中文' },
]
const language = computed<AppLanguage>({
	get: () => i18n.global.locale.value as AppLanguage,
	set: (lang) => {
		i18n.global.locale.value = lang
		setLanguage(lang)
	},
})
</script>

<template>
	<UiSheet :title="t('settings.title')" :close-label="t('common.close')" @close="emit('close')">
		<UiSection :label="t('settings.theme')">
			<UiSegmentedControl
				v-model="theme"
				:options="themeOptions"
				:label="t('settings.theme')"
				size="lg"
			/>
		</UiSection>
		<UiSection :label="t('settings.language')">
			<UiSegmentedControl
				v-model="language"
				:options="languageOptions"
				:label="t('settings.language')"
				size="lg"
			/>
		</UiSection>
	</UiSheet>
</template>
