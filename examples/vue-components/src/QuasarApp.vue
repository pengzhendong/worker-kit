<script setup lang="ts">
import { computed, type Component } from 'vue';
import { useEventListener } from '@vueuse/core';
import { useQuasar } from 'quasar';
import { Menu, Moon } from '@lucide/vue';
import ComponentGallery from '../../ui-demo/ComponentGallery.vue';
import Workspace from './QuasarWorkspace.vue';
import DemoFiles from './DemoFiles.vue';
import {
  componentIcons,
  filePreview,
  galleryPage,
  useDemoNavigation,
  workspaceMenu,
} from './demo-navigation';

const props = defineProps<{
  demoPages?: {
    key: string;
    path: string;
    title: string;
    description: string;
  }[];
  demoComponent?: Component;
}>();
const comparisonItems = props.demoPages?.map((entry) => ({
  id: entry.key,
  label: entry.title,
  path: entry.path,
  description: entry.description,
  icon: componentIcons[entry.key],
})) ?? [{ ...filePreview, path: '/components/preview', description: '' }];
const hasGallery =
  props.demoPages &&
  import.meta.env.BASE_URL === '/quasar/' &&
  (location.pathname.endsWith(galleryPage.path) ||
    comparisonItems.some((item) => location.pathname.endsWith(item.path)));
const items = hasGallery ? [galleryPage, ...comparisonItems] : comparisonItems;
const componentAt = () =>
  items.find((item) => location.pathname.endsWith(item.path));
const initialComponent = componentAt();
const groups = [
  ...(!initialComponent ? [{ title: '工作空间', items: workspaceMenu }] : []),
  ...(hasGallery ? [{ title: '', items: [galleryPage] }] : []),
  { title: '对比示例', items: comparisonItems },
];
const { page, open, title, select } = useDemoNavigation(
  groups,
  initialComponent?.id,
);
const q = useQuasar();
const selectedComponent = computed(() =>
  items.find((item) => item.id === page.value),
);

function choose(id: string) {
  if (id === page.value) {
    open.value = false;
    return;
  }
  const item = items.find((entry) => entry.id === id);
  if (initialComponent && item)
    history.pushState(
      null,
      '',
      import.meta.env.BASE_URL + item.path.slice(1) + location.search,
    );
  void select(id);
}
useEventListener(window, 'popstate', () => {
  const item = componentAt();
  if (initialComponent && item) void select(item.id);
});
</script>

<template>
  <QLayout view="hHh Lpr fFf" container class="native-full-layout">
    <QHeader
      bordered
      data-library-header
      :class="
        q.dark.isActive ? 'bg-grey-10 text-white' : 'bg-white text-grey-9'
      "
    >
      <QToolbar>
        <QBtn
          flat
          round
          aria-label="打开侧边栏"
          class="lt-md"
          @click="open = !open"
          ><Menu :size="20"
        /></QBtn>
        <QToolbarTitle>WorkerKit · Quasar</QToolbarTitle>
        <QBtn flat round aria-label="切换深色主题" @click="q.dark.toggle()"
          ><Moon :size="20"
        /></QBtn>
      </QToolbar>
    </QHeader>
    <QDrawer
      :model-value="q.screen.gt.sm || open"
      :breakpoint="1023"
      bordered
      :width="232"
      @update:model-value="open = $event"
    >
      <nav aria-label="工作台导航">
        <QList v-for="group in groups" :key="group.title" class="q-pa-sm">
          <QItemLabel v-if="group.title" header>{{ group.title }}</QItemLabel>
          <QItem
            v-for="item in group.items"
            :key="item.id"
            tag="button"
            type="button"
            class="demo-menu-item"
            active-class="demo-menu-active"
            clickable
            :active="page === item.id"
            :aria-current="page === item.id ? 'page' : undefined"
            @click="choose(item.id)"
          >
            <QItemSection avatar class="demo-menu-icon"
              ><component :is="item.icon" :size="18" aria-hidden="true"
            /></QItemSection>
            <QItemSection>{{ item.label }}</QItemSection>
          </QItem>
        </QList>
      </nav>
    </QDrawer>
    <QPageContainer>
      <QPage class="native-library-content" data-library-scroll>
        <ComponentGallery v-if="page === 'gallery'" />
        <component
          v-else-if="selectedComponent && demoComponent"
          :is="demoComponent"
          :key="selectedComponent.id"
          :kind="selectedComponent.id"
          :title="selectedComponent.label"
          :description="selectedComponent.description"
        />
        <DemoFiles v-else-if="page === 'preview'" />
        <Workspace v-else :section="page" :title="title" />
      </QPage>
    </QPageContainer>
  </QLayout>
</template>

<style scoped>
.demo-menu-item {
  width: 100%;
  min-height: 44px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
}
.demo-menu-icon {
  min-width: 0;
  padding-inline-end: 12px;
}
.demo-menu-active {
  color: var(--q-primary);
  background: color-mix(in srgb, var(--q-primary) 12%, transparent);
  font-weight: 600;
}
.body--dark .demo-menu-active {
  color: #90caf9;
}
.demo-menu-item:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: -2px;
}
</style>
