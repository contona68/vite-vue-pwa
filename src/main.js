import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { applySplashFromConfig, loadAppConfig } from './services/appConfig.service'
import { setupPwaRuntime } from './services/pwaRegister.service'
import { startEarlyBeforeInstallPromptCapture } from './utils/pwaInstall'
import './style.css'

// قبل از هر await — BIP موبایل خیلی زود می‌آید
startEarlyBeforeInstallPromptCapture()

async function bootstrap() {
  await loadAppConfig()
  applySplashFromConfig()
  await setupPwaRuntime()
  createApp(App).use(router).mount('#app')
}

bootstrap()
