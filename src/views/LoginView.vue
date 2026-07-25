<template>
  <main class="page login-page">
    <div class="connection-bar" aria-live="polite">
      <span
        class="wifi-icon"
        :class="{ offline: !isOnline }"
        :title="isOnline ? 'آنلاین' : 'آفلاین'"
        :aria-label="isOnline ? 'اتصال اینترنت برقرار است' : 'اتصال اینترنت قطع است'"
      >
        <svg v-if="isOnline" viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <path d="M12 18.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z" fill="currentColor" />
          <path
            d="M8.5 14.2a5.2 5.2 0 0 1 7 0M5.5 11a9.2 9.2 0 0 1 13 0M2.8 7.8a13.2 13.2 0 0 1 18.4 0"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          />
        </svg>
        <svg v-else viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <path d="M12 18.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z" fill="currentColor" />
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

        <button class="btn primary" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'در حال ورود...' : 'ورود' }}
        </button>
      </form>
    </section>
  </main>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { beginPendingLogin, isLoggedIn } from '@/utils/auth'
import { publicUrl } from '@/utils/publicUrl'

const appIcon = publicUrl('icons/android-chrome-192x192.png')
const router = useRouter()
const username = ref('')
const password = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)
const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)

function syncOnlineStatus() {
  isOnline.value = navigator.onLine
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

    beginPendingLogin(username.value)
    await router.push({ name: 'otp' })
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  document.documentElement.classList.add('login-no-scroll')
  window.addEventListener('online', syncOnlineStatus)
  window.addEventListener('offline', syncOnlineStatus)

  if (isLoggedIn()) {
    await router.replace({ name: 'home' })
  }
})

onUnmounted(() => {
  document.documentElement.classList.remove('login-no-scroll')
  window.removeEventListener('online', syncOnlineStatus)
  window.removeEventListener('offline', syncOnlineStatus)
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
