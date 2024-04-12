import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import './style.css'
import "./style.scss"
import App from './App.vue'

import 'primevue/resources/themes/aura-light-green/theme.css'
import 'primevue/resources/primevue.css'
import 'primeicons/primeicons.css'

import MultiSelect from "primevue/multiselect";
import SelectButton from "primevue/selectbutton";
import Dropdown from "primevue/dropdown";
import Button from "primevue/button";
import Slider from "@vueform/slider";

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(PrimeVue)

app.component("MultiSelect", MultiSelect);
app.component("SelectButton", SelectButton);
app.component("Dropdown", Dropdown);
app.component("Slider", Slider);
app.component("Button", Button);

app.mount('#app')

