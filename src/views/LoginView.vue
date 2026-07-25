<template>
  <main class="page login-page">
    <div class="connection-bar" aria-live="polite">
      <span
        class="wifi-icon"
        :class="{ offline: !isOnline }"
        :title="isOnline ? 'آنلاین' : 'آفلاین'"
        :aria-label="isOnline ? 'اتصال اینترنت برقرار است' : 'اتصال اینترنت قطع است'"
      >
        <!-- online wifi -->
        <svg v-if="isOnline" viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <path
            d="M12 18.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z"
            fill="currentColor"
          />
          <path
            d="M8.5 14.2a5.2 5.2 0 0 1 7 0M5.5 11a9.2 9.2 0 0 1 13 0M2.8 7.8a13.2 13.2 0 0 1 18.4 0"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          />
        </svg>
        <!-- offline wifi -->
        <svg v-else viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <path
            d="M12 18.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z"
            fill="currentColor"
          />
          <path
            d="M8.5 14.2a5.2 5.2 0 0 1 7 0M5.5 11c1.2-1.1 2.7-1.9 4.3-2.3M18.5 11c-.7-.6-1.5-1.1-2.3-1.5M2.8 7.8c1.4-1.2 3-2.1 4.7-2.7M21.2 7.8c-1.2-1-2.5-1.8-4-2.3M4 4l16 16"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          />
        </svg>
      </span>
      <p v-if="!isOnline" class="offline-message">حالت آفلاین — صفحه از کش نمایش داده می‌شود</p>
    </div>

    <section class="login-card" aria-labelledby="login-title">
      <div class="brand">
        <img :src="appIcon" alt="لوگوی اپ" width="64" height="64" />
        <h1 id="login-title">ورود به حساب</h1>
      </div>

      <div v-if="showBiometricButton" class="biometric-hero">
        <button
          type="button"
          class="fingerprint-btn"
          :class="{ busy: isBiometricSubmitting }"
          :disabled="isSubmitting || isBiometricSubmitting"
          :aria-label="biometricStatusText"
          @click="onBiometricLogin"
        >
          <svg viewBox="0 0 24 24" width="56" height="56" aria-hidden="true" fill="none">
            <path
              d="M12 2.5c-3.2 0-5.8 2.5-5.8 5.6v1.1"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
            <path
              d="M6.2 11.2c0 4.7 2.4 8.8 5.8 10.3 3.4-1.5 5.8-5.6 5.8-10.3"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
            <path
              d="M12 6.2c-1.7 0-3.1 1.3-3.1 3v2.2"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
            <path
              d="M8.9 12.1c.3 3.1 1.7 5.8 3.1 6.9 1.4-1.1 2.8-3.8 3.1-6.9"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
            <path
              d="M12 10.4v3.2"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
          </svg>
        </button>
        <p class="biometric-status">{{ biometricStatusText }}</p>
      </div>

      <div v-if="showBiometricButton" class="divider" aria-hidden="true"><span>یا ورود با رمز</span></div>

      <form class="login-form" @submit.prevent="onSubmit">
        <label class="field">
          <span>نام کاربری</span>
          <input
            v-model.trim="username"
            type="text"
            name="username"
            autocomplete="username"
            placeholder="مثلاً admin"
            required
            @input="refreshBiometricAvailability"
          />
        </label>

        <label class="field">
          <span>رمز عبور</span>
          <input
            v-model="password"
            type="password"
            name="password"
            autocomplete="current-password"
            placeholder="••••••••"
            required
          />
        </label>

        <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

        <button class="btn primary" type="submit" :disabled="isSubmitting || isBiometricSubmitting">
          {{ isSubmitting ? 'در حال ورود...' : 'ورود' }}
        </button>
      </form>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  apiHasCredentials,
  apiPrepareAuthenticationOptionsSync,
  apiVerifyAuthentication,
  getPreferredWebAuthnUsername,
  setLastWebAuthnUsername,
} from '@/api/webAuthnApi'
import { completeLogin, login } from '@/utils/auth'
import { publicUrl } from '@/utils/publicUrl'
import { getPlatformAssertion, isWebAuthnSupported } from '@/utils/webAuthn'

const appIcon = publicUrl('icons/android-chrome-192x192.png')
const router = useRouter()
const username = ref('')
const password = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)
const isBiometricSubmitting = ref(false)
const webAuthnSupported = ref(null)
const hasCredentialsForUser = ref(false)
const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)

const biometricUsername = computed(() => username.value.trim() || getPreferredWebAuthnUsername())
const showBiometricButton = computed(
  () =>
    webAuthnSupported.value === true &&
    hasCredentialsForUser.value &&
    Boolean(biometricUsername.value),
)
const biometricStatusText = computed(() => {
  if (isBiometricSubmitting.value) {
    return 'انگشت خود را روی حسگر اثرانگشت قرار دهید...'
  }
  return 'برای ورود، روی اثرانگشت بزنید'
})

function syncOnlineStatus() {
  isOnline.value = navigator.onLine
}

async function refreshBiometricAvailability() {
  if (webAuthnSupported.value !== true) {
    hasCredentialsForUser.value = false
    return
  }

  const target = biometricUsername.value
  if (!target) {
    hasCredentialsForUser.value = false
    return
  }

  try {
    hasCredentialsForUser.value = await apiHasCredentials(target)
  } catch (_) {
    hasCredentialsForUser.value = false
  }
}

async function onSubmit() {
  errorMessage.value = ''
  isSubmitting.value = true

  try {
    await new Promise((resolve) => setTimeout(resolve, 400))

    if (!username.value || !password.value) {
      errorMessage.value = 'نام کاربری و رمز عبور الزامی است.'
      return
    }

    setLastWebAuthnUsername(username.value)
    login(username.value)
    await router.push({ name: 'otp' })
  } finally {
    isSubmitting.value = false
  }
}

function onBiometricLogin() {
  errorMessage.value = ''
  const targetUser = biometricUsername.value
  if (!targetUser) {
    errorMessage.value = 'ابتدا نام کاربری را وارد کنید.'
    return
  }

  let options
  try {
    options = apiPrepareAuthenticationOptionsSync(targetUser)
  } catch (error) {
    errorMessage.value = error?.message || 'آماده‌سازی ورود بیومتریک ناموفق بود.'
    return
  }

  const assertPromise = getPlatformAssertion({
    challenge: options.challengeBuffer,
    allowCredentialIds: options.allowCredentialIds,
  })

  isBiometricSubmitting.value = true

  assertPromise
    .then((assertion) => apiVerifyAuthentication(targetUser, assertion))
    .then((result) => {
      if (!result.ok) {
        throw new Error('تأیید اثرانگشت ناموفق بود.')
      }
      completeLogin(result.username)
      return router.replace({ name: 'home' })
    })
    .catch((error) => {
      console.warn('[WebAuthn] login failed:', error)
      if (error?.name === 'NotAllowedError') {
        errorMessage.value = 'احراز هویت بیومتریک لغو شد یا حسگر پاسخ نداد.'
      } else {
        errorMessage.value = error?.message || 'ورود با اثرانگشت ممکن نشد.'
      }
    })
    .finally(() => {
      isBiometricSubmitting.value = false
    })
}

onMounted(async () => {
  document.documentElement.classList.add('login-no-scroll')
  window.addEventListener('online', syncOnlineStatus)
  window.addEventListener('offline', syncOnlineStatus)
  window.addEventListener('focus', refreshBiometricAvailability)

  const preferred = getPreferredWebAuthnUsername()
  if (preferred && !username.value) {
    username.value = preferred
  }

  webAuthnSupported.value = isWebAuthnSupported()
  await refreshBiometricAvailability()
})

onUnmounted(() => {
  document.documentElement.classList.remove('login-no-scroll')
  window.removeEventListener('online', syncOnlineStatus)
  window.removeEventListener('offline', syncOnlineStatus)
  window.removeEventListener('focus', refreshBiometricAvailability)
})
</script>

<style scoped>
.login-page {
  position: relative;
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
  display: grid;
  place-items: center;
  padding: 1rem;
  background:
    radial-gradient(ellipse at 20% 10%, rgba(56, 189, 248, 0.18), transparent 50%),
    radial-gradient(ellipse at 80% 90%, rgba(99, 102, 241, 0.16), transparent 45%),
    #0f172a;
}

.connection-bar {
  position: absolute;
  top: 0.75rem;
  inset-inline: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  z-index: 5;
  pointer-events: none;
}

.wifi-icon {
  color: #38bdf8;
  display: inline-flex;
  opacity: 0.9;
}

.wifi-icon.offline {
  color: #f87171;
}

.offline-message {
  margin: 0;
  color: #f87171;
  font-size: 0.82rem;
  font-weight: 600;
  text-align: center;
  padding-inline: 1rem;
}

.login-card {
  width: min(100%, 420px);
  max-height: calc(100dvh - 2rem);
  overflow: auto;
  padding: 1.5rem 1.25rem;
  border-radius: 1.25rem;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.25);
  backdrop-filter: blur(10px);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
}

.brand {
  text-align: center;
  margin-bottom: 1.1rem;
}

.brand img {
  width: 56px;
  height: 56px;
  border-radius: 1rem;
  margin-bottom: 0.65rem;
}

.brand h1 {
  margin: 0;
  font-size: 1.45rem;
  color: #f8fafc;
}

.biometric-hero {
  display: grid;
  justify-items: center;
  gap: 0.55rem;
  margin-bottom: 0.35rem;
}

.fingerprint-btn {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  border: 1px solid rgba(56, 189, 248, 0.45);
  background:
    radial-gradient(circle at 35% 30%, rgba(125, 211, 252, 0.35), transparent 55%),
    rgba(14, 165, 233, 0.14);
  color: #7dd3fc;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 10px 28px rgba(14, 165, 233, 0.2);
}

.fingerprint-btn.busy {
  animation: pulse 1.2s ease-in-out infinite;
  color: #fde68a;
  border-color: rgba(251, 191, 36, 0.55);
}

.fingerprint-btn:disabled {
  cursor: wait;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.biometric-status {
  margin: 0;
  text-align: center;
  color: #e0f2fe;
  font-size: 0.92rem;
  font-weight: 600;
}

.divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1rem 0;
  color: #64748b;
  font-size: 0.8rem;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(148, 163, 184, 0.25);
}

.login-form {
  display: grid;
  gap: 0.85rem;
}

.field {
  display: grid;
  gap: 0.35rem;
  color: #cbd5e1;
  font-size: 0.9rem;
}

.field input {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(2, 6, 23, 0.55);
  color: #f8fafc;
  border-radius: 0.75rem;
  padding: 0.7rem 0.85rem;
  font: inherit;
  outline: none;
}

.field input:focus {
  border-color: #38bdf8;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
}

.btn {
  border: 0;
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.btn.primary {
  background: linear-gradient(135deg, #38bdf8, #6366f1);
  color: #0f172a;
}

.btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.error {
  margin: 0;
  color: #fda4af;
  font-size: 0.88rem;
}
</style>
