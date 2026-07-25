<template>
  <main class="page boot-page" aria-busy="true">
    <div class="boot-card">
      <div class="spinner" aria-hidden="true" />
      <p>در حال آماده‌سازی...</p>
    </div>
  </main>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { apiValidateToken } from '@/api/authApi'
import { isAppLockEnabled } from '@/utils/appLock'
import {
  clearTokenSession,
  getAccessToken,
  getTokenUsername,
  hasPendingLogin,
  markSessionUnlocked,
} from '@/utils/auth'

const router = useRouter()

onMounted(async () => {
  if (hasPendingLogin()) {
    await router.replace({ name: 'otp' })
    return
  }

  const token = getAccessToken()
  if (!token) {
    await router.replace({ name: 'login' })
    return
  }

  const username = getTokenUsername()
  if (isAppLockEnabled(username)) {
    await router.replace({ name: 'biometric-unlock' })
    return
  }

  const result = await apiValidateToken(token)
  if (!result.ok) {
    clearTokenSession()
    await router.replace({ name: 'login' })
    return
  }

  markSessionUnlocked()
  await router.replace({ name: 'home' })
})
</script>

<style scoped>
.boot-page {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  background: #0f172a;
  color: #94a3b8;
}

.boot-card {
  display: grid;
  justify-items: center;
  gap: 0.75rem;
}

.spinner {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid rgba(148, 163, 184, 0.25);
  border-top-color: #38bdf8;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
