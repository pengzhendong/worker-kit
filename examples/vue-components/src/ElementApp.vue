<script setup lang="ts">
import { ref, watch } from 'vue';
import { FileCode, KeyRound, Menu, Moon, ShieldCheck, Sun } from '@lucide/vue';
import ElementNavigation from './ElementNavigation.vue';
import Workspace from './ElementWorkspace.vue';
import ComponentGallery from '../../ui-demo/ComponentGallery.vue';
import Demos from './ElementDemos.vue';
import {
  componentPreview,
  componentGroups,
  componentMenu,
  useDemoNavigation,
  workspaceMenu,
} from './demo-navigation';
const allGroups = [
  { title: '工作空间', items: workspaceMenu },
  {
    title: '系统管理',
    items: [
      { id: 'keys', label: '访问密钥', icon: KeyRound },
      { id: 'audit', label: '操作审计', icon: ShieldCheck },
      { id: 'api', label: 'API 中心', icon: FileCode },
    ],
  },
  ...componentGroups,
];
const logo = `${import.meta.env.BASE_URL}favicon.svg`;
const groups = componentPreview ? componentGroups : allGroups;
const { page, open, title, select } = useDemoNavigation(groups);
const dark = ref(false);
watch(dark, (value) =>
  document.documentElement.classList.toggle('dark', value),
);
</script>
<template>
  <ElContainer class="library-shell">
    <ElAside width="232px" class="library-sidebar library-desktop-sidebar">
      <div class="library-brand"><img :src="logo" alt="" />WorkerKit</div>
      <ElementNavigation :active="page" :groups="groups" @select="select" />
    </ElAside>
    <ElContainer class="library-scroll">
      <ElHeader class="library-header" data-library-header
        ><ElButton
          class="library-mobile-toggle"
          aria-label="打开侧边栏"
          @click="open = true"
          ><Menu :size="18" /></ElButton
        ><strong>{{ title }}</strong
        ><ElTag>Element Plus</ElTag
        ><ElButton
          :aria-label="dark ? '切换浅色主题' : '切换深色主题'"
          @click="dark = !dark"
          ><Sun v-if="dark" :size="17" /><Moon v-else :size="17" /></ElButton
      ></ElHeader>
      <ElMain class="library-content" data-library-scroll>
        <ComponentGallery v-if="page === 'gallery'" />
        <Demos
          v-else-if="componentMenu.some((item) => item.id === page)"
          :key="page"
          :kind="page"
          :title="title"
          @toggle-theme="dark = !dark"
        />
        <Workspace v-else :section="page" :title="title" />
      </ElMain>
    </ElContainer>
    <ElDrawer v-model="open" title="WorkerKit" direction="ltr" size="280px">
      <ElementNavigation :active="page" :groups="groups" @select="select" />
    </ElDrawer>
  </ElContainer>
</template>

<style scoped>
.library-sidebar {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.library-sidebar .library-brand {
  flex-shrink: 0;
}
.library-sidebar .element-navigation {
  flex: 1;
  min-height: 0;
}
@media (max-width: 1023px) {
  .library-shell > .library-desktop-sidebar {
    display: none;
  }
}
</style>
