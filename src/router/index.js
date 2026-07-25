import { createRouter, createWebHistory } from 'vue-router'
import { hasPendingLogin, isLoggedIn } from '@/utils/auth'

const routes = [
  {
    path: '/',
    redirect: '/login',
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
    redirect: '/login',
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
  if (to.meta.requiresAuth && !isLoggedIn()) {
    return hasPendingLogin() ? { name: 'otp' } : { name: 'login' }
  }

  if (to.name === 'otp' && !hasPendingLogin()) {
    return isLoggedIn() ? { name: 'home' } : { name: 'login' }
  }

  if (to.name === 'login' && isLoggedIn()) {
    return { name: 'home' }
  }

  // صفحه فعال‌سازی فقط برای کاربر لاگین‌شده بدون Passkey قبلی معنا دارد
  // (خودِ صفحه هم در صورت داشتن credential به home می‌فرستد)

  return true
})

router.afterEach((to) => {
  const pageTitle = to.meta.title ? String(to.meta.title) : 'هایپریک'
  document.title = `${pageTitle} | هایپریک`
})

export default router
