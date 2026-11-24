// The design system's global layer first (font, tokens, page defaults, materials). Each component
// carries its own scoped styles, which come after it.
import '@fontsource-variable/nunito'
import './ui/index.css'
import { createApp } from 'vue'
import App from './App.vue'
import { i18n } from './i18n'

createApp(App).use(i18n).mount('#app')
