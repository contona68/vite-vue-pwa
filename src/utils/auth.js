const AUTH_STORAGE_KEY = 'demo_user'
const OTP_VERIFIED_KEY = 'demo_otp_verified'

/** کد دمو برای تست تا API واقعی وصل شود */
export const DEMO_OTP_CODE = '123456'

export function getCurrentUser() {
  return sessionStorage.getItem(AUTH_STORAGE_KEY) || ''
}

export function isOtpVerified() {
  return sessionStorage.getItem(OTP_VERIFIED_KEY) === '1'
}

export function isLoggedIn() {
  return Boolean(getCurrentUser()) && isOtpVerified()
}

export function hasPendingLogin() {
  return Boolean(getCurrentUser()) && !isOtpVerified()
}

export function login(username) {
  sessionStorage.setItem(AUTH_STORAGE_KEY, username)
  sessionStorage.removeItem(OTP_VERIFIED_KEY)
}

export function markOtpVerified() {
  sessionStorage.setItem(OTP_VERIFIED_KEY, '1')
}

export function logout() {
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
  sessionStorage.removeItem(OTP_VERIFIED_KEY)
}
