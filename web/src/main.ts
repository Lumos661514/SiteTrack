import { initMonitor } from '@sitetrack/sdk'
import axios from 'axios'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import { permissionDirective } from './directives/permission'
import { setupRouterGuard } from './router/guard'
import { endSession } from './utils/session'
import { setUnauthorizedHandler } from './utils/request'
import './styles/global.css'

const monitor = initMonitor({
  reportUrl: '/api/monitor/report',
  appKey: 'sitetrack-demo',
})

const app = createApp(App)
app.config.errorHandler = (error) => {
  if (axios.isCancel(error) || axios.isAxiosError(error)) return
  console.error(error)
  monitor.captureException(error)
}
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: zhCn })

app.directive('permission', permissionDirective)
setupRouterGuard(router)
setUnauthorizedHandler(() => {
  endSession(router)
  if (router.currentRoute.value.path !== '/login') {
    void router.replace({ path: '/login' })
  }
})

app.mount('#app')
