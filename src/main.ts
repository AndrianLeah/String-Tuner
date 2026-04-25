import { createApp } from 'vue'
import App from './App.vue'
import { i18n } from './i18n'
import './style.css'
import './styles/CentsMeter.css'
import './styles/GuitarTuner.css'
import './styles/SettingsMenu.css'
import './styles/StringChips.css'
import './styles/TunerRing.css'
import './styles/TuningSelector.css'

createApp(App).use(i18n).mount('#app')
