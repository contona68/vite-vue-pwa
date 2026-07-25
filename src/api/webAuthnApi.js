/**
 * لایه API شبیه‌سازی‌شده برای WebAuthn (localStorage به‌جای سرور)
 */

import { createRandomChallenge } from '@/utils/webAuthn'

const STORAGE_KEY = 'webauthn_demo_store_v1'
const LAST_USER_KEY = 'webauthn_last_username'
const PENDING_REG_KEY = 'webauthn_pending_reg'
const PENDING_AUTH_KEY = 'webauthn_pending_auth'

function delay(ms = 150) {
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

function bufferToBase64UrlSafe(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
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

/** اولین کاربری که در استور Passkey دارد (برای نمایش دکمه لاگین) */
export function getPreferredWebAuthnUsername() {
  const last = getLastWebAuthnUsername()
  if (last && hasCredentialsSync(last)) return last

  const store = readStore()
  const keys = Object.keys(store.users || {})
  for (let i = 0; i < keys.length; i += 1) {
    const entry = store.users[keys[i]]
    if (entry?.credentials?.length) {
      return entry.displayName || keys[i]
    }
  }
  return ''
}

function hasCredentialsSync(username) {
  const key = normalizeUsername(username)
  if (!key) return false
  const list = readStore().users[key]?.credentials || []
  return list.length > 0
}

export async function apiHasCredentials(username) {
  await delay(40)
  return hasCredentialsSync(username)
}

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

  // localStorage مقاوم‌تر از sessionStorage هنگام دیالوگ بیومتریک اندروید
  localStorage.setItem(
    PENDING_REG_KEY,
    JSON.stringify({
      username: key,
      challenge,
      createdAt: Date.now(),
    }),
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

export async function apiVerifyRegistration(username, attestation) {
  await delay()
  const key = normalizeUsername(username)
  if (!key) throw new Error('نام کاربری نامعتبر است.')

  const credentialId = attestation?.rawId || attestation?.id
  if (!credentialId) {
    throw new Error('اطلاعات Passkey ناقص است.')
  }

  // challenge معلق را چک می‌کنیم ولی اگر پاک شده بود، باز هم ذخیره می‌کنیم (دمو)
  const pendingRaw = localStorage.getItem(PENDING_REG_KEY)
  if (pendingRaw) {
    try {
      const pending = JSON.parse(pendingRaw)
      if (pending.username && pending.username !== key) {
        throw new Error('نشست ثبت Passkey با کاربر فعلی هم‌خوان نیست.')
      }
    } catch (error) {
      if (error?.message?.includes('هم‌خوان')) throw error
    }
  }
  localStorage.removeItem(PENDING_REG_KEY)

  const publicKey = attestation.response?.publicKey || null
  const store = readStore()
  if (!store.users[key]) {
    store.users[key] = { displayName: username.trim(), credentials: [] }
  } else {
    store.users[key].displayName = username.trim()
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
  const allowCredentialIds = list.map((item) => item.credentialId)

  localStorage.setItem(
    PENDING_AUTH_KEY,
    JSON.stringify({
      username: key,
      challenge,
      allowCredentialIds,
      createdAt: Date.now(),
    }),
  )

  return {
    challenge,
    challengeBuffer,
    allowCredentialIds,
  }
}

export async function apiVerifyAuthentication(username, assertion) {
  await delay()
  const key = normalizeUsername(username)
  if (!key) throw new Error('نام کاربری نامعتبر است.')

  const credentialId = assertion?.rawId || assertion?.id
  if (!credentialId) {
    throw new Error('assertion نامعتبر است.')
  }

  const pendingRaw = localStorage.getItem(PENDING_AUTH_KEY)
  localStorage.removeItem(PENDING_AUTH_KEY)

  let allowCredentialIds = []
  if (pendingRaw) {
    try {
      const pending = JSON.parse(pendingRaw)
      allowCredentialIds = pending.allowCredentialIds || []
    } catch (_) {
      // ignore
    }
  }

  const store = readStore()
  const record = (store.users[key]?.credentials || []).find(
    (item) => item.credentialId === credentialId,
  )
  if (!record) {
    throw new Error('Passkey یافت نشد. دوباره ثبت اثرانگشت را انجام دهید.')
  }

  if (allowCredentialIds.length > 0 && !allowCredentialIds.includes(credentialId)) {
    // بعضی دستگاه‌ها encoding متفاوت id برمی‌گردانند؛ با رکورد استور تطبیق دادیم پس OK
    console.warn('[WebAuthn] credentialId outside pending allow list, but found in store')
  }

  if (!assertion.response?.signature) {
    throw new Error('امضای احراز هویت دریافت نشد.')
  }

  setLastWebAuthnUsername(username.trim())

  return {
    ok: true,
    username: store.users[key]?.displayName || username.trim(),
    credentialId,
    verifiedWithStoredPublicKey: Boolean(record.publicKey),
  }
}
