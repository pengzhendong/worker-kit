<script setup>
import { defineAsyncComponent, ref } from 'vue';

const active = ref('basic');
const modes = [
  {
    id: 'basic',
    label: '基础表格',
    example: defineAsyncComponent(
      () => import('./data-tables--data-and-display.vue'),
    ),
  },
  {
    id: 'server',
    label: '服务端分页',
    example: defineAsyncComponent(
      () => import('./data-tables--server-side-tables.vue'),
    ),
  },
  {
    id: 'virtual',
    label: '虚拟滚动',
    example: defineAsyncComponent(
      () => import('./data-tables--virtual-tables.vue'),
    ),
  },
];
</script>

<template>
  <div>
    <v-tabs v-model="active" show-arrows aria-label="数据表格模式">
      <v-tab v-for="mode in modes" :key="mode.id" :value="mode.id">{{
        mode.label
      }}</v-tab>
    </v-tabs>
    <v-window v-model="active">
      <v-window-item v-for="mode in modes" :key="mode.id" :value="mode.id">
        <component :is="mode.example" />
      </v-window-item>
    </v-window>
  </div>
</template>
