/**
 * Web OTP API (عمدتاً Android Chrome)
 * SMS باید شامل دامنه و کد باشد، مثلاً:
 * Your code is 123456
 * @contona68.github.io #123456
 */
export function isWebOtpSupported() {
  return typeof window !== 'undefined' && 'OTPCredential' in window
}

export async function waitForSmsOtp(signal) {
  if (!isWebOtpSupported()) {
    return null
  }

  const credential = await navigator.credentials.get({
    otp: { transport: ['sms'] },
    signal,
  })

  return credential?.code ? String(credential.code) : null
}
