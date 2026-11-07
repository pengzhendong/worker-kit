<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import UContentSurround from '@nuxt/ui/components/content/ContentSurround.vue';

const route = useRoute();
const pages = [
  { title: '安装', path: '/install', description: '准备环境与依赖' },
  { title: '配置', path: '/config', description: '选择组件与主题' },
  { title: '发布', path: '/deploy', description: '构建并发布站点' },
];
const current = computed(() => {
  const index = pages.findIndex((page) => page.path === route.path);
  return index < 0 ? 1 : index;
});
const surround = computed(() => [
  pages[current.value - 1],
  pages[current.value + 1],
]);
</script>

<template>
  <div class="grid gap-3">
    <UCard
      ><p aria-live="polite">{{ pages[current].title }}</p></UCard
    >
    <UContentSurround :surround="surround" />
  </div>
</template>
