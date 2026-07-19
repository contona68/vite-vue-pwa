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

      <p class="offline-hint" :data-online="isOnline">
        {{ isOnline ? 'اتصال اینترنت برقرار است' : 'حالت آفلاین — صفحه از کش نمایش داده می‌شود' }}
      </p>
    </section>
  </main>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '@/utils/auth'
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
    // فعلاً لاگین دمو؛ بعداً به API واقعی وصل می‌شود
    await new Promise((resolve) => setTimeout(resolve, 400))

    if (!username.value || !password.value) {
      errorMessage.value = 'نام کاربری و رمز عبور الزامی است.'
      return
    }

    login(username.value)
    await router.push({ name: 'home' })
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  document.documentElement.classList.add('login-no-scroll')
  window.addEventListener('online', syncOnlineStatus)
  window.addEventListener('offline', syncOnlineStatus)
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
  overflow: hidden;
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

.btn:disabled {
  opacity: 0.7;
  cursor: wait;
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
