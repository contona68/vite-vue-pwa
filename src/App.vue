<template>
  <div class="app-shell">
    <UpdatePrompt />
    <InstallPrompt v-if="!needRefresh" />
    <RouterView />
  </div>
</template>

<script setup>
import InstallPrompt from '@/components/InstallPrompt.vue'
import UpdatePrompt from '@/components/UpdatePrompt.vue'
import { needRefresh } from '@/pwa/updateState'
</script>
