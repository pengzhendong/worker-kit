<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import UContentSearch from '@nuxt/ui/components/content/ContentSearch.vue';
import UContentSearchButton from '@nuxt/ui/components/content/ContentSearchButton.vue';

const route = useRoute();
const navigation = [
  { title: '安装组件库', path: '/install', content: '使用 npm 安装依赖' },
  { title: '配置主题', path: '/theme', content: '调整品牌色与深色模式' },
  { title: '发布 Worker', path: '/deploy', content: '构建后部署静态文件' },
];
const files = navigation.map((page) => ({
  id: page.path,
  title: page.title,
  titles: [],
  level: 1,
  content: page.content,
}));
const selected = computed(() =>
  navigation.find((page) => page.path === route.path),
);
</script>

<template>
  <div class="grid justify-items-start gap-3">
    <UContentSearchButton label="搜索示例文档" />
    <UContentSearch
      :files="files"
      :navigation="navigation"
      :color-mode="false"
      title="搜索示例文档"
    />
    <p v-if="selected" aria-live="polite">{{ selected.content }}</p>
  </div>
</template>
