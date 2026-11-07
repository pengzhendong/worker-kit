<script setup>
import { ref } from 'vue';

defineProps({ focus: { type: String, required: true } });
const selection = ref('概览');
const groups = [
  {
    id: 'pages',
    label: '页面',
    items: ['概览', '项目', '设置'].map((label) => ({
      label,
      onSelect: () => {
        selection.value = label;
      },
    })),
  },
];
</script>

<template>
  <UDashboardGroup
    :persistent="false"
    unit="px"
    class="relative inset-auto h-64 w-full rounded-lg border border-default"
  >
    <UDashboardSidebar
      v-if="!['panel', 'toolbar', 'search', 'search-button'].includes(focus)"
      :default-size="160"
      :min-size="100"
      :max-size="240"
      :resizable="focus === 'resize-handle'"
      :collapsible="focus === 'sidebar-collapse'"
      :ui="{
        root: focus === 'sidebar-toggle' ? 'min-h-0 lg:hidden' : 'min-h-0',
        content: 'lg:flex',
        overlay: 'lg:block',
      }"
    >
      <template #header><span class="font-medium">工作空间</span></template>
      <UButton
        variant="ghost"
        color="neutral"
        label="概览"
        @click="selection = '概览'"
      />
      <UButton
        variant="ghost"
        color="neutral"
        label="项目"
        @click="selection = '项目'"
      />
    </UDashboardSidebar>
    <UDashboardPanel :ui="{ body: 'gap-3 p-3' }">
      <template #header>
        <UDashboardNavbar :title="selection" :toggle="false">
          <template
            v-if="focus === 'sidebar-toggle' || focus === 'sidebar-collapse'"
            #leading
          >
            <UDashboardSidebarToggle
              v-if="focus === 'sidebar-toggle'"
              class="lg:inline-flex"
            />
            <UDashboardSidebarCollapse
              v-else
              class="inline-flex lg:inline-flex"
            />
          </template>
          <template
            v-if="focus === 'search' || focus === 'search-button'"
            #right
          >
            <UDashboardSearchButton label="搜索页面" />
          </template>
        </UDashboardNavbar>
        <UDashboardToolbar v-if="focus === 'toolbar'">
          <template #left><UBadge variant="subtle">已同步</UBadge></template>
          <template #right
            ><UButton
              icon="i-lucide-plus"
              size="sm"
              @click="selection = '新项目'"
              >新建</UButton
            ></template
          >
        </UDashboardToolbar>
      </template>
      <template #body
        ><span>{{ selection }}</span></template
      >
    </UDashboardPanel>
    <UDashboardSearch
      v-if="focus === 'search' || focus === 'search-button'"
      :groups="groups"
      :color-mode="false"
    />
  </UDashboardGroup>
</template>
