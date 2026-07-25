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

  const ONE_HOUR_MS = 60 * 60 * 1000
  let isCheckingUpdate = false

  async function checkForUpdate(registration) {
    if (!registration || isCheckingUpdate) return
    isCheckingUpdate = true
    try {
      await registration.update()
      console.info('[PWA] Checked for service worker update')
    } catch (error) {
      console.warn('[PWA] Update check failed:', error)
    } finally {
      isCheckingUpdate = false
    }
  }

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      needRefresh.value = true
    },
    onRegisteredSW(swUrl, registration) {
      if (!registration) return

      // یک‌بار هنگام ثبت
      checkForUpdate(registration)

      // بعد از آن دقیقاً هر ۱ ساعت، یک‌بار
      window.setInterval(() => {
        checkForUpdate(registration)
      }, ONE_HOUR_MS)

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
