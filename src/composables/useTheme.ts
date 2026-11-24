import { computed, nextTick, watch } from 'vue'
import { revealChange } from '../ui/motion'
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

	// The new theme opens as a circle from where the user tapped
	function setTheme(t: 'dark' | 'light') {
		if (t === settings.value.theme) return
		return revealChange(async () => {
			_setTheme(t)
			await nextTick() // the watch above has put data-theme on the page
		})
	}

	function toggleTheme() {
		return setTheme(settings.value.theme === 'dark' ? 'light' : 'dark')
	}

	return { isDark, toggleTheme, setTheme }
}
