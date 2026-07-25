<template>
  <main class="page login-page">
    <section class="login-card" aria-labelledby="login-title">
      <div class="brand">
        <img :src="appIcon" alt="لوگوی اپ" width="64" height="64" />
        <h1 id="login-title">ورود به حساب</h1>
        <p class="subtitle">این صفحه برای استفاده آفلاین کش می‌شود. (نسخه ۰.۰.۴)</p>
      </div>

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

      <div v-if="showBiometricButton" class="biometric-block">
        <div class="divider" aria-hidden="true"><span>یا</span></div>
        <button
          type="button"
          class="btn biometric"
          :disabled="isSubmitting || isBiometricSubmitting"
          @click="onBiometricLogin"
        >
          {{ isBiometricSubmitting ? 'در انتظار اثرانگشت...' : 'ورود با اثر انگشت / Face ID' }}
        </button>
        <p class="biometric-hint">برای کاربر «{{ biometricUsername }}»</p>
      </div>

      <p v-else-if="webAuthnReady === false" class="biometric-hint muted">
        این دستگاه از ورود بیومتریک پشتیبانی نمی‌کند.
      </p>

      <p class="offline-hint" :data-online="isOnline">
        {{ isOnline ? 'اتصال اینترنت برقرار است' : 'حالت آفلاین — صفحه از کش نمایش داده می‌شود' }}
      </p>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  apiGetAuthenticationOptions,
  apiHasCredentials,
  apiVerifyAuthentication,
  getLastWebAuthnUsername,
  setLastWebAuthnUsername,
} from '@/api/webAuthnApi'
import { completeLogin, login } from '@/utils/auth'
import { publicUrl } from '@/utils/publicUrl'
import {
  getPlatformAssertion,
  isPlatformAuthenticatorAvailable,
  isWebAuthnSupported,
} from '@/utils/webAuthn'

const appIcon = publicUrl('icons/android-chrome-192x192.png')
const router = useRouter()
const username = ref('')
const password = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)
const isBiometricSubmitting = ref(false)
const webAuthnReady = ref(null)
const hasCredentialsForUser = ref(false)
const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)

const biometricUsername = computed(() => username.value.trim() || getLastWebAuthnUsername())
const showBiometricButton = computed(
  () => webAuthnReady.value === true && hasCredentialsForUser.value && Boolean(biometricUsername.value),
)

function syncOnlineStatus() {
  isOnline.value = navigator.onLine
}

async function refreshBiometricAvailability() {
  if (webAuthnReady.value !== true) {
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

async function onBiometricLogin() {
  errorMessage.value = ''
  const targetUser = biometricUsername.value
  if (!targetUser) {
    errorMessage.value = 'ابتدا نام کاربری را وارد کنید.'
    return
  }

  isBiometricSubmitting.value = true

  try {
    const options = await apiGetAuthenticationOptions(targetUser)
    const assertion = await getPlatformAssertion({
      challenge: options.challengeBuffer,
      allowCredentialIds: options.allowCredentialIds,
    })

    const result = await apiVerifyAuthentication(targetUser, assertion)
    if (!result.ok) {
      errorMessage.value = 'تأیید اثرانگشت ناموفق بود.'
      return
    }

    completeLogin(result.username)
    await router.push({ name: 'home' })
  } catch (error) {
    if (error?.name === 'NotAllowedError') {
      errorMessage.value = 'احراز هویت بیومتریک لغو شد.'
    } else {
      errorMessage.value = error?.message || 'ورود با اثرانگشت ممکن نشد.'
    }
  } finally {
    isBiometricSubmitting.value = false
  }
}

onMounted(async () => {
  document.documentElement.classList.add('login-no-scroll')
  window.addEventListener('online', syncOnlineStatus)
  window.addEventListener('offline', syncOnlineStatus)

  const lastUser = getLastWebAuthnUsername()
  if (lastUser && !username.value) {
    username.value = lastUser
  }

  webAuthnReady.value = isWebAuthnSupported() && (await isPlatformAuthenticatorAvailable())
  await refreshBiometricAvailability()
})

onUnmounted(() => {
  document.documentElement.classList.remove('login-no-scroll')
  window.removeEventListener('online', syncOnlineStatus)
  window.removeEventListener('offline', syncOnlineStatus)
})
</script>

<style scoped>
.login-page {
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
  margin-bottom: 1.25rem;
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

.subtitle {
  margin: 0.4rem 0 0;
  color: #94a3b8;
  font-size: 0.88rem;
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

.btn.biometric {
  width: 100%;
  background: rgba(14, 165, 233, 0.16);
  color: #e0f2fe;
  border: 1px solid rgba(56, 189, 248, 0.45);
}

.btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.biometric-block {
  margin-top: 1rem;
  display: grid;
  gap: 0.65rem;
}

.divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
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

.biometric-hint {
  margin: 0;
  text-align: center;
  color: #94a3b8;
  font-size: 0.78rem;
}

.biometric-hint.muted {
  margin-top: 0.85rem;
}

.error {
  margin: 0;
  color: #fda4af;
  font-size: 0.88rem;
}

.offline-hint {
  margin: 1rem 0 0;
  text-align: center;
  font-size: 0.8rem;
  color: #64748b;
}

.offline-hint[data-online='false'] {
  color: #fbbf24;
}
</style>
