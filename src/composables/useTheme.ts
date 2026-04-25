import { computed, watch } from 'vue'
import { useSettings } from './useSettings'

const { settings, setTheme: _setTheme } = useSettings()

// Apply theme to DOM whenever it changes
watch(
	() => settings.value.theme,
	(theme) => {
		document.documentElement.setAttribute('data-theme', theme)
	},
	{ immediate: true },
)

export function useTheme() {
	const isDark = computed(() => settings.value.theme === 'dark')

	function toggleTheme() {
		_setTheme(settings.value.theme === 'dark' ? 'light' : 'dark')
	}

	function setTheme(t: 'dark' | 'light') {
		_setTheme(t)
	}

	return { isDark, toggleTheme, setTheme }
}
