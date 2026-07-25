<template>
  <nav class="nav" aria-label="منوی اصلی">
    <RouterLink class="brand" :to="{ name: 'home' }">{{ brandName }}</RouterLink>
    <div class="links">
      <RouterLink :to="{ name: 'home' }">خانه</RouterLink>
      <RouterLink :to="{ name: 'about' }">درباره</RouterLink>
      <RouterLink v-if="loggedIn" :to="{ name: 'feature-settings' }">تنظیمات</RouterLink>
      <button v-if="loggedIn" type="button" class="logout-btn" @click="onLogout">
        خروج
      </button>
      <RouterLink v-else :to="{ name: 'login' }">ورود</RouterLink>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isLoggedIn, logout } from '@/utils/auth'
import { appConfig } from '@/services/appConfig.service'

const router = useRouter()
const route = useRoute()
const loggedIn = computed(() => {
  void route.fullPath
  return isLoggedIn()
})
const brandName = computed(() => appConfig.value.branding.appName)

async function onLogout() {
  logout()
  await router.push({ name: 'login' })
}
</script>

<style scoped>
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1.25rem;
  background: #0f172a;
  color: #e2e8f0;
}

.brand {
  font-weight: 700;
  color: #38bdf8;
  text-decoration: none;
}

.links {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.links a,
.logout-btn {
  color: #cbd5e1;
  text-decoration: none;
  font-size: 0.95rem;
  background: none;
  border: 0;
  padding: 0;
  font: inherit;
  cursor: pointer;
}

.links a.router-link-active {
  color: #f8fafc;
  font-weight: 600;
}

.logout-btn:hover {
  color: #f8fafc;
}
</style>
