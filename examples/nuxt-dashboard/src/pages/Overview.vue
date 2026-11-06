<script setup lang="ts">
import { computed, ref } from 'vue';
import { services, tasks, statusInfo } from '../../../ui-demo/data';

const period = ref('7');
const periods = [{ label: '近 7 天', value: '7' }, { label: '近 14 天', value: '14' }];
const values = computed(() => period.value === '7' ? [38, 51, 44, 68, 56, 82, 73] : [38, 51, 44, 68, 56, 82, 73, 61, 78, 69, 86, 74, 92, 81]);
const points = computed(() => values.value.map((v, i) => `${42 + i * (636 / (values.value.length - 1))},${191 - v * 1.55}`).join(' '));
const stats = [
  { label: 'Worker 应用', value: '8', unit: '个', icon: 'i-lucide-boxes', note: '7 个正常 · 1 个需关注', color: 'blue' },
  { label: '今日任务执行', value: '124', unit: '次', icon: 'i-lucide-workflow', note: '较昨日增加 18 次', color: 'violet' },
  { label: '任务成功率', value: '98.4', unit: '%', icon: 'i-lucide-circle-check', note: '122 次成功 · 2 次异常', color: 'emerald' },
  { label: '资源存储', value: '1.28', unit: 'GB', icon: 'i-lucide-hard-drive', note: '已使用配额的 12.8%', color: 'amber' },
];
</script>

<template>
  <div>
    <div class="page-heading">
      <div><div class="flex items-center gap-2 text-xs text-muted mb-3"><span class="size-1.5 rounded-full bg-primary" />你的服务工作空间</div><h2>运行概览</h2><p>从这里了解应用状态、任务执行与资源使用情况。</p></div>
      <UButton to="/tasks" icon="i-lucide-arrow-up-right" color="neutral" variant="outline">查看任务</UButton>
    </div>

    <div class="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <UCard v-for="stat in stats" :key="stat.label" :ui="{ body: 'p-4 sm:p-5' }">
        <div class="flex items-center justify-between gap-2"><span class="text-muted text-sm">{{ stat.label }}</span><UIcon :name="stat.icon" class="size-4 text-dimmed" /></div>
        <div class="stat-number">{{ stat.value }}<span class="text-sm text-muted font-normal ml-1.5">{{ stat.unit }}</span></div>
        <p class="text-xs text-muted mt-3 flex items-center gap-1.5"><span class="size-1.5 rounded-full" :class="stat.color === 'emerald' ? 'bg-emerald-500' : 'bg-primary/60'" />{{ stat.note }}</p>
      </UCard>
    </div>

    <div class="grid xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)] gap-6 mb-6">
      <UCard :ui="{ body: 'p-5 sm:p-6' }">
        <div class="flex justify-between items-start gap-4 flex-wrap">
          <div><h3 class="section-title">请求趋势</h3><p class="section-description">各应用请求量的示例分布</p></div>
          <USelect v-model="period" :items="periods" aria-label="趋势时间范围" class="w-28" size="sm" />
        </div>
        <div class="flex items-baseline gap-3 mt-5"><strong class="text-2xl tracking-tight tabular">{{ period === '7' ? '31,702' : '64,518' }}</strong><span class="text-xs text-muted">次请求</span><UBadge color="success" variant="subtle" size="sm">+12.6%</UBadge></div>
        <svg viewBox="0 0 700 232" class="w-full mt-4" role="img" :aria-label="`近 ${period} 天请求趋势，演示数据`">
          <defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="var(--ui-primary)" stop-opacity=".18" /><stop offset="100%" stop-color="var(--ui-primary)" stop-opacity=".01" /></linearGradient></defs>
          <g v-for="(line, i) in [35, 87, 139, 191]" :key="line"><line x1="42" x2="678" :y1="line" :y2="line" class="chart-grid" /><text x="0" :y="line + 4" class="chart-text">{{ [9, 6, 3, 0][i] }}k</text></g>
          <polygon :points="`42,191 ${points} 678,191`" fill="url(#chart-fill)" />
          <polyline :points="points" fill="none" stroke="var(--ui-primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          <circle v-for="(value, i) in values" :key="i" :cx="42 + i * (636 / (values.length - 1))" :cy="191 - value * 1.55" r="3.5" fill="var(--ui-bg)" stroke="var(--ui-primary)" stroke-width="2"><title>第 {{ i + 1 }} 天：{{ value * 100 }} 次（示例）</title></circle>
          <text v-for="(label, i) in (period === '7' ? ['10/30', '10/31', '11/01', '11/02', '11/03', '11/04', '11/05'] : ['10/23', '10/25', '10/27', '10/29', '10/31', '11/02', '11/05'])" :key="label" :x="42 + i * 106" y="222" text-anchor="middle" class="chart-text">{{ label }}</text>
        </svg>
      </UCard>

      <UCard :ui="{ body: 'p-5 sm:p-6' }">
        <div class="flex items-center justify-between"><h3 class="section-title">服务状态</h3><UBadge color="neutral" variant="subtle" size="sm">示例</UBadge></div>
        <p class="section-description mb-5">常用应用一览</p>
        <div class="space-y-5">
          <div v-for="service in services" :key="service.slug" class="flex items-center gap-3">
            <div class="icon-tile" :class="`tone-${service.color}`"><UIcon :name="service.icon" class="size-5" /></div>
            <div class="min-w-0 flex-1"><p class="font-medium">{{ service.name }}</p><p class="text-xs text-muted mt-0.5">{{ service.description }}</p></div>
            <span class="text-xs flex items-center gap-1.5 whitespace-nowrap" :class="service.status === '正常' ? 'text-success' : 'text-warning'"><span class="size-1.5 rounded-full bg-current" />{{ service.status }}</span>
          </div>
        </div>
        <USeparator class="my-5" />
        <div class="flex items-start gap-2 text-xs text-muted leading-5"><UIcon name="i-lucide-info" class="size-4 shrink-0 mt-0.5" /><span>这里展示状态页的效果，接入后可显示各 Worker 的真实检查结果。</span></div>
      </UCard>
    </div>

    <UCard :ui="{ body: 'p-0', header: 'px-5 py-4 sm:px-6' }">
      <template #header><div class="flex justify-between items-center"><div><h3 class="section-title">最近执行</h3><p class="section-description">常用自动化任务的最近一次结果</p></div><UButton to="/tasks" color="neutral" variant="ghost" trailing-icon="i-lucide-arrow-right" size="sm">全部任务</UButton></div></template>
      <div class="divide-y divide-default">
        <div v-for="task in tasks.slice(0, 4)" :key="task.id" class="flex items-center gap-3 px-5 py-4 sm:px-6">
          <span class="size-9 rounded-lg bg-elevated flex items-center justify-center shrink-0"><UIcon :name="statusInfo[task.status].icon" class="size-4" :class="`text-${statusInfo[task.status].color}`" /></span>
          <div class="flex-1 min-w-0"><p class="font-medium truncate">{{ task.name }}</p><p class="text-xs text-muted mt-0.5">{{ task.app }}<span class="mx-2">·</span>{{ task.lastRun }}</p></div>
          <span class="text-xs text-muted tabular hidden sm:block mr-5">{{ task.duration }}</span>
          <UBadge :color="statusInfo[task.status].color" variant="subtle" size="sm">{{ statusInfo[task.status].label }}</UBadge>
        </div>
      </div>
    </UCard>
  </div>
</template>
