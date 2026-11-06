<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, shallowRef } from 'vue';
import { createOperationsClient, formatTime, runLabel } from '../../ui-demo/operations';
const client = createOperationsClient();
const state = shallowRef(client.snapshot());
const unsubscribe = client.subscribe(() => { state.value = client.snapshot(); });
const draft = reactive({ task: 'check-bindings', minutes: 60, inputs: {} as Record<string, string> });
const definition = computed(() => state.value.data?.definitions.find(d => d.id === draft.task));
const manage = computed(() => state.value.data?.user.permissions.includes('tasks:manage'));
onMounted(() => client.refresh());
onUnmounted(() => { unsubscribe(); client.dispose(); });
</script>
<template>
<div data-workspace>
  <div class="demo-heading"><div><h1>业务工作台</h1><p>查看当前后端的任务、运行记录与依赖状态。</p></div><Button label="刷新" :loading="state.busy" @click="client.refresh()" /></div>
  <Message v-if="state.busy && !state.data" severity="info" class="mb-4">正在更新工作台数据…</Message>
  <Message v-if="state.error" severity="error" class="mb-4">{{ state.error }}</Message> <Button v-if="state.unauthorized" label="登录后端" as="a" :href="client.loginUrl()" />
  <template v-if="state.data">
    <div class="flex gap-3 items-center mb-5"><strong>{{ state.data.backend }}</strong><span>{{ state.data.user.name }}</span><span>{{ state.data.runtime.ok ? '依赖正常' : '依赖异常' }}</span><a href="/admin">管理内容与媒体 ↗</a></div>
    <div class="card mb-5"><h2 class="text-lg mb-4">运行诊断</h2><div v-for="check in state.data.runtime.checks" :key="check.name" class="flex justify-between py-2"><strong>{{ check.name }}</strong><span>{{ check.status }} · {{ check.durationMs }} ms</span></div></div>
    <div class="card mb-5" v-if="manage"><h2 class="text-lg mb-4">创建任务计划</h2><form class="flex flex-wrap gap-4 items-end" @submit.prevent="client.create(draft.task, draft.minutes, draft.inputs)"><label>执行任务<br><Select v-model="draft.task" :options="state.data.definitions" option-label="label" option-value="id" /></label><label>间隔（分钟）<br><InputNumber v-model="draft.minutes" :min="1" :max="10080" input-id="workspace-minutes" /></label><label v-for="field in definition?.fields" :key="field.name">{{ field.label }}<br><InputText v-model="draft.inputs[field.name]" :required="field.required" /></label><Button type="submit" label="创建计划" :disabled="state.busy" /></form></div>
    <div class="card mb-5"><h2 class="text-lg mb-4">任务计划</h2><p v-if="!state.data.plans.length">暂无计划，请创建第一个任务。</p><div v-for="plan in state.data.plans" :key="plan.id" class="flex flex-wrap justify-between items-center gap-4 py-4"><div><strong>{{ state.data.definitions.find(d => d.id === plan.task)?.label || plan.task }}</strong><p>{{ plan.schedule.kind === 'interval' ? `每 ${plan.schedule.minutes} 分钟` : plan.schedule.cron }} · {{ plan.scheduleId ? '已启用' : '已暂停' }} · 下次 {{ formatTime(plan.nextAt ? plan.nextAt * 1000 : undefined) }}</p></div><div v-if="manage" class="flex gap-2"><Button label="运行" :disabled="state.busy" @click="client.change('run', plan.id)" /> <Button :label="plan.scheduleId ? '暂停' : '恢复'" severity="secondary" :disabled="state.busy" @click="client.change(plan.scheduleId ? 'pause' : 'resume', plan.id)" /></div></div></div>
    <div class="card"><h2 class="text-lg mb-4">运行记录与日志</h2><p v-if="!state.data.runs.length">暂无运行记录。</p><article v-for="run in state.data.runs" :key="run.id" class="py-4"><div class="flex justify-between"><span>{{ formatTime(run.startedAt) }}</span><strong>{{ runLabel[run.status] }}</strong></div><p>{{ run.task }} · {{ run.progress?.message }}</p><pre class="whitespace-pre-wrap" v-if="run.error || run.output?.logs.length">{{ run.error || run.output?.logs.join('\n') }}</pre></article></div>
  </template>
</div>
</template>
