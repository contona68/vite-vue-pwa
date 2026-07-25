<template>
  <main class="page settings-page">
    <section class="settings-card" aria-labelledby="settings-title">
      <h1 id="settings-title">تنظیمات</h1>
      <p class="lead">
        تغییر هر گزینه بلافاصله اعمال می‌شود و روی ورود، OTP و نمایش بنرها اثر می‌گذارد.
      </p>

      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
      <p v-if="successMessage" class="success" role="status">{{ successMessage }}</p>

      <ul class="feature-list">
        <li v-for="item in visibleFeatureItems" :key="item.key">
          <div class="feature-text">
            <strong>{{ item.title }}</strong>
            <span>{{ item.description }}</span>
          </div>
          <label class="switch">
            <input
              type="checkbox"
              :checked="draftFeatures[item.key]"
              :disabled="saving"
              @change="onFeatureToggle(item.key, $event.target.checked)"
            />
            <span class="slider" />
          </label>
        </li>

        <!-- فعال‌سازی قفل اثرانگشت فقط اگر دستگاه پشتیبانی کند -->
        <li v-if="canShowAppLockToggle">
          <div class="feature-text">
            <strong>قفل اثرانگشت</strong>
            <span>
              فعال‌سازی قفل محلی با اثرانگشت. اگر خاموش باشد در صفحه ورود چیزی نشان داده نمی‌شود.
            </span>
          </div>
          <label class="switch">
            <input
              type="checkbox"
              :checked="appLockUserEnabled"
              :disabled="saving || lockBusy"
              @change="onAppLockToggle($event.target.checked)"
            />
            <span class="slider" />
          </label>
        </li>
      </ul>

      <p v-if="lockBusy" class="hint" aria-live="polite">انگشت خود را روی حسگر قرار دهید...</p>

      <div class="actions">
        <button type="button" class="btn ghost" :disabled="saving || lockBusy" @click="onReset">
          بازگشت به پیش‌فرض
        </button>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  appConfig,
  isFeatureEnabled,
  loadAppConfig,
  resetAppConfig,
  updateFeatureFlags,
} from '@/services/appConfig.service'
import {
  disableAppLock,
  enableAppLock,
  isAppLockEnabled,
  isAppLockSupported,
} from '@/utils/appLock'
import { getTokenUsername } from '@/utils/auth'

const featureItems = [
  {
    key: 'pwaRuntime',
    title: 'PWA Runtime',
    description: 'ثبت Service Worker هنگام اجرای اپ (برای اثر کامل ممکن است رفرش لازم باشد).',
  },
  {
    key: 'installBanner',
    title: 'بنر نصب',
    description: 'نمایش پیشنهاد نصب برنامه روی دستگاه.',
  },
  {
    key: 'updateBanner',
    title: 'بنر بروزرسانی',
    description: 'نمایش پیام نسخه جدید Service Worker.',
  },
  {
    key: 'connectivityIndicator',
    title: 'وضعیت اتصال',
    description: 'نمایش آیکون وای‌فای و پیام آفلاین در صفحه ورود.',
  },
  {
    key: 'otp',
    title: 'ورود دومرحله‌ای (OTP)',
    description: 'اگر خاموش باشد، بعد از نام کاربری و رمز، توکن همان‌جا صادر می‌شود.',
  },
]

const draftFeatures = reactive({})
const saving = ref(false)
const lockBusy = ref(false)
const appLockUserEnabled = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const sourceFeatures = computed(() => appConfig.value.features)

const canShowAppLockToggle = computed(
  () => isFeatureEnabled('appLock') && isAppLockSupported(),
)

const visibleFeatureItems = computed(() => featureItems)

function syncDraftFromConfig() {
  Object.keys(sourceFeatures.value || {}).forEach((key) => {
    draftFeatures[key] = Boolean(sourceFeatures.value[key])
  })
}

function syncAppLockState() {
  appLockUserEnabled.value = isAppLockEnabled(getTokenUsername())
}

async function onFeatureToggle(key, checked) {
  draftFeatures[key] = checked
  errorMessage.value = ''
  successMessage.value = ''
  saving.value = true
  try {
    await updateFeatureFlags({ [key]: checked })
    successMessage.value = 'اعمال شد.'
  } catch (error) {
    draftFeatures[key] = !checked
    errorMessage.value = error?.message || 'ذخیره تنظیمات ناموفق بود.'
  } finally {
    saving.value = false
  }
}

async function onAppLockToggle(checked) {
  errorMessage.value = ''
  successMessage.value = ''

  if (!checked) {
    disableAppLock()
    appLockUserEnabled.value = false
    successMessage.value = 'قفل اثرانگشت غیرفعال شد.'
    return
  }

  const username = getTokenUsername()
  if (!username) {
    appLockUserEnabled.value = false
    errorMessage.value = 'برای فعال‌سازی قفل باید وارد حساب شده باشید.'
    return
  }

  lockBusy.value = true
  try {
    await enableAppLock(username)
    appLockUserEnabled.value = true
    successMessage.value = 'قفل اثرانگشت فعال شد.'
  } catch (error) {
    appLockUserEnabled.value = false
    if (error?.name === 'NotAllowedError') {
      errorMessage.value = 'تأیید اثرانگشت انجام نشد.'
    } else {
      errorMessage.value = error?.message || 'فعال‌سازی قفل ناموفق بود.'
    }
  } finally {
    lockBusy.value = false
  }
}

async function onReset() {
  errorMessage.value = ''
  successMessage.value = ''
  saving.value = true
  try {
    await resetAppConfig()
    disableAppLock()
    syncDraftFromConfig()
    syncAppLockState()
    successMessage.value = 'تنظیمات به حالت پیش‌فرض برگشت.'
  } catch (error) {
    errorMessage.value = error?.message || 'بازنشانی ناموفق بود.'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (!appConfig.value) {
    await loadAppConfig()
  }
  syncDraftFromConfig()
  syncAppLockState()
})

watch(sourceFeatures, () => {
  syncDraftFromConfig()
})
</script>

<style scoped>
.settings-page {
  min-height: calc(100dvh - 4rem);
  padding: 1.25rem;
  background: #0f172a;
}

.settings-card {
  width: min(100%, 720px);
  margin: 0 auto;
  padding: 1.25rem;
  border-radius: 1rem;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.25);
  color: #e2e8f0;
}

h1 {
  margin: 0;
  font-size: 1.35rem;
}

.lead {
  margin: 0.55rem 0 1.1rem;
  color: #94a3b8;
  font-size: 0.9rem;
  line-height: 1.6;
}

.feature-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.75rem;
}

.feature-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 0.95rem;
  border-radius: 0.85rem;
  background: rgba(2, 6, 23, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.feature-text {
  display: grid;
  gap: 0.25rem;
}

.feature-text strong {
  font-size: 0.95rem;
}

.feature-text span {
  color: #94a3b8;
  font-size: 0.8rem;
  line-height: 1.5;
}

.switch {
  position: relative;
  width: 46px;
  height: 28px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: #334155;
  cursor: pointer;
  transition: 0.2s ease;
}

.slider::before {
  content: '';
  position: absolute;
  width: 22px;
  height: 22px;
  left: 3px;
  top: 3px;
  border-radius: 50%;
  background: #fff;
  transition: 0.2s ease;
}

.switch input:checked + .slider {
  background: #0ea5e9;
}

.switch input:checked + .slider::before {
  transform: translateX(18px);
}

.actions {
  margin-top: 1.1rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.btn {
  border: 0;
  border-radius: 0.7rem;
  padding: 0.65rem 0.95rem;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.btn.ghost {
  background: transparent;
  color: #cbd5e1;
  border: 1px solid rgba(148, 163, 184, 0.35);
}

.btn:disabled {
  opacity: 0.65;
  cursor: wait;
}

.error {
  color: #fda4af;
  font-size: 0.88rem;
}

.success {
  color: #86efac;
  font-size: 0.88rem;
}

.hint {
  margin: 0.75rem 0 0;
  color: #7dd3fc;
  font-size: 0.88rem;
}
</style>
