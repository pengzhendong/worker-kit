<script setup>
import componentPages from '../../../ui-demo/component-pages.json';
import workspacePages from '../../../ui-demo/workspace-pages.json';
import AppMenuItem from './AppMenuItem.vue';
const componentIcons = { table: 'pi pi-table', form: 'pi pi-pencil', dialogs: 'pi pi-window-maximize', preview: 'pi pi-eye', layout: 'pi pi-th-large', theme: 'pi pi-palette' };
const icons = ['pi pi-bolt', 'pi pi-home', 'pi pi-sitemap', 'pi pi-list', 'pi pi-cog'];
const componentPreview = componentPages.some(page => location.pathname.endsWith(page.path));
const model = [
  ...(!componentPreview ? [{ label: '工作空间', items: workspacePages.filter(page => page.id !== 'workspace' || location.pathname.endsWith('/workspace')).map((page) => ({ label: page.label, icon: icons[workspacePages.indexOf(page)], to: page.path })) }] : []),
  { label: '对比示例', items: componentPages.map(page => ({ label: page.title, icon: componentIcons[page.key], to: page.path })) },
];
</script>
<template><ul class="layout-menu"><AppMenuItem v-for="(item, i) in model" :key="i" :item="item" :index="i" /></ul></template>
