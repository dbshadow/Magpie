import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import { useTheme } from './composables/useTheme'

const app = createApp(App)
const pinia = createPinia()

const { initTheme } = useTheme()
initTheme()

app.use(pinia)
app.use(router)
app.use(i18n)
app.mount('#app')
