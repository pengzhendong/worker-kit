<script setup>
import componentPages from '../../../ui-demo/component-pages.json';
import AppMenuItem from './AppMenuItem.vue';
const componentIcons = { table: 'pi pi-table', form: 'pi pi-pencil', dialogs: 'pi pi-window-maximize', preview: 'pi pi-eye', layout: 'pi pi-th-large', theme: 'pi pi-palette' };
const model = [{ label: '工作空间', items: [
  { label: '业务工作台', icon: 'pi pi-bolt', to: '/workspace' },
  { label: '运行概览', icon: 'pi pi-home', to: '/' },
  { label: '任务调度', icon: 'pi pi-sitemap', to: '/tasks' },
  { label: '资源管理', icon: 'pi pi-folder-open', to: '/resources' },
  { label: '运行日志', icon: 'pi pi-list', to: '/logs' },
  { label: '应用设置', icon: 'pi pi-cog', to: '/settings' },
] }, { label: '组件体验', items: componentPages.map(page => ({ label: page.title, icon: componentIcons[page.key], to: page.path })) }];
</script>
<template><ul class="layout-menu"><AppMenuItem v-for="(item, i) in model" :key="i" :item="item" :index="i" /></ul></template>
