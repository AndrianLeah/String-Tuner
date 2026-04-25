import { ref, watch } from 'vue'
import { browserStorage } from '../services/storage'

const STORAGE_KEY = 'accordatore_settings'

export type AppLanguage = 'en' | 'it' | 'zh'
export type AppTheme = 'dark' | 'light'

export interface AppSettings {
	theme: AppTheme
	language: AppLanguage
}

function getSystemTheme(): AppTheme {
	return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function getSystemLanguage(): AppLanguage {
	const lang = navigator.language?.split('-')[0]
	if (lang === 'it') return 'it'
	if (lang === 'zh') return 'zh'
	return 'en'
}

function load(): AppSettings {
	try {
		const raw = browserStorage.get(STORAGE_KEY)
		if (raw) {
			const parsed = JSON.parse(raw) as Partial<AppSettings>
			return {
				theme:
					parsed.theme === 'light' || parsed.theme === 'dark' ? parsed.theme : getSystemTheme(),
				language:
					parsed.language === 'en' || parsed.language === 'it' || parsed.language === 'zh'
						? parsed.language
						: getSystemLanguage(),
			}
		}
	} catch {
		// Corrupt data — fall through to defaults
	}
	return { theme: getSystemTheme(), language: getSystemLanguage() }
}

function save(settings: AppSettings) {
	browserStorage.set(STORAGE_KEY, JSON.stringify(settings))
}

// Singleton reactive state
const settings = ref<AppSettings>(load())

watch(settings, (val) => save(val), { deep: true })

export function useSettings() {
	function setTheme(theme: AppTheme) {
		settings.value = { ...settings.value, theme }
	}

	function setLanguage(language: AppLanguage) {
		settings.value = { ...settings.value, language }
	}

	return { settings, setTheme, setLanguage }
}

/** Read-only snapshot for module-level initialisation (e.g. i18n.ts) */
export function loadSettings(): AppSettings {
	return load()
}
