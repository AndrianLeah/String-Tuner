// Global styles first: theme tokens, page background and resets. Each component carries its
// own scoped styles, which come after them.
import './style.css'
import { createApp } from 'vue'
import App from './App.vue'
import { i18n } from './i18n'

createApp(App).use(i18n).mount('#app')
