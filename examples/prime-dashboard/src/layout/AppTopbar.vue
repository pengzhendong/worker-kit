<script setup>
const base = import.meta.env.BASE_URL;
const homePath = location.pathname.startsWith(base + 'components/') ? '/components/table' : '/';
import { useLayout } from '@/layout/composables/layout';
import AppConfigurator from './AppConfigurator.vue';
const { toggleMenu, toggleDarkMode, isDarkTheme } = useLayout();
</script>
<template>
  <div class="layout-topbar">
    <div class="layout-topbar-logo-container">
      <button class="layout-menu-button layout-topbar-action" aria-label="打开导航" @click="toggleMenu"><i class="pi pi-bars" /></button>
      <RouterLink :to="homePath" class="layout-topbar-logo"><img :src="base + 'favicon.svg'" alt="" style="width:32px;height:32px" /><span>WorkerKit</span></RouterLink>
    </div>
    <div class="layout-topbar-actions gap-3">
      <Tag value="PrimeVue · Sakai" severity="secondary" class="demo-framework-badge" />
      <button type="button" class="layout-topbar-action" aria-label="切换明暗主题" @click="toggleDarkMode"><i :class="['pi', isDarkTheme ? 'pi-sun' : 'pi-moon']" /></button>
      <div class="relative"><button v-styleclass="{ selector: '@next', enterFromClass: 'hidden', enterActiveClass: 'p-anchored-overlay-enter-active', leaveToClass: 'hidden', leaveActiveClass: 'p-anchored-overlay-leave-active', hideOnOutsideClick: true }" type="button" class="layout-topbar-action layout-topbar-action-highlight" aria-label="主题配置"><i class="pi pi-palette" /></button><AppConfigurator /></div>
      <Avatar label="P" shape="circle" class="ml-2" />
    </div>
  </div>
</template>
