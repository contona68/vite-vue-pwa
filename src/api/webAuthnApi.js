/**
 * لایه API شبیه‌سازی‌شده برای WebAuthn
 * امضای متدها مثل سرور واقعی است؛ پیاده‌سازی فعلاً با localStorage.
 *
 * بعداً فقط بدنه این توابع با fetch به بک‌اند عوض می‌شود.
 */

import { createRandomChallenge } from '@/utils/webAuthn'

const STORAGE_KEY = 'webauthn_demo_store_v1'
const LAST_USER_KEY = 'webauthn_last_username'

function delay(ms = 220) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { users: {} }
    const parsed = JSON.parse(raw)
    return parsed?.users ? parsed : { users: {} }
  } catch (_) {
    return { users: {} }
  }
}

function writeStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase()
}

export function getLastWebAuthnUsername() {
  return localStorage.getItem(LAST_USER_KEY) || ''
}

export function setLastWebAuthnUsername(username) {
  const value = String(username || '').trim()
  if (!value) {
    localStorage.removeItem(LAST_USER_KEY)
    return
  }
  localStorage.setItem(LAST_USER_KEY, value)
}

/** آیا برای این کاربر حداقل یک Passkey ثبت شده؟ */
export async function apiHasCredentials(username) {
  await delay(80)
  const key = normalizeUsername(username)
  if (!key) return false
  const store = readStore()
  const list = store.users[key]?.credentials || []
  return list.length > 0
}

/** گزینه‌های ثبت — معادل POST /webauthn/register/options */
export async function apiGetRegistrationOptions(username) {
  await delay()
  const key = normalizeUsername(username)
  if (!key) {
    throw new Error('نام کاربری برای ثبت Passkey الزامی است.')
  }

  const store = readStore()
  const existing = store.users[key]?.credentials || []
  const challengeBuffer = createRandomChallenge()
  const challenge = bufferToBase64UrlSafe(challengeBuffer)

  // challenge موقت برای bind کردن مرحله بعد (شبیه‌سازی session سرور)
  sessionStorage.setItem(
    `webauthn_reg_challenge:${key}`,
    JSON.stringify({ challenge, createdAt: Date.now() }),
  )

  return {
    challenge,
    challengeBuffer,
    user: {
      id: key,
      name: username.trim(),
      displayName: username.trim(),
    },
    excludeCredentialIds: existing.map((item) => item.credentialId),
  }
}

/** ذخیره credential — معادل POST /webauthn/register/verify */
export async function apiVerifyRegistration(username, attestation) {
  await delay()
  const key = normalizeUsername(username)
  if (!key) throw new Error('نام کاربری نامعتبر است.')
  if (!attestation?.rawId && !attestation?.id) {
    throw new Error('اطلاعات Passkey ناقص است.')
  }

  const pendingRaw = sessionStorage.getItem(`webauthn_reg_challenge:${key}`)
  if (!pendingRaw) {
    throw new Error('نشست ثبت Passkey منقضی شده است. دوباره تلاش کنید.')
  }
  sessionStorage.removeItem(`webauthn_reg_challenge:${key}`)

  const credentialId = attestation.rawId || attestation.id
  const publicKey = attestation.response?.publicKey || null

  const store = readStore()
  if (!store.users[key]) {
    store.users[key] = { credentials: [] }
  }

  const already = store.users[key].credentials.some((item) => item.credentialId === credentialId)
  if (!already) {
    store.users[key].credentials.push({
      credentialId,
      publicKey,
      publicKeyAlgorithm: attestation.response?.publicKeyAlgorithm ?? null,
      transports: attestation.response?.transports || ['internal'],
      createdAt: new Date().toISOString(),
    })
  }

  writeStore(store)
  setLastWebAuthnUsername(username.trim())

  return {
    ok: true,
    credentialId,
    publicKeyStored: Boolean(publicKey),
  }
}

/** گزینه‌های ورود — معادل POST /webauthn/login/options */
export async function apiGetAuthenticationOptions(username) {
  await delay()
  const key = normalizeUsername(username)
  if (!key) {
    throw new Error('نام کاربری برای ورود با اثرانگشت الزامی است.')
  }

  const store = readStore()
  const list = store.users[key]?.credentials || []
  if (list.length === 0) {
    throw new Error('برای این کاربر Passkey ثبت نشده است.')
  }

  const challengeBuffer = createRandomChallenge()
  const challenge = bufferToBase64UrlSafe(challengeBuffer)

  sessionStorage.setItem(
    `webauthn_auth_challenge:${key}`,
    JSON.stringify({
      challenge,
      allowCredentialIds: list.map((item) => item.credentialId),
      createdAt: Date.now(),
    }),
  )

  return {
    challenge,
    challengeBuffer,
    allowCredentialIds: list.map((item) => item.credentialId),
  }
}

/**
 * تأیید ورود — معادل POST /webauthn/login/verify
 * در دمو: وجود credentialId ثبت‌شده + موفقیت credentials.get کافی است.
 * در پروداکشن: verify واقعی امضا با publicKey سمت سرور انجام می‌شود.
 */
export async function apiVerifyAuthentication(username, assertion) {
  await delay()
  const key = normalizeUsername(username)
  if (!key) throw new Error('نام کاربری نامعتبر است.')

  const pendingRaw = sessionStorage.getItem(`webauthn_auth_challenge:${key}`)
  if (!pendingRaw) {
    throw new Error('نشست ورود Passkey منقضی شده است. دوباره تلاش کنید.')
  }
  sessionStorage.removeItem(`webauthn_auth_challenge:${key}`)

  const pending = JSON.parse(pendingRaw)
  const credentialId = assertion.rawId || assertion.id
  if (!credentialId) {
    throw new Error('assertion نامعتبر است.')
  }

  if (!pending.allowCredentialIds?.includes(credentialId)) {
    throw new Error('این Passkey برای کاربر ثبت نشده است.')
  }

  const store = readStore()
  const record = (store.users[key]?.credentials || []).find(
    (item) => item.credentialId === credentialId,
  )
  if (!record) {
    throw new Error('Passkey یافت نشد.')
  }

  // شبیه‌سازی تأیید سرور: وجود رکورد + signature برگشتی از دستگاه
  if (!assertion.response?.signature) {
    throw new Error('امضای احراز هویت دریافت نشد.')
  }

  setLastWebAuthnUsername(username.trim())

  return {
    ok: true,
    username: username.trim(),
    credentialId,
    // در پروداکشن اینجا token/session برمی‌گردد
    verifiedWithStoredPublicKey: Boolean(record.publicKey),
  }
}

function bufferToBase64UrlSafe(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}
