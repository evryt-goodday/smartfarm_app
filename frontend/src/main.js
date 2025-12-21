import './assets/css/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store/index'

// 앱 초기화
const app = createApp(App)

app.use(store)
app.use(router)

app.mount('#app')
