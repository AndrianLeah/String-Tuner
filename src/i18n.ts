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
