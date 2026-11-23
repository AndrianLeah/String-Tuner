import { watch } from 'vue'
import { createI18n } from 'vue-i18n'
import { loadSettings } from './composables/useSettings'
import en from './locales/en.json'
import it from './locales/it.json'
import zh from './locales/zh.json'

const { language } = loadSettings()

export const i18n = createI18n({
	legacy: false,
	locale: language,
	fallbackLocale: 'en',
	messages: { en, it, zh },
})

// Keep <html lang> on the language shown, for screen readers, hyphenation and translators
watch(
	i18n.global.locale,
	(locale) => {
		document.documentElement.lang = locale
	},
	{ immediate: true },
)
