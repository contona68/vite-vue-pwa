/**
 * قفل بیومتریک لایه اپ (مثل قفل صفحه)
 * به سرور چیزی برای لاگین نمی‌فرستد؛ فقط اجازهٔ استفاده از توکن ذخیره‌شده است.
 */

import {
  createPlatformCredential,
  createRandomChallenge,
  getPlatformAssertion,
  isWebAuthnSupported,
} from '@/utils/webAuthn'

const LOCK_PREF_KEY = 'app_lock_pref_v1'

function readPref() {
  try {
    const raw = localStorage.getItem(LOCK_PREF_KEY)
    return raw ? JSON.parse(raw) : { enabled: false, username: '', credentialId: '' }
  } catch (_) {
    return { enabled: false, username: '', credentialId: '' }
  }
}

function writePref(pref) {
  localStorage.setItem(LOCK_PREF_KEY, JSON.stringify(pref))
}

export function isAppLockSupported() {
  return isWebAuthnSupported()
}

export function isAppLockEnabled(username = '') {
  const pref = readPref()
  if (!pref.enabled || !pref.credentialId) return false
  if (!username) return pref.enabled
  return pref.username.toLowerCase() === String(username).trim().toLowerCase()
}

export function getAppLockUsername() {
  return readPref().username || ''
}

/**
 * فعال‌سازی تنظیمات قفل: یک credential محلی برای آنلاک بعدی می‌سازد.
 * هیچ داده‌ای به سرور ارسال نمی‌شود.
 */
export async function enableAppLock(username) {
  if (!isAppLockSupported()) {
    throw new Error('این دستگاه از اثرانگشت پشتیبانی نمی‌کند.')
  }

  const userKey = String(username || '').trim()
  if (!userKey) {
    throw new Error('نام کاربری برای فعال‌سازی قفل لازم است.')
  }

  const challenge = createRandomChallenge()
  const attestation = await createPlatformCredential({
    challenge,
    userId: `applock:${userKey.toLowerCase()}`,
    userName: userKey,
    userDisplayName: userKey,
    excludeCredentialIds: [],
  })

  const credentialId = attestation.rawId || attestation.id
  writePref({
    enabled: true,
    username: userKey,
    credentialId,
    enabledAt: new Date().toISOString(),
  })

  return { ok: true, credentialId }
}

export function disableAppLock() {
  writePref({ enabled: false, username: '', credentialId: '' })
}

/**
 * آنلاک محلی با اثرانگشت — فقط روی دستگاه؛ نتیجه به سرور نمی‌رود.
 */
export async function unlockWithBiometric() {
  const pref = readPref()
  if (!pref.enabled || !pref.credentialId) {
    throw new Error('قفل اثرانگشت فعال نیست.')
  }

  const challenge = createRandomChallenge()
  await getPlatformAssertion({
    challenge,
    allowCredentialIds: [pref.credentialId],
  })

  return { ok: true, username: pref.username }
}
