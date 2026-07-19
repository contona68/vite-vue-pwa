<template>
  <Transition name="banner">
    <aside v-if="visible" class="install-banner" role="dialog" aria-labelledby="install-title">
      <img class="app-icon" :src="appIcon" alt="" width="48" height="48" />

      <div class="text">
        <strong id="install-title">نصب برنامه</strong>
        <p>برنامه را روی دستگاه خود نصب کنید تا سریع‌تر و راحت‌تر به آن دسترسی داشته باشید.</p>
      </div>

      <div class="actions">
        <button type="button" class="btn ghost" @click="dismiss">الان نه</button>
        <button type="button" class="btn primary" @click="install">نصب</button>
      </div>
    </aside>
  </Transition>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import {
  incrementDismissLoadCount,
  isPwaAlreadyInstalled,
  markPwaInstalled,
  setLoadsSinceDismiss,
  shouldHideByDismissPolicy,
} from '@/utils/pwaInstall'
import { publicUrl } from '@/utils/publicUrl'

const appIcon = publicUrl('icons/android-chrome-192x192.png')
const visible = ref(false)
let deferredPrompt = null
let alreadyInstalled = false

function hideBanner() {
  visible.value = false
}

function tryShowBanner() {
  if (alreadyInstalled || shouldHideByDismissPolicy() || !deferredPrompt) {
    hideBanner()
    return
  }
  visible.value = true
}

function onBeforeInstallPrompt(event) {
  event.preventDefault()
  deferredPrompt = event

  if (alreadyInstalled || shouldHideByDismissPolicy()) {
    hideBanner()
    return
  }

  tryShowBanner()
}

function onAppInstalled() {
  alreadyInstalled = true
  markPwaInstalled()
  deferredPrompt = null
  hideBanner()
}

function dismiss() {
  hideBanner()
  setLoadsSinceDismiss(0)
}

async function install() {
  if (!deferredPrompt) return

  deferredPrompt.prompt()
  const choice = await deferredPrompt.userChoice
  deferredPrompt = null
  hideBanner()

  if (choice?.outcome === 'accepted') {
    alreadyInstalled = true
    markPwaInstalled()
  } else {
    setLoadsSinceDismiss(0)
  }
}

onMounted(async () => {
  alreadyInstalled = await isPwaAlreadyInstalled()
  if (alreadyInstalled) {
    hideBanner()
    return
  }

  incrementDismissLoadCount()

  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.addEventListener('appinstalled', onAppInstalled)
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.removeEventListener('appinstalled', onAppInstalled)
})
</script>

<style scoped>
.install-banner {
  position: fixed;
  z-index: 40;
  inset-inline: 1rem;
  bottom: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  align-items: center;
  padding: 1rem 1.15rem;
  border-radius: 1rem;
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #e2e8f0;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
}

.app-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 0.75rem;
  object-fit: cover;
}

.text {
  flex: 1 1 200px;
  min-width: 0;
}

.text strong {
  display: block;
  margin-bottom: 0.2rem;
  color: #0f172a;
  font-size: 1rem;
}

.text p {
  margin: 0;
  color: #64748b;
  font-size: 0.88rem;
  line-height: 1.55;
}

.actions {
  display: flex;
  gap: 0.5rem;
  margin-inline-start: auto;
}

.btn {
  border: 0;
  border-radius: 0.7rem;
  padding: 0.55rem 0.95rem;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.btn.primary {
  background: #0ea5e9;
  color: #ffffff;
}

.btn.ghost {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.banner-enter-active,
.banner-leave-active {
  transition: all 0.28s ease;
}

.banner-enter-from,
.banner-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
