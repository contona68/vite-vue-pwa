<template>
  <main class="page login-page">
    <section class="login-card" aria-labelledby="enroll-title">
      <div class="brand">
        <img :src="appIcon" alt="لوگوی اپ" width="56" height="56" />
        <h1 id="enroll-title">ورود سریع با اثرانگشت؟</h1>
        <p class="subtitle">
          برای دفعات بعد می‌توانید بدون رمز و OTP، با اثر انگشت یا Face ID وارد شوید.
        </p>
      </div>

      <div v-if="isEnrolling" class="enroll-waiting">
        <div class="fingerprint-mini" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none">
            <path
              d="M12 2.5c-3.2 0-5.8 2.5-5.8 5.6v1.1M6.2 11.2c0 4.7 2.4 8.8 5.8 10.3 3.4-1.5 5.8-5.6 5.8-10.3M12 6.2c-1.7 0-3.1 1.3-3.1 3v2.2M8.9 12.1c.3 3.1 1.7 5.8 3.1 6.9 1.4-1.1 2.8-3.8 3.1-6.9M12 10.4v3.2"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
          </svg>
        </div>
        <p class="enroll-waiting-text">انگشت خود را روی حسگر اثرانگشت قرار دهید...</p>
      </div>

      <p v-if="enrollError" class="error" role="alert">{{ enrollError }}</p>

      <div class="enroll-actions">
        <button type="button" class="btn ghost" :disabled="isEnrolling" @click="skipEnroll">
          فعلاً نه
        </button>
        <button type="button" class="btn primary" :disabled="isEnrolling" @click="enrollBiometric">
          {{ isEnrolling ? 'در انتظار حسگر...' : 'فعال‌سازی' }}
        </button>
      </div>
    </section>
  </main>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  apiGetRegistrationOptions,
  apiHasCredentials,
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

async function enrollBiometric() {
  enrollError.value = ''
  isEnrolling.value = true

  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      throw new Error('نشست کاربر یافت نشد. دوباره وارد شوید.')
    }

    const options = await apiGetRegistrationOptions(currentUser)
    const attestation = await createPlatformCredential({
      challenge: options.challengeBuffer,
      userId: options.user.id,
      userName: options.user.name,
      userDisplayName: options.user.displayName,
      excludeCredentialIds: options.excludeCredentialIds,
    })

    const saved = await apiVerifyRegistration(currentUser, attestation)
    console.info('[WebAuthn] registered:', saved)
    await goHome()
  } catch (error) {
    console.warn('[WebAuthn] enroll failed:', error)
    if (error?.name === 'NotAllowedError') {
      enrollError.value =
        'ثبت لغو شد یا حسگر پاسخ نداد. بعد از Continue باید انگشت را روی حسگر بگذارید.'
    } else if (error?.name === 'InvalidStateError') {
      enrollError.value = 'Passkey روی دستگاه موجود است. در حال ورود به خانه...'
      window.setTimeout(() => {
        goHome()
      }, 600)
    } else {
      enrollError.value = error?.message || 'ثبت Passkey ممکن نشد.'
    }
  } finally {
    isEnrolling.value = false
  }
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
  gap: 1rem;
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

.enroll-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  flex-wrap: wrap;
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

.btn.ghost {
  background: transparent;
  color: #cbd5e1;
  border: 1px solid rgba(148, 163, 184, 0.35);
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

.enroll-waiting {
  display: grid;
  justify-items: center;
  gap: 0.45rem;
  padding: 0.55rem 0;
}

.fingerprint-mini {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fde68a;
  border: 1px solid rgba(251, 191, 36, 0.45);
  background: rgba(251, 191, 36, 0.12);
  animation: pulse 1.2s ease-in-out infinite;
}

.enroll-waiting-text {
  margin: 0;
  color: #fde68a;
  font-weight: 600;
  text-align: center;
  font-size: 0.9rem;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.06);
  }
}
</style>
