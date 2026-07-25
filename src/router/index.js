import { createRouter, createWebHistory } from 'vue-router'
import { hasPendingLogin, hasStoredToken, isLoggedIn, isSessionUnlocked } from '@/utils/auth'
import { isAppLockEnabled, getAppLockUsername } from '@/utils/appLock'

const routes = [
  {
    path: '/',
    name: 'boot',
    component: () => import('@/views/BootView.vue'),
    meta: { title: 'بارگذاری', public: true },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: 'ورود', public: true },
  },
  {
    path: '/otp',
    name: 'otp',
    component: () => import('@/views/OtpView.vue'),
    meta: { title: 'تأیید پیامکی', public: true },
  },
  {
    path: '/biometric-unlock',
    name: 'biometric-unlock',
    component: () => import('@/views/BiometricUnlockView.vue'),
    meta: { title: 'باز کردن برنامه', public: true },
  },
  {
    path: '/biometric-enroll',
    name: 'biometric-enroll',
    component: () => import('@/views/BiometricEnrollView.vue'),
    meta: { title: 'فعال‌سازی اثرانگشت', requiresAuth: true },
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: 'خانه', requiresAuth: true },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/AboutView.vue'),
    meta: { title: 'درباره ما', requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  if (to.name === 'boot') return true

  if (to.meta.requiresAuth && !isLoggedIn()) {
    if (hasPendingLogin()) return { name: 'otp' }
    if (hasStoredToken() && isAppLockEnabled(getAppLockUsername()) && !isSessionUnlocked()) {
      return { name: 'biometric-unlock' }
    }
    if (hasStoredToken() && !isSessionUnlocked()) {
      return { name: 'boot' }
    }
    return { name: 'login' }
  }

  if (to.name === 'otp' && !hasPendingLogin()) {
    return isLoggedIn() ? { name: 'home' } : { name: 'login' }
  }

  if (to.name === 'login' && isLoggedIn()) {
    return { name: 'home' }
  }

  if (to.name === 'biometric-unlock') {
    if (!hasStoredToken()) return { name: 'login' }
    if (isLoggedIn()) return { name: 'home' }
  }

  return true
})

router.afterEach((to) => {
  const pageTitle = to.meta.title ? String(to.meta.title) : 'هایپریک'
  document.title = `${pageTitle} | هایپریک`
})

export default router
