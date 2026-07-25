import { apiIssueToken } from '@/api/authApi'
import {
  clearPendingLogin,
  markSessionUnlocked,
  persistTokenSession,
} from '@/utils/auth'

/** صدور توکن و باز کردن نشست — مشترک بین OTP و لاگین تک‌مرحله‌ای */
export async function completeTokenLogin(username, otpCode = '') {
  const tokenResponse = await apiIssueToken({
    username,
    otpCode,
  })

  persistTokenSession({
    accessToken: tokenResponse.accessToken,
    username: tokenResponse.username,
    expiresAt: tokenResponse.expiresAt,
  })
  clearPendingLogin()
  markSessionUnlocked()

  return tokenResponse
}
