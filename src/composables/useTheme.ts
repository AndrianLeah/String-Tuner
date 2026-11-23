import { computed, watch } from 'vue'
import { useSettings } from './useSettings'

const { settings, setTheme: _setTheme } = useSettings()

// Apply theme to DOM whenever it changes, and colour the browser's / installed app's bar to
// match the page background (--bg-base of the theme now applied)
watch(
	() => settings.value.theme,
	(theme) => {
		document.documentElement.setAttribute('data-theme', theme)
		const background = getComputedStyle(document.documentElement)
			.getPropertyValue('--bg-base')
			.trim()
		const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
		if (meta && background) meta.content = background
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
