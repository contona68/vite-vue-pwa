<template>
  <div class="app-shell">
    <UpdatePrompt v-if="showUpdateBanner" />
    <InstallPrompt v-if="showInstallBanner && !needRefresh" />
    <RouterView />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import InstallPrompt from '@/components/InstallPrompt.vue'
import UpdatePrompt from '@/components/UpdatePrompt.vue'
import { needRefresh } from '@/pwa/updateState'
import { isFeatureEnabled } from '@/services/appConfig.service'

const showUpdateBanner = computed(() => isFeatureEnabled('updateBanner'))
const showInstallBanner = computed(() => isFeatureEnabled('installBanner'))
</script>
