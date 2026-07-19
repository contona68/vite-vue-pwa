const AUTH_STORAGE_KEY = 'demo_user'

export function getCurrentUser() {
  return sessionStorage.getItem(AUTH_STORAGE_KEY) || ''
}

export function isLoggedIn() {
  return Boolean(getCurrentUser())
}

export function login(username) {
  sessionStorage.setItem(AUTH_STORAGE_KEY, username)
}

export function logout() {
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
}
