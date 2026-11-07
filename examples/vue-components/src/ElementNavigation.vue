<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{
  active: string;
  groups: {
    title: string;
    items: { id: string; label: string; icon: Component }[];
  }[];
}>();
const emit = defineEmits<{ select: [id: string] }>();
</script>

<template>
  <ElScrollbar class="element-navigation">
    <ElMenu
      aria-label="工作台导航"
      :default-active="active"
      @select="emit('select', $event)"
    >
      <template v-for="group in groups" :key="group.title">
        <ElMenuItemGroup v-if="group.title" :title="group.title">
          <ElMenuItem
            v-for="item in group.items"
            :key="item.id"
            :index="item.id"
            :aria-current="active === item.id ? 'page' : undefined"
          >
            <ElIcon aria-hidden="true"><component :is="item.icon" /></ElIcon>
            <span>{{ item.label }}</span>
          </ElMenuItem>
        </ElMenuItemGroup>
        <ElMenuItem
          v-else
          v-for="item in group.items"
          :key="item.id"
          :index="item.id"
          :aria-current="active === item.id ? 'page' : undefined"
        >
          <ElIcon aria-hidden="true"><component :is="item.icon" /></ElIcon>
          <span>{{ item.label }}</span>
        </ElMenuItem>
      </template>
    </ElMenu>
  </ElScrollbar>
</template>

<style scoped>
.element-navigation :deep(.el-menu) {
  --el-menu-item-height: 44px;
  border-right: 0;
  padding: 4px 8px 12px;
}
.element-navigation :deep(.el-menu-item-group__title) {
  padding: 14px 12px 4px;
  color: var(--el-text-color-secondary);
}
.element-navigation :deep(.el-menu-item) {
  border-radius: 6px;
  padding-inline: 12px;
}
.element-navigation :deep(.el-menu-item.is-active) {
  background: var(--el-color-primary-light-9);
  font-weight: 600;
}
</style>
