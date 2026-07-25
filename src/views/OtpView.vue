<template>
  <main class="page login-page">
    <section class="login-card" aria-labelledby="otp-title">
      <div class="brand">
        <img :src="appIcon" alt="لوگوی اپ" width="56" height="56" />
        <h1 id="otp-title">تأیید پیامکی</h1>
        <p class="subtitle">
          کد ارسال‌شده برای
          <strong>{{ username || 'کاربر' }}</strong>
          را وارد کنید.
        </p>
      </div>

      <form class="login-form" @submit.prevent="onSubmit">
        <label class="field">
          <span>کد یک‌بارمصرف</span>
          <input
            ref="otpInputRef"
            v-model="otpCode"
            type="text"
            name="one-time-code"
            inputmode="numeric"
            pattern="[0-9]*"
            autocomplete="one-time-code"
            maxlength="6"
            placeholder="۶ رقم"
            required
            @input="onOtpInput"
          />
        </label>

        <p v-if="hintMessage" class="hint">{{ hintMessage }}</p>
        <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

        <button class="btn primary" type="submit" :disabled="isSubmitting || otpCode.length < 6 || showEnrollPanel">
          {{ isSubmitting ? 'در حال بررسی...' : 'تأیید کد' }}
        </button>

        <button class="btn ghost" type="button" :disabled="showEnrollPanel" @click="goBackToLogin">
          بازگشت به ورود
        </button>
      </form>

      <aside v-if="showEnrollPanel" class="enroll-panel" aria-labelledby="enroll-title">
        <strong id="enroll-title">ورود سریع با اثرانگشت؟</strong>
        <p>
          برای دفعات بعد می‌توانید بدون رمز و OTP، با اثر انگشت یا Face ID وارد شوید.
        </p>

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
      </aside>

      <p class="offline-hint">
        برای تست دمو فعلاً کد
        <strong>{{ demoCode }}</strong>
        را وارد کنید.
      </p>
    </section>
  </main>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  apiGetRegistrationOptions,
  apiHasCredentials,
  apiVerifyRegistration,
} from '@/api/webAuthnApi'
import {
  DEMO_OTP_CODE,
  getCurrentUser,
  hasPendingLogin,
  isLoggedIn,
  logout,
  markOtpVerified,
} from '@/utils/auth'
import { publicUrl } from '@/utils/publicUrl'
import {
  createPlatformCredential,
  isWebAuthnSupported,
} from '@/utils/webAuthn'
import { isWebOtpSupported, normalizeOtpCode, waitForSmsOtp } from '@/utils/webOtp'

const appIcon = publicUrl('icons/android-chrome-192x192.png')
const demoCode = DEMO_OTP_CODE
const router = useRouter()

const otpInputRef = ref(null)
const otpCode = ref('')
const errorMessage = ref('')
const statusMessage = ref('')
const isSubmitting = ref(false)
const webOtpActive = ref(false)
const showEnrollPanel = ref(false)
const isEnrolling = ref(false)
const enrollError = ref('')
const canOfferBiometric = ref(false)

const username = computed(() => getCurrentUser())
const hintMessage = computed(() => {
  if (showEnrollPanel.value) {
    return 'ورود تأیید شد. در صورت تمایل اثرانگشت را فعال کنید.'
  }
  if (statusMessage.value) return statusMessage.value
  if (webOtpActive.value) {
    return 'در حال انتظار برای دریافت خودکار کد از پیامک (Android)...'
  }
  if (isWebOtpSupported()) {
    return 'پیشنهاد کد از پیامک فعال است (autocomplete + Web OTP).'
  }
  return 'پیشنهاد کد از صفحه‌کلید/پیامک با autocomplete فعال است (iOS/Android).'
})

let otpAbortController = null

function applyOtpToInput(rawCode) {
  const digits = normalizeOtpCode(rawCode, 6)
  otpCode.value = digits
  errorMessage.value = ''

  const input = otpInputRef.value
  if (input) {
    input.value = digits
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }

  return digits
}

function onOtpInput(event) {
  const digits = normalizeOtpCode(event.target.value || '', 6)
  otpCode.value = digits
  errorMessage.value = ''
  statusMessage.value = ''

  if (digits.length === 6) {
    onSubmit()
  }
}

async function goHome() {
  await router.replace({ name: 'home' })
}

async function maybeOfferBiometricEnroll() {
  if (!canOfferBiometric.value) {
    await goHome()
    return
  }

  try {
    const already = await apiHasCredentials(username.value)
    if (already) {
      await goHome()
      return
    }
  } catch (_) {
    // اگر استور خوانده نشد، باز هم پیشنهاد ثبت می‌دهیم
  }

  showEnrollPanel.value = true
}

async function onSubmit() {
  if (showEnrollPanel.value) return

  errorMessage.value = ''
  const code = normalizeOtpCode(otpCode.value, 6)
  otpCode.value = code

  if (code.length !== 6) {
    errorMessage.value = 'کد باید ۶ رقم باشد.'
    return
  }

  isSubmitting.value = true

  try {
    await new Promise((resolve) => setTimeout(resolve, 300))

    if (code !== DEMO_OTP_CODE) {
      errorMessage.value = 'کد واردشده نادرست است.'
      return
    }

    stopWebOtpListener()
    markOtpVerified()
    await maybeOfferBiometricEnroll()
  } finally {
    isSubmitting.value = false
  }
}

async function enrollBiometric() {
  enrollError.value = ''
  isEnrolling.value = true

  try {
    const currentUser = username.value
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

    showEnrollPanel.value = false
    await goHome()
  } catch (error) {
    console.warn('[WebAuthn] enroll failed:', error)
    if (error?.name === 'NotAllowedError') {
      enrollError.value =
        'ثبت لغو شد یا حسگر پاسخ نداد. بعد از Continue باید انگشت را روی حسگر بگذارید.'
    } else if (error?.name === 'InvalidStateError') {
      // روی دستگاه هست ولی شاید در استور ما نبود — کاربر را به خانه بفرست
      enrollError.value = 'Passkey روی دستگاه موجود است. در حال ورود به خانه...'
      setTimeout(() => {
        goHome()
      }, 600)
    } else {
      enrollError.value = error?.message || 'ثبت Passkey ممکن نشد.'
    }
  } finally {
    isEnrolling.value = false
  }
}

async function skipEnroll() {
  showEnrollPanel.value = false
  await goHome()
}

async function goBackToLogin() {
  stopWebOtpListener()
  logout()
  await router.push({ name: 'login' })
}

function stopWebOtpListener() {
  webOtpActive.value = false
  if (otpAbortController) {
    otpAbortController.abort()
    otpAbortController = null
  }
}

async function startWebOtpListener() {
  if (!isWebOtpSupported()) return

  stopWebOtpListener()
  otpAbortController = new AbortController()
  webOtpActive.value = true
  statusMessage.value = ''

  try {
    const rawCode = await waitForSmsOtp(otpAbortController.signal)
    if (rawCode == null) return

    const digits = applyOtpToInput(rawCode)
    await nextTick()

    if (!digits) {
      statusMessage.value = 'پیامک دریافت شد ولی کد عددی از آن استخراج نشد.'
      return
    }

    statusMessage.value = `کد از پیامک دریافت شد: ${digits}`

    if (digits.length === 6) {
      await onSubmit()
    }
  } catch (error) {
    if (error?.name !== 'AbortError') {
      webOtpActive.value = false
      console.warn('[WebOTP] failed:', error)
    }
  } finally {
    if (!otpAbortController?.signal.aborted) {
      webOtpActive.value = false
    }
  }
}

onMounted(async () => {
  if (isLoggedIn()) {
    await router.replace({ name: 'home' })
    return
  }

  if (!hasPendingLogin()) {
    await router.replace({ name: 'login' })
    return
  }

  document.documentElement.classList.add('login-no-scroll')
  // اگر WebAuthn باشد پیشنهاد ثبت می‌دهیم؛ خود create روی دستگاه واقعی چک می‌شود
  canOfferBiometric.value = isWebAuthnSupported()
  await nextTick()
  otpInputRef.value?.focus()
  startWebOtpListener()
})

onUnmounted(() => {
  document.documentElement.classList.remove('login-no-scroll')
  stopWebOtpListener()
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

.subtitle strong {
  color: #e2e8f0;
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
  padding: 0.85rem 0.9rem;
  font: inherit;
  font-size: 1.35rem;
  letter-spacing: 0.35em;
  text-align: center;
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

.btn.ghost {
  background: transparent;
  color: #cbd5e1;
  border: 1px solid rgba(148, 163, 184, 0.35);
}

.btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.hint {
  margin: 0;
  color: #93c5fd;
  font-size: 0.82rem;
  line-height: 1.5;
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

.offline-hint strong {
  color: #fbbf24;
  letter-spacing: 0.12em;
}

.enroll-panel {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 0.9rem;
  background: rgba(14, 165, 233, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.35);
  display: grid;
  gap: 0.65rem;
}

.enroll-panel strong {
  color: #e0f2fe;
  font-size: 0.98rem;
}

.enroll-panel p {
  margin: 0;
  color: #94a3b8;
  font-size: 0.86rem;
  line-height: 1.55;
}

.enroll-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.enroll-waiting {
  display: grid;
  justify-items: center;
  gap: 0.45rem;
  padding: 0.55rem 0;
}

.fingerprint-mini {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fde68a;
  border: 1px solid rgba(251, 191, 36, 0.45);
  background: rgba(251, 191, 36, 0.12);
  animation: pulse 1.2s ease-in-out infinite;
}

.enroll-waiting-text {
  margin: 0 !important;
  color: #fde68a !important;
  font-weight: 600;
  text-align: center;
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
