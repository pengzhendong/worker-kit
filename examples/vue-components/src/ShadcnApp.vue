<script setup lang="ts">
import { ref, watch } from 'vue';
import { Menu, Moon, Sun } from '@lucide/vue';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from './components/ui/sheet';
import Workspace from './ShadcnWorkspace.vue';
import ComponentGallery from '../../ui-demo/ComponentGallery.vue';
import Demos from './ShadcnDemos.vue';
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
const logo = `${import.meta.env.BASE_URL}favicon.svg`;
const groups = componentPreview ? componentGroups : allGroups;
const { page, open, title, select } = useDemoNavigation(groups);
const dark = ref(false);
watch(dark, (value) =>
  document.documentElement.classList.toggle('dark', value),
);
</script>
<template>
  <div class="library-shell flex">
    <aside class="shadcn-sidebar library-desktop-sidebar">
      <div class="library-brand"><img :src="logo" alt="" />WorkerKit</div>
      <nav class="library-menu-scroll" aria-label="工作台导航">
        <div
          v-for="group in groups"
          :key="group.title"
          class="library-menu-group"
        >
          <p v-if="group.title">{{ group.title }}</p>
          <Button
            v-for="item in group.items"
            :key="item.id"
            :variant="page === item.id ? 'secondary' : 'ghost'"
            :aria-current="page === item.id ? 'page' : undefined"
            class="justify-start w-full"
            @click="select(item.id)"
            ><component :is="item.icon" aria-hidden="true" />{{
              item.label
            }}</Button
          >
        </div>
      </nav>
    </aside>
    <div class="library-scroll flex-1">
      <header class="library-header" data-library-header>
        <Button
          variant="outline"
          class="library-mobile-toggle"
          aria-label="打开侧边栏"
          @click="open = true"
          ><Menu /></Button
        ><strong>{{ title }}</strong
        ><Badge variant="secondary">shadcn-vue</Badge
        ><Button
          variant="outline"
          size="icon"
          :aria-label="dark ? '切换浅色主题' : '切换深色主题'"
          @click="dark = !dark"
          ><Sun v-if="dark" /><Moon v-else
        /></Button>
      </header>
      <main class="library-content flex-1" data-library-scroll>
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
    </div>
    <Sheet v-model:open="open"
      ><SheetContent side="left"
        ><SheetHeader><SheetTitle>WorkerKit</SheetTitle></SheetHeader>
        <nav class="library-menu-scroll" aria-label="工作台导航">
          <div
            v-for="group in groups"
            :key="group.title"
            class="library-menu-group"
          >
            <p v-if="group.title">{{ group.title }}</p>
            <Button
              v-for="item in group.items"
              :key="item.id"
              :variant="page === item.id ? 'secondary' : 'ghost'"
              :aria-current="page === item.id ? 'page' : undefined"
              class="justify-start w-full"
              @click="select(item.id)"
              ><component :is="item.icon" aria-hidden="true" />{{
                item.label
              }}</Button
            >
          </div>
        </nav>
      </SheetContent></Sheet
    >
  </div>
</template>
