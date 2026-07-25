import { needRefresh, setUpdateHandler } from '@/pwa/updateState'
import { isFeatureEnabled } from '@/services/appConfig.service'

/** ثبت PWA / SW بر اساس کانفیگ runtime */
export async function setupPwaRuntime() {
  if (!isFeatureEnabled('pwaRuntime')) {
    console.info('[PWA] Runtime registration skipped by config')
    return
  }

  if (import.meta.env.DEV) {
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
      if (isFeatureEnabled('updateBanner')) {
        needRefresh.value = true
      }
    },
    onRegisteredSW(swUrl, registration) {
      if (!registration) return
      checkForUpdate(registration)
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
