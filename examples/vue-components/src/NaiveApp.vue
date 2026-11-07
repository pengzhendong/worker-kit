<script setup lang="ts">
import { h, ref, watch } from 'vue';
import { Menu, Moon, Sun } from '@lucide/vue';
import {
  NButton,
  NConfigProvider,
  NDrawer,
  NDrawerContent,
  NIcon,
  NLayout,
  NLayoutSider,
  NMenu,
  NScrollbar,
  NTag,
  darkTheme,
  zhCN,
  dateZhCN,
} from 'naive-ui';
import Workspace from './NaiveWorkspace.vue';
import ComponentGallery from '../../ui-demo/ComponentGallery.vue';
import Demos from './NaiveDemos.vue';
import {
  componentPreview,
  componentGroups,
  componentMenu,
  useDemoNavigation,
  workspaceMenu,
} from './demo-navigation';
const logo = `${import.meta.env.BASE_URL}favicon.svg`;
const allGroups = [
  { title: '工作空间', items: workspaceMenu },
  ...componentGroups,
];
const groups = componentPreview ? componentGroups : allGroups;
const { page, open, title, select } = useDemoNavigation(groups);
const dark = ref(false);
const menu = groups.flatMap((group) => {
  const children = group.items.map(({ id, label, icon }) => ({
    key: id,
    label,
    icon: () => h(NIcon, null, { default: () => h(icon) }),
  }));
  return group.title
    ? [{ key: group.title, label: group.title, type: 'group' as const, children }]
    : children;
});
watch(dark, (value) =>
  document.documentElement.classList.toggle('dark', value),
);
</script>
<template>
  <NConfigProvider
    :theme="dark ? darkTheme : null"
    :locale="zhCN"
    :date-locale="dateZhCN"
    style="height: 100%"
  >
    <NLayout has-sider class="library-shell">
      <NLayoutSider
        :width="232"
        bordered
        class="library-desktop-sidebar library-menu-sidebar"
        ><div class="library-brand"><img :src="logo" alt="" />WorkerKit</div>
        <NScrollbar class="library-menu-scroll"
          ><NMenu
            :value="page"
            :options="menu"
            @update:value="select" /></NScrollbar
      ></NLayoutSider>
      <NLayout
        class="library-scroll"
        content-style="height:100%; display:flex; flex-direction:column; overflow:hidden"
      >
        <header class="library-header" data-library-header>
          <NButton
            class="library-mobile-toggle"
            aria-label="打开侧边栏"
            @click="open = true"
            ><Menu :size="18" /></NButton
          ><strong>{{ title }}</strong
          ><NTag>Naive UI</NTag
          ><NButton
            :aria-label="dark ? '切换浅色主题' : '切换深色主题'"
            @click="dark = !dark"
            ><Sun v-if="dark" :size="17" /><Moon v-else :size="17"
          /></NButton>
        </header>
        <main class="library-content" style="flex: 1" data-library-scroll>
          <ComponentGallery v-if="page === 'gallery'" />
          <Demos
            v-else-if="componentMenu.some((item) => item.id === page)"
            :key="page"
            :kind="page"
            :title="title"
            @toggle-theme="dark = !dark"
          />
          <Workspace v-else :section="page" :title="title" />
        </main>
      </NLayout>
      <NDrawer v-model:show="open" placement="left" :width="280"
        ><NDrawerContent title="WorkerKit"
          ><NMenu
            :value="page"
            :options="menu"
            @update:value="select" /></NDrawerContent
      ></NDrawer>
    </NLayout>
  </NConfigProvider>
</template>
