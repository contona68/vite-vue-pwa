/**
 * WebAuthn helpers (مرورگر)
 * تبدیل‌ها و create/get سطح پایین — بدون ذخیره؛ ذخیره در لایه API شبیه‌سازی‌شده است.
 */

function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBuffer(base64Url) {
  const padded = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (padded.length % 4)) % 4
  const base64 = padded + '='.repeat(padLength)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export function getRpId() {
  return window.location.hostname
}

export function isWebAuthnSupported() {
  return (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential != null &&
    typeof navigator.credentials?.create === 'function' &&
    typeof navigator.credentials?.get === 'function'
  )
}

/** آیا authenticator پلتفرم (اثرانگشت/Face ID) در دسترس است؟ */
export async function isPlatformAuthenticatorAvailable() {
  if (!isWebAuthnSupported()) return false
  if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function') {
    return true
  }
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch (_) {
    return false
  }
}

export function createRandomChallenge(byteLength = 32) {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return bytes.buffer
}

export async function createPlatformCredential({
  challenge,
  userId,
  userName,
  userDisplayName,
  excludeCredentialIds = [],
}) {
  const publicKey = {
    challenge,
    rp: {
      name: 'هایپریک',
      id: getRpId(),
    },
    user: {
      id: typeof userId === 'string' ? new TextEncoder().encode(userId) : userId,
      name: userName,
      displayName: userDisplayName || userName,
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 },
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
      requireResidentKey: false,
    },
    timeout: 60_000,
    attestation: 'none',
    excludeCredentials: excludeCredentialIds.map((id) => ({
      type: 'public-key',
      id: typeof id === 'string' ? base64UrlToBuffer(id) : id,
      transports: ['internal'],
    })),
  }

  const credential = await navigator.credentials.create({ publicKey })
  if (!credential) {
    throw new Error('ساخت Passkey لغو شد یا ناموفق بود.')
  }

  return serializeAttestation(credential)
}

export async function getPlatformAssertion({ challenge, allowCredentialIds = [] }) {
  const publicKey = {
    challenge,
    timeout: 60_000,
    userVerification: 'required',
    rpId: getRpId(),
    allowCredentials: allowCredentialIds.map((id) => ({
      type: 'public-key',
      id: typeof id === 'string' ? base64UrlToBuffer(id) : id,
      transports: ['internal'],
    })),
  }

  const assertion = await navigator.credentials.get({ publicKey })
  if (!assertion) {
    throw new Error('احراز هویت با اثرانگشت لغو شد یا ناموفق بود.')
  }

  return serializeAssertion(assertion)
}

function serializeAttestation(credential) {
  const response = credential.response
  const publicKeyBuffer =
    typeof response.getPublicKey === 'function' ? response.getPublicKey() : null

  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment || 'platform',
    response: {
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      attestationObject: bufferToBase64Url(response.attestationObject),
      publicKey: publicKeyBuffer ? bufferToBase64Url(publicKeyBuffer) : null,
      publicKeyAlgorithm:
        typeof response.getPublicKeyAlgorithm === 'function'
          ? response.getPublicKeyAlgorithm()
          : null,
      transports:
        typeof response.getTransports === 'function' ? response.getTransports() : ['internal'],
    },
  }
}

function serializeAssertion(assertion) {
  const response = assertion.response
  return {
    id: assertion.id,
    rawId: bufferToBase64Url(assertion.rawId),
    type: assertion.type,
    authenticatorAttachment: assertion.authenticatorAttachment || 'platform',
    response: {
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      authenticatorData: bufferToBase64Url(response.authenticatorData),
      signature: bufferToBase64Url(response.signature),
      userHandle: response.userHandle ? bufferToBase64Url(response.userHandle) : null,
    },
  }
}

export { bufferToBase64Url, base64UrlToBuffer }
