<template>
  <main class="page login-page">
    <section class="login-card" aria-labelledby="unlock-title">
      <div class="brand">
        <img :src="appIcon" alt="لوگوی اپ" width="56" height="56" />
        <h1 id="unlock-title">باز کردن برنامه</h1>
        <p class="subtitle">
          برای ادامه، هویت خود را با اثر انگشت تأیید کنید.
          سپس نشست شما با توکن ذخیره‌شده بررسی می‌شود.
        </p>
      </div>

      <div class="fingerprint-wrap">
        <button
          v-if="!isBusy"
          type="button"
          class="fingerprint-btn"
          aria-label="باز کردن با اثرانگشت"
          @click="onUnlock"
        >
          <svg viewBox="0 0 24 24" width="56" height="56" aria-hidden="true" fill="none">
            <path
              d="M12 2.5c-3.2 0-5.8 2.5-5.8 5.6v1.1M6.2 11.2c0 4.7 2.4 8.8 5.8 10.3 3.4-1.5 5.8-5.6 5.8-10.3M12 6.2c-1.7 0-3.1 1.3-3.1 3v2.2M8.9 12.1c.3 3.1 1.7 5.8 3.1 6.9 1.4-1.1 2.8-3.8 3.1-6.9M12 10.4v3.2"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
          </svg>
        </button>

        <div v-else class="loading-wrap" aria-live="polite">
          <div class="spinner" aria-hidden="true" />
          <p class="loading-text">{{ statusText }}</p>
        </div>
      </div>

      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

      <button type="button" class="skip-link" :disabled="isBusy" @click="goToPasswordLogin">
        ورود با نام کاربری و رمز
      </button>
    </section>
  </main>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiValidateToken } from '@/api/authApi'
import { unlockWithBiometric } from '@/utils/appLock'
import {
  clearTokenSession,
  getAccessToken,
  hasStoredToken,
  markSessionUnlocked,
} from '@/utils/auth'
import { publicUrl } from '@/utils/publicUrl'

const appIcon = publicUrl('icons/android-chrome-192x192.png')
const router = useRouter()
const isBusy = ref(false)
const statusText = ref('در حال ارتباط با حسگر...')
const errorMessage = ref('')

async function goToPasswordLogin() {
  clearTokenSession()
  await router.replace({ name: 'login' })
}

function onUnlock() {
  errorMessage.value = ''
  const token = getAccessToken()
  if (!token) {
    goToPasswordLogin()
    return
  }

  // فوراً biometric را شروع کن تا user-gesture حفظ شود
  const unlockPromise = unlockWithBiometric()
  isBusy.value = true
  statusText.value = 'انگشت خود را روی حسگر قرار دهید...'

  unlockPromise
    .then(async () => {
      statusText.value = 'در حال بررسی نشست...'
      const result = await apiValidateToken(token)
      if (!result.ok) {
        clearTokenSession()
        errorMessage.value = 'نشست منقضی شده است. دوباره وارد شوید.'
        await router.replace({ name: 'login' })
        return
      }
      markSessionUnlocked()
      await router.replace({ name: 'home' })
    })
    .catch((error) => {
      console.warn('[AppLock] unlock failed:', error)
      if (error?.name === 'NotAllowedError') {
        errorMessage.value = 'تأیید اثرانگشت انجام نشد. دوباره تلاش کنید.'
      } else {
        errorMessage.value = error?.message || 'باز کردن برنامه ممکن نشد.'
      }
    })
    .finally(() => {
      isBusy.value = false
    })
}

onMounted(async () => {
  document.documentElement.classList.add('login-no-scroll')
  if (!hasStoredToken()) {
    await router.replace({ name: 'login' })
  }
})

onUnmounted(() => {
  document.documentElement.classList.remove('login-no-scroll')
})
</script>

<style scoped>
.login-page {
  height: 100dvh;
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
  padding: 1.5rem 1.25rem;
  border-radius: 1.25rem;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.25);
  display: grid;
  gap: 1rem;
  justify-items: center;
}

.brand {
  text-align: center;
}

.brand img {
  width: 56px;
  height: 56px;
  border-radius: 1rem;
  margin-bottom: 0.65rem;
}

.brand h1 {
  margin: 0;
  color: #f8fafc;
  font-size: 1.35rem;
}

.subtitle {
  margin: 0.55rem 0 0;
  color: #94a3b8;
  font-size: 0.9rem;
  line-height: 1.6;
}

.fingerprint-wrap {
  min-height: 140px;
  display: grid;
  place-items: center;
}

.fingerprint-btn {
  width: 104px;
  height: 104px;
  border-radius: 50%;
  border: 1px solid rgba(56, 189, 248, 0.45);
  background: rgba(14, 165, 233, 0.14);
  color: #7dd3fc;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.loading-wrap {
  display: grid;
  justify-items: center;
  gap: 0.55rem;
}

.spinner {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 3px solid rgba(125, 211, 252, 0.25);
  border-top-color: #38bdf8;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  margin: 0;
  color: #e0f2fe;
  font-weight: 600;
}

.error {
  margin: 0;
  color: #fda4af;
  font-size: 0.88rem;
  text-align: center;
}

.skip-link {
  border: 0;
  background: transparent;
  color: #64748b;
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
