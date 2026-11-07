<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import UContentNavigation from '@nuxt/ui/components/content/ContentNavigation.vue';

const route = useRoute();
const navigation = [
  {
    title: '快速上手',
    path: '/guide',
    children: [
      { title: '安装', path: '/guide/install' },
      { title: '配置', path: '/guide/configure' },
    ],
  },
];
const current = computed(() =>
  navigation[0].children.find((page) => page.path === route.path),
);
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <UContentNavigation :navigation="navigation" highlight />
    <UCard
      ><p aria-live="polite">{{ current?.title ?? '请选择左侧条目' }}</p></UCard
    >
  </div>
</template>
