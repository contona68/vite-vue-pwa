import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { needRefresh, setUpdateHandler } from './pwa/updateState'
import './style.css'

async function setupPwa() {
  if (import.meta.env.DEV) {
    // SW قبلیِ حالت dev جلوی HMR را می‌گیرد — حذفش می‌کنیم
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.unregister()))
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
    }
    return
  }

  const { registerSW } = await import('virtual:pwa-register')
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      needRefresh.value = true
    },
    onRegisteredSW(swUrl, registration) {
      if (!registration) return

      // هر ساعت یک‌بار نسخه جدید را چک می‌کند
      window.setInterval(() => {
        registration.update()
      }, 60 * 60 * 1000)

      console.info('[PWA] Service Worker registered:', swUrl)
    },
    onOfflineReady() {
      console.info('[PWA] App ready to work offline')
    },
  })

  setUpdateHandler(updateSW)
}

setupPwa()

createApp(App).use(router).mount('#app')
