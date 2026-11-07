<script setup lang="ts">
import { useRoute } from 'vue-router';
const route = useRoute();
import { computed, reactive, ref, watch } from 'vue';
import type { FormError, TableColumn } from '@nuxt/ui';
import { tasks, statusInfo, runDemoTask, type Task } from '../../../ui-demo/data';

const toast = useToast();
const query = ref('');
const filter = ref('all');
const page = ref(1);
const pageSize = 2;
const createOpen = ref(false);
const draft = reactive({ name: '', app: 'demo-api', schedule: '每天 09:00' });
const columns: TableColumn<Task>[] = [
  { accessorKey: 'name', header: '任务名称' }, { accessorKey: 'app', header: '应用' },
  { accessorKey: 'schedule', header: '执行计划' }, { accessorKey: 'status', header: '最近结果' },
  { accessorKey: 'lastRun', header: '上次执行' }, { accessorKey: 'enabled', header: '启用' }, { id: 'actions', header: '操作' },
];
const filtered = computed(() => tasks.value.filter(task =>
  `${task.name} ${task.app} ${task.description}`.toLowerCase().includes(query.value.toLowerCase()) &&
  (filter.value === 'all' || (filter.value === 'enabled' ? task.enabled : !task.enabled))));
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const visibleTasks = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize));
watch([query, filter], () => { page.value = 1; });
watch(pageCount, (count) => { page.value = Math.min(page.value, count); });
const validate = (state: typeof draft): FormError[] => state.name.trim().length < 2 ? [{ name: 'name', message: '请输入至少 2 个字的任务名称' }] : [];
function createTask() {
  tasks.value.unshift({ id: Date.now(), name: draft.name.trim(), description: '新建演示任务', app: draft.app, schedule: draft.schedule, status: 'paused', lastRun: '尚未执行', duration: '—', enabled: false });
  createOpen.value = false;
  draft.name = '';
  toast.add({ title: '演示任务已创建', description: '可启用或手动运行，不会创建真实调度。', color: 'success' });
}
async function run(task: Task) {
  await runDemoTask(task);
  toast.add({ title: '模拟执行完成', description: task.name, color: 'success' });
}
function toggle(task: Task, enabled: boolean) {
  task.enabled = enabled;
  toast.add({ title: enabled ? '已启用演示计划' : '已暂停演示计划', description: task.name, color: 'neutral' });
}
</script>

<template>
  <div>
    <div class="page-heading"><div><h2>{{ route.meta.title || '任务调度' }}</h2><p>{{ route.meta.description || '管理自动化计划，查看执行状态，随时手动运行。' }}</p></div><UButton icon="i-lucide-plus" @click="createOpen = true">新建任务</UButton></div>
    <div class="grid sm:grid-cols-3 gap-4 mb-6">
      <UCard :ui="{ body: 'p-5' }"><p class="text-muted text-sm">全部任务</p><p class="text-2xl font-semibold mt-2 tabular">{{ tasks.length }}<span class="text-xs font-normal text-muted ml-2">个任务</span></p></UCard>
      <UCard :ui="{ body: 'p-5' }"><p class="text-muted text-sm">计划已启用</p><p class="text-2xl font-semibold mt-2 tabular">{{ tasks.filter(t => t.enabled).length }}<span class="text-xs font-normal text-success ml-2">等待下次执行</span></p></UCard>
      <UCard :ui="{ body: 'p-5' }"><p class="text-muted text-sm">最近执行异常</p><p class="text-2xl font-semibold mt-2 tabular">{{ tasks.filter(t => t.status === 'warning').length }}<span class="text-xs font-normal text-warning ml-2">个任务需关注</span></p></UCard>
    </div>
    <UCard :ui="{ body: 'p-0', header: 'p-4 sm:px-5', footer: 'px-5 py-3' }">
      <template #header><div class="flex justify-between items-center gap-3 flex-wrap"><UInput v-model="query" icon="i-lucide-search" placeholder="搜索任务或应用…" aria-label="搜索任务" class="w-full sm:w-72" /><USelect v-model="filter" :items="[{ label: '全部计划', value: 'all' }, { label: '已启用', value: 'enabled' }, { label: '已暂停', value: 'paused' }]" aria-label="任务状态筛选" class="w-32" /></div></template>
      <div class="table-wrap">
        <UTable :data="visibleTasks" :columns="columns" :ui="{ th: 'text-xs text-muted font-medium bg-elevated/45', td: 'py-4', empty: 'py-16' }" empty="没有匹配的任务，试试其他搜索条件。">
          <template #name-cell="{ row }"><div class="min-w-48"><p class="font-medium">{{ row.original.name }}</p><p class="text-xs text-muted mt-1">{{ row.original.description }}</p></div></template>
          <template #app-cell="{ row }"><UBadge variant="subtle" color="neutral" size="sm">{{ row.original.app }}</UBadge></template>
          <template #status-cell="{ row }"><UBadge :color="statusInfo[row.original.status].color" variant="subtle" :icon="statusInfo[row.original.status].icon" size="sm">{{ statusInfo[row.original.status].label }}</UBadge></template>
          <template #lastRun-cell="{ row }"><span class="text-muted text-xs tabular">{{ row.original.lastRun }}</span></template>
          <template #enabled-cell="{ row }"><USwitch :model-value="row.original.enabled" :aria-label="`启用${row.original.name}`" :disabled="row.original.status === 'running'" size="sm" @update:model-value="toggle(row.original, $event)" /></template>
          <template #actions-cell="{ row }"><UButton icon="i-lucide-play" color="neutral" variant="ghost" size="sm" :loading="row.original.status === 'running'" :aria-label="`运行${row.original.name}`" @click="run(row.original)">运行</UButton></template>
        </UTable>
      </div>
      <template #footer><div class="flex justify-between text-xs text-muted gap-3 flex-wrap"><span>显示 {{ filtered.length }} / {{ tasks.length }} 个任务</span><UPagination v-if="pageCount > 1" v-model:page="page" :items-per-page="pageSize" :total="filtered.length" /><span>时间按 Asia/Shanghai 展示</span></div></template>
    </UCard>
    <UAlert class="mt-5" icon="i-lucide-flask-conical" color="neutral" variant="subtle" title="可以放心试操作" description="本页只模拟任务状态；执行结果会出现在运行日志中，刷新页面后任务恢复初始示例。" />

    <UModal v-model:open="createOpen" title="新建演示任务" description="体验任务创建流程，配置不会发送到服务器。">
      <template #body><UForm :state="draft" :validate="validate" class="space-y-5" @submit="createTask">
        <UFormField label="任务名称" name="name" required><UInput v-model="draft.name" placeholder="例如：每日数据同步" class="w-full" autofocus /></UFormField>
        <UFormField label="所属应用" name="app"><USelect v-model="draft.app" :items="['demo-api', 'demo-content', 'demo-jobs', 'demo-storage', 'demo-reports', 'demo-assets']" class="w-full" /></UFormField>
        <UFormField label="执行计划" name="schedule"><USelect v-model="draft.schedule" :items="['每天 09:00', '每天 15:45', '每 30 分钟', '每 6 小时']" class="w-full" /></UFormField>
        <div class="flex justify-end gap-2 pt-3"><UButton color="neutral" variant="outline" @click="createOpen = false">取消</UButton><UButton type="submit">创建任务</UButton></div>
      </UForm></template>
    </UModal>
  </div>
</template>
