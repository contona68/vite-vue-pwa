import { computed, ref } from 'vue'
import { apiFetchAppConfig, apiResetAppConfig, apiUpdateAppConfig } from '@/api/appConfigApi'
import { createDefaultAppConfig } from '@/config'

const configState = ref(createDefaultAppConfig())
const loaded = ref(false)
const loading = ref(false)

export const appConfig = computed(() => configState.value)
export const isAppConfigLoaded = computed(() => loaded.value)
export const isAppConfigLoading = computed(() => loading.value)

export function isFeatureEnabled(featureKey) {
  return Boolean(configState.value?.features?.[featureKey])
}

export async function loadAppConfig() {
  loading.value = true
  try {
    configState.value = await apiFetchAppConfig()
    loaded.value = true
    return configState.value
  } finally {
    loading.value = false
  }
}

export async function updateAppConfig(partialConfig) {
  loading.value = true
  try {
    configState.value = await apiUpdateAppConfig(partialConfig)
    loaded.value = true
    return configState.value
  } finally {
    loading.value = false
  }
}

export async function updateFeatureFlags(featuresPatch) {
  return updateAppConfig({ features: featuresPatch })
}

export async function resetAppConfig() {
  loading.value = true
  try {
    configState.value = await apiResetAppConfig()
    loaded.value = true
    return configState.value
  } finally {
    loading.value = false
  }
}

export function applySplashFromConfig() {
  const splash = document.getElementById('boot-splash')
  if (!splash) return
  const title = splash.querySelector('p')
  if (title) {
    title.textContent = configState.value.branding.splashMessage || ''
  }
}
