/**
 * API شبیه‌سازی‌شده احراز هویت مبتنی بر توکن
 * بعداً فقط بدنه این متدها با fetch واقعی عوض می‌شود.
 */

const DEMO_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

function delay(ms = 200) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function createDemoToken(username) {
  const payload = `${username}:${Date.now()}:${Math.random().toString(36).slice(2)}`
  return `demo.${btoa(unescape(encodeURIComponent(payload)))}`
}

/**
 * بعد از OTP موفق — صدور توکن
 * معادل POST /auth/token یا /auth/verify-otp
 */
export async function apiIssueToken({ username, otpCode }) {
  await delay()

  if (!username) {
    throw new Error('نام کاربری نامعتبر است.')
  }

  // در دمو OTP بیرون چک می‌شود؛ اینجا فقط توکن می‌سازیم
  void otpCode

  const expiresAt = Date.now() + DEMO_TOKEN_TTL_MS
  return {
    accessToken: createDemoToken(username),
    username,
    expiresAt,
    tokenType: 'Bearer',
  }
}

/**
 * بررسی اعتبار توکن ذخیره‌شده
 * معادل GET /auth/me یا POST /auth/validate
 */
export async function apiValidateToken(accessToken) {
  await delay(150)

  if (!accessToken) {
    return { ok: false, reason: 'missing' }
  }

  if (!String(accessToken).startsWith('demo.')) {
    return { ok: false, reason: 'invalid' }
  }

  // متای محلی برای انقضا (شبیه‌سازی سرور)
  try {
    const raw = localStorage.getItem('auth_token_meta')
    if (raw) {
      const meta = JSON.parse(raw)
      if (meta?.expiresAt && Date.now() > Number(meta.expiresAt)) {
        return { ok: false, reason: 'expired' }
      }
      return { ok: true, username: meta.username || '' }
    }
  } catch (_) {
    // ignore
  }

  return { ok: true, username: '' }
}
