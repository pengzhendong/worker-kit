<script setup lang="ts">
import { computed, ref } from 'vue';
import type { TableColumn } from '@nuxt/ui';
import { logs, type Log } from '../../../ui-demo/data';
const query = ref('');
const level = ref('all');
const levels = { info: { label: '信息', color: 'info' as const }, warn: { label: '警告', color: 'warning' as const }, error: { label: '错误', color: 'error' as const } };
const filtered = computed(() => logs.value.filter(l => (level.value === 'all' || l.level === level.value) && `${l.message} ${l.app}`.toLowerCase().includes(query.value.toLowerCase())));
const columns: TableColumn<Log>[] = [{ accessorKey: 'time', header: '时间' }, { accessorKey: 'level', header: '级别' }, { accessorKey: 'app', header: '应用' }, { accessorKey: 'message', header: '事件内容' }, { accessorKey: 'duration', header: '耗时' }];
function download() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(filtered.value, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'workerkit-demo-logs.json'; a.click(); URL.revokeObjectURL(url);
}
</script>
<template>
  <div>
    <div class="page-heading"><div><h2>运行日志</h2><p>按应用和级别查看执行事件，快速定位异常。</p></div><UButton icon="i-lucide-download" color="neutral" variant="outline" @click="download">导出日志</UButton></div>
    <UAlert class="mb-6" icon="i-lucide-triangle-alert" title="示例异常：示例上游请求超时" description="已有缓存仍可使用。接入真实服务后，这里可以展示错误上下文和重试入口。" color="warning" variant="subtle" />
    <UCard :ui="{ body: 'p-0', header: 'p-4 sm:px-5', footer: 'px-5 py-3' }">
      <template #header><div class="flex gap-3 justify-between flex-wrap"><UInput v-model="query" icon="i-lucide-search" placeholder="搜索日志或应用…" aria-label="搜索日志" class="w-full sm:w-80" /><USelect v-model="level" :items="[{ label: '全部级别', value: 'all' }, { label: '信息', value: 'info' }, { label: '警告', value: 'warn' }, { label: '错误', value: 'error' }]" aria-label="日志级别筛选" class="w-32" /></div></template>
      <UTable :data="filtered" :columns="columns" empty="没有符合条件的日志。" :ui="{ th: 'text-xs text-muted bg-elevated/45', td: 'py-4 align-top' }">
        <template #time-cell="{ row }"><span class="text-xs tabular text-muted">{{ row.original.time }}</span></template>
        <template #level-cell="{ row }"><UBadge :color="levels[row.original.level].color" variant="subtle" size="sm">{{ levels[row.original.level].label }}</UBadge></template>
        <template #app-cell="{ row }"><span class="font-mono text-xs">{{ row.original.app }}</span></template>
        <template #message-cell="{ row }"><span class="whitespace-normal block min-w-64 max-w-xl leading-6">{{ row.original.message }}</span></template>
      </UTable>
      <template #footer><p class="text-xs text-muted">{{ filtered.length }} 条事件 · 手动运行演示任务后，可在这里查看新增记录。</p></template>
    </UCard>
  </div>
</template>
