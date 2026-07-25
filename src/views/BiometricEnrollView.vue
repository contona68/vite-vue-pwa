<template>
  <main class="page login-page">
    <section class="login-card" aria-labelledby="enroll-title">
      <div class="brand">
        <img :src="appIcon" alt="لوگوی اپ" width="56" height="56" />
        <h1 id="enroll-title">ورود سریع با اثرانگشت؟</h1>
        <p class="subtitle">
          برای دفعات بعد می‌توانید بدون رمز و OTP، با اثر انگشت یا Face ID وارد شوید.
          روی اثرانگشت بزنید تا فعال شود.
        </p>
      </div>

      <div class="fingerprint-wrap">
        <button
          v-if="!isEnrolling"
          type="button"
          class="fingerprint-btn"
          aria-label="فعال‌سازی اثرانگشت"
          @click="enrollBiometric"
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

        <div v-else class="loading-wrap" aria-live="polite">
          <div class="spinner" aria-hidden="true" />
          <p class="loading-text">در حال ارتباط با حسگر...</p>
          <p class="loading-hint">اگر دیالوگ آمد، Continue بزنید و انگشت را روی حسگر بگذارید.</p>
        </div>
      </div>

      <p v-if="enrollError" class="error" role="alert">{{ enrollError }}</p>

      <button type="button" class="skip-link" :disabled="isEnrolling" @click="skipEnroll">
        فعلاً نه، برو به خانه
      </button>
    </section>
  </main>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  apiHasCredentials,
  apiPrepareRegistrationOptionsSync,
  apiVerifyRegistration,
} from '@/api/webAuthnApi'
import { getCurrentUser, isLoggedIn } from '@/utils/auth'
import { publicUrl } from '@/utils/publicUrl'
import { createPlatformCredential, isWebAuthnSupported } from '@/utils/webAuthn'

const appIcon = publicUrl('icons/android-chrome-192x192.png')
const router = useRouter()
const isEnrolling = ref(false)
const enrollError = ref('')

async function goHome() {
  await router.replace({ name: 'home' })
}

async function skipEnroll() {
  await goHome()
}

function enrollBiometric() {
  enrollError.value = ''

  const currentUser = getCurrentUser()
  if (!currentUser) {
    enrollError.value = 'نشست کاربر یافت نشد. دوباره وارد شوید.'
    return
  }

  let options
  try {
    // sync — بدون await تا user-gesture برای WebAuthn از بین نرود
    options = apiPrepareRegistrationOptionsSync(currentUser)
  } catch (error) {
    enrollError.value = error?.message || 'آماده‌سازی ثبت Passkey ناموفق بود.'
    return
  }

  // create را فوراً شروع کن، بعد UI لودینگ
  const createPromise = createPlatformCredential({
    challenge: options.challengeBuffer,
    userId: options.user.id,
    userName: options.user.name,
    userDisplayName: options.user.displayName,
    excludeCredentialIds: [],
  })

  isEnrolling.value = true

  createPromise
    .then((attestation) => apiVerifyRegistration(currentUser, attestation))
    .then((saved) => {
      console.info('[WebAuthn] registered:', saved)
      return goHome()
    })
    .catch((error) => {
      console.warn('[WebAuthn] enroll failed:', error)
      if (error?.name === 'NotAllowedError') {
        enrollError.value =
          'ثبت انجام نشد. لطفاً دوباره روی اثرانگشت بزنید، Continue را تأیید کنید و انگشت را روی حسگر بگذارید.'
      } else if (error?.name === 'InvalidStateError') {
        enrollError.value = 'Passkey روی دستگاه موجود است. در حال ورود به خانه...'
        window.setTimeout(() => {
          goHome()
        }, 600)
      } else if (error?.name === 'SecurityError') {
        enrollError.value = 'خطای امنیتی دامنه/HTTPS. صفحه را با آدرس اصلی سایت باز کنید.'
      } else {
        enrollError.value = error?.message || 'ثبت Passkey ممکن نشد.'
      }
    })
    .finally(() => {
      isEnrolling.value = false
    })
}

onMounted(async () => {
  document.documentElement.classList.add('login-no-scroll')

  if (!isLoggedIn()) {
    await router.replace({ name: 'login' })
    return
  }

  if (!isWebAuthnSupported()) {
    await goHome()
    return
  }

  const user = getCurrentUser()
  if (user && (await apiHasCredentials(user))) {
    await goHome()
  }
})

onUnmounted(() => {
  document.documentElement.classList.remove('login-no-scroll')
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
  display: grid;
  gap: 1.1rem;
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
  font-size: 1.35rem;
  color: #f8fafc;
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
  background:
    radial-gradient(circle at 35% 30%, rgba(125, 211, 252, 0.35), transparent 55%),
    rgba(14, 165, 233, 0.14);
  color: #7dd3fc;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 10px 28px rgba(14, 165, 233, 0.2);
}

.fingerprint-btn:active {
  transform: scale(0.97);
}

.loading-wrap {
  display: grid;
  justify-items: center;
  gap: 0.55rem;
  text-align: center;
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
  font-size: 0.95rem;
}

.loading-hint {
  margin: 0;
  color: #94a3b8;
  font-size: 0.8rem;
  line-height: 1.5;
  max-width: 280px;
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

.skip-link:disabled {
  opacity: 0.5;
  cursor: wait;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
