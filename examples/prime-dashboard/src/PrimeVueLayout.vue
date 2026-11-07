<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Menu from 'primevue/menu';
import Drawer from 'primevue/drawer';
import componentPages from '../../ui-demo/component-pages.json';
import { isDarkTheme, toggleDarkMode } from './theme';

const route = useRoute();
const open = ref(false);
const logo = import.meta.env.BASE_URL + 'favicon.svg';
const icons = {
  table: 'table',
  form: 'pencil',
  dialogs: 'window-maximize',
  layout: 'th-large',
  theme: 'palette',
  preview: 'eye',
};
const componentMenu = componentPages.map((page) => ({
  label: page.title,
  to: page.path,
  icon: 'pi pi-' + icons[page.key],
}));
const catalogMenu =
  import.meta.env.BASE_URL === '/primevue/'
    ? [{ label: '组件目录', to: '/components/gallery', icon: 'pi pi-book' }]
    : [];
const menu = computed(() =>
  route.path.startsWith('/components/')
    ? [...catalogMenu, { label: '对比示例', items: componentMenu }]
    : [
        {
          label: '工作空间',
          items: [
            { label: '业务工作台', to: '/workspace', icon: 'pi pi-bolt' },
          ],
        },
      ],
);
watch(
  () => route.path,
  () => {
    open.value = false;
  },
);
</script>

<template>
  <div class="primevue-shell">
    <header>
      <Button
        class="primevue-mobile"
        icon="pi pi-bars"
        text
        aria-label="打开导航"
        @click="open = true"
      />
      <img :src="logo" alt="" width="26" height="26" />
      <strong>WorkerKit · PrimeVue</strong>
      <Button
        :icon="isDarkTheme ? 'pi pi-sun' : 'pi pi-moon'"
        text
        :aria-label="isDarkTheme ? '切换浅色主题' : '切换深色主题'"
        @click="toggleDarkMode"
      />
    </header>
    <aside class="primevue-sidebar">
      <Menu :model="menu">
        <template #item="{ item, props }">
          <RouterLink v-bind="props.action" :to="item.to">
            <span :class="item.icon" aria-hidden="true" />{{ item.label }}
          </RouterLink>
        </template>
      </Menu>
    </aside>
    <Drawer v-model:visible="open" header="WorkerKit · PrimeVue">
      <Menu :model="menu">
        <template #item="{ item, props }">
          <RouterLink v-bind="props.action" :to="item.to" @click="open = false">
            <span :class="item.icon" aria-hidden="true" />{{ item.label }}
          </RouterLink>
        </template>
      </Menu>
    </Drawer>
    <main class="layout-main"><RouterView /></main>
  </div>
  <Toast />
</template>

<style>
body:has(.primevue-shell) {
  --surface-card: var(--p-content-background);
  --surface-border: var(--p-content-border-color);
  --surface-ground: var(--p-surface-100);
  --content-border-radius: var(--p-border-radius-lg);
  --text-color-secondary: var(--p-text-muted-color);
  --primary-color: var(--p-primary-color);
  color: var(--p-text-color);
  background: var(--p-content-background);
}
.app-dark body:has(.primevue-shell) {
  --surface-ground: var(--p-surface-900);
}
.primevue-shell {
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  height: 100dvh;
}
.primevue-shell > header {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--surface-border);
}
.primevue-shell > header strong {
  flex: 1;
}
.primevue-sidebar {
  padding: 12px;
  overflow: auto;
  border-right: 1px solid var(--surface-border);
}
.primevue-sidebar > .p-menu {
  min-width: 0;
  width: 100%;
}
.primevue-shell .layout-main {
  padding: 16px 24px 24px;
}
.primevue-shell > header .primevue-mobile {
  display: none;
}
.p-menu-item-link.router-link-exact-active {
  background: var(--p-highlight-background);
  color: var(--p-highlight-color);
}
@media (max-width: 900px) {
  .primevue-shell {
    grid-template-columns: minmax(0, 1fr);
  }
  .primevue-sidebar {
    display: none;
  }
  .primevue-shell > header .primevue-mobile {
    display: inline-flex;
  }
  .primevue-shell .layout-main {
    padding-inline: 14px;
  }
}
</style>
