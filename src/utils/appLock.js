/**
 * قفل بیومتریک لایه اپ (مثل قفل صفحه)
 *
 * تنظیمات فقط یک پرچم true/false است.
 * ثبت/تأیید اثرانگشت فقط هنگام باز کردن برنامه در صفحه ورود انجام می‌شود.
 */

import {
  createPlatformCredential,
  createRandomChallenge,
  getPlatformAssertion,
  isPlatformBiometricAvailable,
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

/** فقط ترجیح کاربر — بدون نیاز به credential ثبت‌شده */
export function isAppLockEnabled(username = '') {
  const pref = readPref()
  if (!pref.enabled) return false
  if (!username) return true
  if (!pref.username) return true
  return pref.username.toLowerCase() === String(username).trim().toLowerCase()
}

export function getAppLockUsername() {
  return readPref().username || ''
}

/**
 * تصمیم ورودی قفل اثرانگشت (ترتیب ثابت)
 * ۱) تنظیمات کاربر
 * ۲) پشتیبانی دستگاه/مرورگر
 * ۳) وجود بیومتریک روی دستگاه
 *
 * @returns {'none' | 'password' | 'modal' | 'biometric'}
 * - none: قفل در تنظیمات خاموش → فقط اعتبارسنجی توکن (بدون فرم/مودال/اثرانگشت)
 * - password: شرط ۱ یا ۲ رد شد → فرم نام کاربری/رمز
 * - modal: ۱ و ۲ اوکی، ۳ نه
 * - biometric: هر سه اوکی
 */
export async function resolveAppLockEntry(username) {
  // ۱
  if (!isAppLockEnabled(username)) {
    return 'none'
  }

  // ۲ — اگر رد شود مرحله ۳ چک نمی‌شود
  if (!isAppLockSupported()) {
    return 'password'
  }

  // ۳
  const hasBiometric = await isPlatformBiometricAvailable()
  if (!hasBiometric) {
    return 'modal'
  }

  return 'biometric'
}

/**
 * ذخیره ترجیح قفل — بدون فراخوانی WebAuthn / بدون دیالوگ اثرانگشت
 */
export function enableAppLock(username) {
  if (!isAppLockSupported()) {
    throw new Error('این دستگاه از اثرانگشت پشتیبانی نمی‌کند.')
  }

  const userKey = String(username || '').trim()
  if (!userKey) {
    throw new Error('نام کاربری برای فعال‌سازی قفل لازم است.')
  }

  const prev = readPref()
  writePref({
    enabled: true,
    username: userKey,
    credentialId:
      prev.username.toLowerCase() === userKey.toLowerCase() ? prev.credentialId || '' : '',
    enabledAt: new Date().toISOString(),
  })

  return { ok: true }
}

export function disableAppLock() {
  writePref({ enabled: false, username: '', credentialId: '' })
}

async function ensureLocalCredential(username) {
  const pref = readPref()
  if (pref.credentialId && pref.username.toLowerCase() === username.toLowerCase()) {
    return pref.credentialId
  }

  const challenge = createRandomChallenge()
  const attestation = await createPlatformCredential({
    challenge,
    userId: `applock:${username.toLowerCase()}`,
    userName: username,
    userDisplayName: username,
  })

  const credentialId = attestation.rawId || attestation.id
  writePref({
    ...pref,
    enabled: true,
    username,
    credentialId,
  })
  return credentialId
}

/**
 * آنلاک محلی با اثرانگشت — فقط روی دستگاه؛ نتیجه به سرور نمی‌رود.
 * بار اول: ثبت credential محلی (همان ژست اثرانگشت کافی است).
 * دفعات بعد: assertion با همان credential.
 */
export async function unlockWithBiometric() {
  const pref = readPref()
  if (!pref.enabled) {
    throw new Error('قفل اثرانگشت فعال نیست.')
  }

  const username = pref.username || ''
  if (!username) {
    throw new Error('نام کاربری قفل یافت نشد.')
  }

  if (!pref.credentialId) {
    await ensureLocalCredential(username)
    return { ok: true, username }
  }

  const challenge = createRandomChallenge()
  await getPlatformAssertion({
    challenge,
    allowCredentialIds: [pref.credentialId],
  })

  return { ok: true, username }
}
