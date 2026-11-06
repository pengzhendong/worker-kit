<script setup>
import { onMounted, onUnmounted, shallowRef } from 'vue';
import ManagementPanel from '../ui-demo/ManagementDocs.vue';
import {
  createOperationsClient,
  formatTime,
  runLabel,
} from '../ui-demo/operations';
const client = createOperationsClient();
const state = shallowRef(client.snapshot());
const stop = client.subscribe(() => {
  state.value = client.snapshot();
});
onMounted(() => client.refresh());
onUnmounted(() => {
  stop();
  client.dispose();
});
</script>
<template>
  <section data-workspace class="operations">
    <button @click="client.refresh()" :disabled="state.busy">刷新</button>
    <p v-if="state.busy && !state.data" role="status">正在更新工作台数据…</p>
    <p v-if="state.error" role="alert">{{ state.error }}</p>
    <a v-if="state.unauthorized" :href="client.loginUrl()" target="_self"
      >登录后端</a
    >
    <template v-if="state.data"
      ><ManagementPanel :client="client" :state="state" />
      <p>
        {{ state.data.backend }} · {{ state.data.user.name }} ·
        {{ state.data.runtime.ok ? '依赖正常' : '依赖异常' }} ·
        <a href="/admin" target="_self">管理内容与媒体 ↗</a>
      </p>
      <h2>运行诊断</h2>
      <p v-for="check in state.data.runtime.checks" :key="check.name">
        {{ check.name }}：{{ check.status }} · {{ check.durationMs }} ms
      </p>
      <h2>任务计划</h2>
      <button
        v-if="state.data.user.permissions.includes('tasks:manage')"
        :disabled="state.busy"
        @click="client.create('check-bindings', 60)"
      >
        创建计划
      </button>
      <p v-if="!state.data.plans.length">暂无计划，请创建第一个任务。</p>
      <article v-for="plan in state.data.plans" :key="plan.id">
        <p>
          {{ plan.task }} · {{ plan.scheduleId ? '已启用' : '已暂停' }} · 下次
          {{ formatTime(plan.nextAt ? plan.nextAt * 1000 : undefined) }}
        </p>
        <div v-if="state.data.user.permissions.includes('tasks:manage')">
          <button :disabled="state.busy" @click="client.change('run', plan.id)">
            运行</button
          ><button
            :disabled="state.busy"
            @click="
              client.change(plan.scheduleId ? 'pause' : 'resume', plan.id)
            "
          >
            {{ plan.scheduleId ? '暂停' : '恢复' }}
          </button>
        </div>
      </article>
      <h2>运行记录与日志</h2>
      <p v-if="!state.data.runs.length">暂无运行记录。</p>
      <article v-for="run in state.data.runs" :key="run.id">
        <p>{{ formatTime(run.startedAt) }} · {{ runLabel[run.status] }}</p>
        <pre>{{
          run.error || run.output?.logs.join('\n') || run.progress?.message
        }}</pre>
      </article>
    </template>
  </section>
</template>
<style scoped>
.operations button {
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 6px 14px;
  margin: 4px 8px 4px 0;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}
.operations button:disabled {
  opacity: 0.5;
}
.operations article {
  padding: 12px 0;
  border-bottom: 1px solid var(--vp-c-divider);
}
.operations pre {
  white-space: pre-wrap;
  padding: 12px;
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
}
</style>
