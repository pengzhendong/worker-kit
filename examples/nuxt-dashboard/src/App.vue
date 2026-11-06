<script setup lang="ts">
const base = import.meta.env.BASE_URL;
import { computed, nextTick, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useEventListener } from '@vueuse/core';
import type { NavigationMenuItem } from '@nuxt/ui';
import { zh_cn } from '@nuxt/ui/locale';
import componentPages from '../../ui-demo/component-pages.json';

const route = useRoute();
const isWorkspace = computed(() => route.path === '/workspace');
const open = ref(false);
const sidebarCollapsed = ref(false);
const pageTitle = computed(() => String(route.meta.title || '工作台'));
const searchOpen = ref(false);
const search = ref('');
const navigation: NavigationMenuItem[] = [
  { label: '业务工作台', icon: 'i-lucide-activity', to: '/workspace' },
  { label: '运行概览', icon: 'i-lucide-layout-dashboard', to: '/', exact: true },
  { label: '任务调度', icon: 'i-lucide-workflow', to: '/tasks', badge: '6' },
  { label: '资源管理', icon: 'i-lucide-folder-open', to: '/resources' },
  { label: '运行日志', icon: 'i-lucide-scroll-text', to: '/logs' },
  { label: '应用设置', icon: 'i-lucide-settings-2', to: '/settings' },
];
const componentNavigation = componentPages.map(page => ({ label: page.title, to: page.path, icon: 'i-lucide-' + page.icon }));
const matches = computed(() => [...navigation, ...componentNavigation].filter(item => item.label?.includes(search.value)));
watch(() => route.path, async () => {
  open.value = false;
  searchOpen.value = false;
  document.title = `WorkerKit · ${String(route.meta.title || '工作台')}`;
  await nextTick();
  document.querySelector('[data-content-scroll]')?.scrollTo({ top: 0 });
});
useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault(); searchOpen.value = !searchOpen.value;
  }
});
</script>

<template>
  <UApp :locale="zh_cn">
    <UDashboardGroup unit="px" storage="local" storage-key="workerkit-nuxt-layout">
      <UDashboardSidebar v-model:open="open" v-model:collapsed="sidebarCollapsed" collapsible :default-size="232" :min-size="232" :collapsed-size="72" :ui="{ root: 'bg-elevated/45', header: 'h-16 px-5', body: 'px-3 gap-4', footer: 'border-t border-default p-3' }">
        <template #header="{ collapsed }">
          <RouterLink to="/" class="brand" aria-label="WorkerKit 首页">
            <img :src="base + 'favicon.svg'" alt="" class="size-8 shrink-0" />
            <span v-if="!collapsed" class="text-lg font-semibold tracking-tight">WorkerKit<span class="text-primary">.</span></span>
          </RouterLink>
        </template>
        <template #default="{ collapsed }">
          <UButton icon="i-lucide-search" :label="collapsed ? undefined : '搜索页面…'" color="neutral" variant="outline" :square="collapsed" block aria-label="搜索页面" class="justify-start bg-default" @click="searchOpen = true">
            <template v-if="!collapsed" #trailing><UKbd class="ms-auto">⌘ K</UKbd></template>
          </UButton>
          <div>
            <p v-if="!collapsed" class="nav-caption">工作空间</p>
            <UNavigationMenu :items="navigation.slice(0, 1)" :collapsed="collapsed" orientation="vertical" :ui="{ link: 'h-11 px-3 gap-3', linkLeadingIcon: 'size-5', label: 'text-sm' }" tooltip />
          </div>
          <div v-if="navigation.length > 1"><p v-if="!collapsed" class="nav-caption">界面示例</p><UNavigationMenu :items="navigation.slice(1)" :collapsed="collapsed" orientation="vertical" tooltip /></div>
          <div v-if="componentNavigation.length"><p v-if="!collapsed" class="nav-caption">组件体验</p><UNavigationMenu :items="componentNavigation" :collapsed="collapsed" orientation="vertical" :ui="{ link: 'h-11 px-3 gap-3', linkLeadingIcon: 'size-5' }" tooltip /></div>
          <div v-if="!collapsed" class="mt-auto rounded-xl border border-default bg-default p-4">
            <div class="flex items-center gap-2 text-sm font-medium"><UIcon name="i-lucide-sparkles" class="text-primary size-4" />新界面，先体验</div>
            <p class="mt-2 text-xs leading-5 text-muted">试试任务、资源与设置。{{ isWorkspace ? '任务与运行记录保存在当前后端。' : '所有操作仅影响本地演示。' }}</p>
            <UButton to="https://ui.nuxt.com" target="_blank" color="neutral" variant="link" size="xs" trailing-icon="i-lucide-arrow-up-right" class="mt-2 px-0">Nuxt UI 官方文档</UButton>
          </div>
        </template>
        <template #footer>
          <UDropdownMenu :items="[{ label: '应用设置', icon: 'i-lucide-settings-2', to: '/settings' }, { label: '关于 Nuxt UI', icon: 'i-lucide-book-open', to: 'https://ui.nuxt.com', target: '_blank' }]" :content="{ side: 'top', align: 'start' }" :ui="{ content: 'w-52' }">
            <UButton color="neutral" variant="ghost" class="w-full p-2" :square="sidebarCollapsed" aria-label="示例工作空间菜单">
              <UAvatar text="P" size="sm" :ui="{ root: 'bg-primary/10 text-primary' }" />
              <span v-if="!sidebarCollapsed" class="flex-1 text-left"><span class="block text-sm font-medium">Demo User</span><span class="block text-xs text-muted">示例工作空间</span></span>
              <UIcon v-if="!sidebarCollapsed" name="i-lucide-chevrons-up-down" class="size-4 text-dimmed" />
            </UButton>
          </UDropdownMenu>
        </template>
      </UDashboardSidebar>

      <UDashboardPanel id="main" :ui="{ body: 'p-0 gap-0 bg-default' }">
        <template #header>
          <UDashboardNavbar :title="pageTitle" :ui="{ root: 'h-16 px-4 lg:px-8', title: 'text-sm font-medium' }">
            <template #leading><UDashboardSidebarCollapse class="hidden lg:flex" :ui="{ base: 'text-muted' }" /></template>
            <template #right>
              <UBadge variant="subtle" color="neutral" size="sm" class="hidden sm:inline-flex">Nuxt UI 示范</UBadge>
              <USeparator orientation="vertical" class="h-4 mx-1 hidden sm:block" />
              <UColorModeButton aria-label="切换明暗主题" />
            </template>
          </UDashboardNavbar>
        </template>
        <template #body>
          <div data-content-scroll class="content-scroll">
            <main class="page-container"><RouterView /></main>
            <footer class="page-footer"><span>WorkerKit · Nuxt UI</span><span class="flex items-center gap-1.5"><span class="size-1.5 rounded-full bg-amber-500" />{{ isWorkspace ? '任务与诊断 · 服务端数据' : '演示数据 · 未连接生产服务' }}</span></footer>
          </div>
        </template>
      </UDashboardPanel>
    </UDashboardGroup>

    <UModal v-model:open="searchOpen" title="跳转到页面" description="搜索工作空间中的页面" :ui="{ content: 'sm:max-w-md' }">
      <template #body>
        <UInput v-model="search" autofocus icon="i-lucide-search" placeholder="输入页面名称…" aria-label="页面名称" class="w-full mb-3" />
        <div class="space-y-1"><UButton v-for="item in matches" :key="String(item.to)" :to="item.to" :icon="item.icon" :label="item.label" color="neutral" variant="ghost" block class="justify-start" /><p v-if="!matches.length" class="py-6 text-center text-muted">没有找到匹配页面</p></div>
      </template>
    </UModal>
  </UApp>
</template>
