import { computed, ref } from 'vue'
import { apiFetchAppConfig, apiResetAppConfig, apiUpdateAppConfig } from '@/api/appConfigApi'
import { createDefaultAppConfig } from '@/config'

const configState = ref(createDefaultAppConfig())

export const appConfig = computed(() => configState.value)

export function isFeatureEnabled(featureKey) {
  return Boolean(configState.value?.features?.[featureKey])
}

export async function loadAppConfig() {
  configState.value = await apiFetchAppConfig()
  return configState.value
}

export async function updateFeatureFlags(featuresPatch) {
  configState.value = await apiUpdateAppConfig({ features: featuresPatch })
  return configState.value
}

export async function resetAppConfig() {
  configState.value = await apiResetAppConfig()
  return configState.value
}

export function applySplashFromConfig() {
  const splash = document.getElementById('boot-splash')
  if (!splash) return
  const title = splash.querySelector('p')
  if (title) {
    title.textContent = configState.value.branding.splashMessage || ''
  }
}
