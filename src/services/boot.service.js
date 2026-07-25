import { apiValidateToken } from '@/api/authApi'
import { isAppLockEnabled } from '@/utils/appLock'
import { isFeatureEnabled } from '@/services/appConfig.service'
import {
  clearTokenSession,
  getAccessToken,
  getTokenUsername,
  hasPendingLogin,
  markSessionUnlocked,
} from '@/utils/auth'
import { isBrowserOnline } from '@/utils/network'

/**
 * تصمیم مسیر شروع اپ بعد از لود کانفیگ
 * @returns {Promise<string>} route name
 */
export async function resolveBootRouteName() {
  if (!isBrowserOnline()) {
    return 'login'
  }

  if (hasPendingLogin()) {
    return isFeatureEnabled('otp') ? 'otp' : 'login'
  }

  const token = getAccessToken()
  if (!token) {
    return 'login'
  }

  const username = getTokenUsername()
  const lockEnabledInSettings =
    isFeatureEnabled('appLock') && isAppLockEnabled(username)

  // قفل در تنظیمات روشن → صفحه ورود تصمیم اثرانگشت/مودال/فرم را می‌گیرد
  if (lockEnabledInSettings) {
    return 'login'
  }

  // قفل خاموش → بدون فرم؛ فقط اعتبارسنجی توکن
  const result = await apiValidateToken(token)
  if (!result.ok) {
    clearTokenSession()
    return 'login'
  }

  markSessionUnlocked()
  return 'home'
}
