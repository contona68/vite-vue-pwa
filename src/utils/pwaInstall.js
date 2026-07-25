import { isAndroidDevice, isIosDevice, isIosSafari } from '@/utils/device'

const INSTALLED_KEY = 'pwa-app-installed'
const DISMISS_LOADS_KEY = 'pwa-install-loads-since-dismiss'
const SHOW_EVERY_N_LOADS = 5

export { isAndroidDevice, isIosDevice, isIosSafari }

export function markPwaInstalled() {
  localStorage.setItem(INSTALLED_KEY, '1')
  localStorage.removeItem(DISMISS_LOADS_KEY)
}

export function clearPwaInstalledFlag() {
  localStorage.removeItem(INSTALLED_KEY)
}

export function hasInstalledFlag() {
  return localStorage.getItem(INSTALLED_KEY) === '1'
}

export function isStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  )
}

export function getLoadsSinceDismiss() {
  const raw = localStorage.getItem(DISMISS_LOADS_KEY)
  if (raw === null) return null
  const value = Number(raw)
  return Number.isNaN(value) ? 0 : value
}

export function setLoadsSinceDismiss(value) {
  localStorage.setItem(DISMISS_LOADS_KEY, String(value))
}

export function shouldHideByDismissPolicy() {
  const loads = getLoadsSinceDismiss()
  if (loads === null) return false
  return loads < SHOW_EVERY_N_LOADS
}

export function incrementDismissLoadCount() {
  const loads = getLoadsSinceDismiss()
  if (loads === null) return
  setLoadsSinceDismiss(loads + 1)
}

function isRelatedWebAppInstalled(relatedApps) {
  if (!Array.isArray(relatedApps) || relatedApps.length === 0) return false
  return relatedApps.some((app) => !app.platform || app.platform === 'webapp')
}

/**
 * آیا PWA از قبل روی دستگاه نصب است؟
 * iOS: فقط حالت standalone (فلگ localStorage در Safari گمراه‌کننده است)
 * اندروید/دسکتاپ: standalone + getInstalledRelatedApps + فلگ محلی
 */
export async function isPwaAlreadyInstalled() {
  if (isStandaloneMode()) {
    markPwaInstalled()
    return true
  }

  // روی iOS نصب یعنی از Home Screen باز شده؛ در تب مرورگر همیشه قابل‌نصب است
  if (isIosDevice()) {
    return false
  }

  if ('getInstalledRelatedApps' in navigator) {
    try {
      const relatedApps = await navigator.getInstalledRelatedApps()
      if (isRelatedWebAppInstalled(relatedApps)) {
        markPwaInstalled()
        return true
      }
      if (hasInstalledFlag()) {
        clearPwaInstalledFlag()
      }
      return false
    } catch (_) {
      // پشتیبانی ناقص — به فلگ محلی برمی‌گردیم
    }
  }

  return hasInstalledFlag()
}
