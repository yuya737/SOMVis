import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import './style.css'
import "./style.scss"
import App from './App.vue'

import 'primevue/resources/themes/aura-light-green/theme.css'
import 'primevue/resources/primevue.css'
import 'primeicons/primeicons.css'


const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(PrimeVue)
app.mount('#app')

