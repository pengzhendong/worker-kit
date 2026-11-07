<script setup lang="ts">
import { ref } from 'vue';
import { useDisplay } from 'vuetify';
import Workspace from './VuetifyWorkspace.vue';
import ComponentGallery from '../../ui-demo/ComponentGallery.vue';
import Demos from './VuetifyDemos.vue';
import { Menu, Moon } from '@lucide/vue';
import {
  componentPreview,
  componentGroups,
  componentMenu,
  useDemoNavigation,
  workspaceMenu,
} from './demo-navigation';

const allGroups = [
  { title: '工作空间', items: workspaceMenu },
  ...componentGroups,
];
const groups = componentPreview ? componentGroups : allGroups;
const { page, open, title, select } = useDemoNavigation(groups);
const { mdAndUp } = useDisplay();
const dark = ref(false);
</script>

<template>
  <VApp :theme="dark ? 'dark' : 'light'">
    <VLayout class="native-full-layout">
      <VNavigationDrawer
        :model-value="mdAndUp || open"
        :temporary="!mdAndUp"
        :width="232"
        @update:model-value="open = $event"
      >
        <nav aria-label="工作台导航">
          <VList
            v-for="group in groups"
            :key="group.title"
            density="compact"
            nav
          >
            <VListSubheader v-if="group.title">{{ group.title }}</VListSubheader>
            <VListItem
              v-for="item in group.items"
              :key="item.id"
              :title="item.label"
              :active="page === item.id"
              :aria-current="page === item.id ? 'page' : undefined"
              @click="select(item.id)"
            >
              <template #prepend
                ><component
                  :is="item.icon"
                  :size="18"
                  aria-hidden="true"
                  class="me-4"
              /></template>
            </VListItem>
          </VList>
        </nav>
      </VNavigationDrawer>
      <VAppBar data-library-header flat border>
        <VAppBarNavIcon
          v-if="!mdAndUp"
          aria-label="打开侧边栏"
          @click="open = !open"
          ><Menu :size="20"
        /></VAppBarNavIcon>
        <VAppBarTitle>WorkerKit · Vuetify</VAppBarTitle>
        <VBtn icon aria-label="切换深色主题" @click="dark = !dark"
          ><Moon :size="20"
        /></VBtn>
      </VAppBar>
      <VMain>
        <div class="native-library-content" data-library-scroll>
          <ComponentGallery v-if="page === 'gallery'" />
          <Demos
            v-else-if="componentMenu.some((item) => item.id === page)"
            :key="page"
            :kind="page"
            :title="title"
            @toggle-theme="dark = !dark"
          />
          <Workspace v-else :section="page" :title="title" />
        </div>
      </VMain>
    </VLayout>
  </VApp>
</template>
