<script setup lang="ts">
const base = import.meta.env.BASE_URL;
import { watch } from 'vue';
import { useRoute } from 'vue-router';
import { usePreferences } from '@vben/preferences';
import { BasicLayout } from '@vben/layouts';
const route = useRoute();
const { isMobile } = usePreferences();
watch(() => route.fullPath, () => {
  // Mobile open state is internal to VbenAdminLayout; use its native mask action.
  if (isMobile.value) document.querySelector<HTMLElement>('[data-layout-region="sidebar-mask"]')?.click();
}, { flush: 'post' });
</script>
<template><BasicLayout :avatar="base + 'favicon.svg'" text="Demo User"><template #user-dropdown><span class="text-xs text-muted-foreground px-4">本地演示 · Demo User</span></template></BasicLayout></template>
