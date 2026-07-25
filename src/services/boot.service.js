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

/**
 * تصمیم مسیر شروع اپ بعد از لود کانفیگ
 * @returns {Promise<string>} route name
 */
export async function resolveBootRouteName() {
  if (hasPendingLogin()) {
    return isFeatureEnabled('otp') ? 'otp' : 'login'
  }

  const token = getAccessToken()
  if (!token) {
    return 'login'
  }

  const username = getTokenUsername()
  // قفل فعال باشد → صفحه ورود (آنجا اثرانگشت نشان داده می‌شود)
  if (isFeatureEnabled('appLock') && isAppLockEnabled(username)) {
    return 'login'
  }

  const result = await apiValidateToken(token)
  if (!result.ok) {
    clearTokenSession()
    return 'login'
  }

  markSessionUnlocked()
  return 'home'
}
