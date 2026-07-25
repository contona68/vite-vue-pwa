/**
 * تشخیص نوع دستگاه — مشترک بین PWA و قفل اثرانگشت
 */

export function isAndroidDevice() {
  return /Android/i.test(window.navigator.userAgent || '')
}

/** iPhone / iPad / iPod (شامل iPadOS که خود را Mac معرفی می‌کند) */
export function isIosDevice() {
  const ua = window.navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua)) return true
  return window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1
}

/** Safari واقعی روی iOS (نه Chrome/Firefox داخل WebKit) */
export function isIosSafari() {
  if (!isIosDevice()) return false
  const ua = window.navigator.userAgent || ''
  const isWebkit = /WebKit/i.test(ua)
  const isOtherBrowser = /CriOS|FxiOS|OPiOS|EdgiOS|DuckDuckGo|YaBrowser/i.test(ua)
  return isWebkit && !isOtherBrowser
}
