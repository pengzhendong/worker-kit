<script setup lang="ts">
import type { createSessionScope } from '@pengzhendong/worker-kit/client';
import { computed, onMounted, onUnmounted, reactive, shallowRef } from 'vue';
import ManagementPanel from './ManagementNuxt.vue';
import { createOperationsClient, formatTime, runLabel } from './operations';
const props = withDefaults(
  defineProps<{
    apiRoot?: string;
    showManagement?: boolean;
    showCms?: boolean;
    loginUrl?: string;
    showHeading?: boolean;
    scope?: ReturnType<typeof createSessionScope>;
  }>(),
  { showManagement: true, showCms: true, showHeading: true },
);
const client = createOperationsClient({
  baseUrl: props.apiRoot,
  loginUrl: props.loginUrl,
  scope: props.scope,
});
const state = shallowRef(client.snapshot());
const unsubscribe = client.subscribe(() => {
  state.value = client.snapshot();
});
const draft = reactive({
  task: 'check-bindings',
  minutes: 60,
  inputs: {} as Record<string, string>,
});
const definition = computed(() =>
  state.value.data?.definitions.find((d) => d.id === draft.task),
);
const manage = computed(() =>
  state.value.data?.user.permissions.includes('tasks:manage'),
);
onMounted(() => client.refresh());
onUnmounted(() => {
  unsubscribe();
  client.dispose();
});
</script>
<template>
  <div data-workspace>
    <div class="workspace-heading">
      <div>
        <h2 v-if="showHeading !== false">业务工作台</h2>
        <p v-if="showHeading !== false">
          查看当前后端的任务、运行记录与依赖状态。
        </p>
      </div>
      <UButton :loading="state.busy" @click="client.refresh()">刷新</UButton>
    </div>
    <UAlert
      v-if="state.busy && !state.data"
      title="正在更新工作台数据…"
      color="neutral"
      variant="soft"
      data-workspace-loading
      class="mb-5"
    />
    <UAlert
      v-if="state.error"
      color="error"
      :title="state.error"
      class="mb-5"
    />
    <UButton v-if="state.unauthorized" :to="client.loginUrl()" external
      >登录后端</UButton
    >
    <template v-if="state.data"
      ><ManagementPanel
        v-if="showManagement !== false"
        :client="client"
        :state="state"
      />
      <div class="flex items-center gap-3 mb-5 flex-wrap">
        <UBadge>{{ state.data.backend }}</UBadge
        ><span>{{ state.data.user.name }}</span
        ><UBadge :color="state.data.runtime.ok ? 'success' : 'error'">{{
          state.data.runtime.ok ? '依赖正常' : '依赖异常'
        }}</UBadge
        ><UButton
          v-if="
            showCms !== false &&
            ['payload', 'sonic'].includes(state.data.backend)
          "
          to="/admin"
          external
          variant="link"
          color="neutral"
          >管理内容与媒体 ↗</UButton
        >
      </div>
      <UCard class="mb-5"
        ><template #header><h3>运行诊断</h3></template>
        <div
          v-for="check in state.data.runtime.checks"
          :key="check.name"
          class="flex justify-between gap-4 py-2"
        >
          <strong>{{ check.name }}</strong
          ><span>{{ check.status }} · {{ check.durationMs }} ms</span>
        </div></UCard
      >
      <UCard v-if="manage" class="mb-5"
        ><template #header><h3>创建任务计划</h3></template>
        <form
          class="flex gap-4 flex-wrap items-end"
          @submit.prevent="
            client.create(draft.task, draft.minutes, draft.inputs)
          "
        >
          <UFormField label="执行任务"
            ><USelect
              v-model="draft.task"
              :items="
                state.data.definitions.map((d) => ({
                  label: d.label,
                  value: d.id,
                }))
              "
              class="w-48" /></UFormField
          ><UFormField label="间隔（分钟）"
            ><UInput
              v-model="draft.minutes"
              type="number"
              :min="1"
              :max="10080"
              required /></UFormField
          ><UFormField
            v-for="field in definition?.fields"
            :key="field.name"
            :label="field.label"
            ><UInput
              v-model="draft.inputs[field.name]"
              :required="field.required" /></UFormField
          ><UButton type="submit" :disabled="state.busy">创建计划</UButton>
        </form></UCard
      >
      <UCard class="mb-5" :ui="{ body: 'overflow-x-auto' }"
        ><template #header><h3>任务计划</h3></template>
        <p v-if="!state.data.plans.length">暂无计划，请创建第一个任务。</p>
        <div
          v-for="plan in state.data.plans"
          :key="plan.id"
          class="flex flex-wrap items-center justify-between gap-3 border-b border-default py-4"
        >
          <div>
            <strong>{{
              state.data.definitions.find((d) => d.id === plan.task)?.label ||
              plan.task
            }}</strong>
            <p class="text-xs text-muted mt-1">
              {{
                plan.schedule.kind === 'interval'
                  ? `每 ${plan.schedule.minutes} 分钟`
                  : plan.schedule.cron
              }}
              · {{ plan.scheduleId ? '已启用' : '已暂停' }} · 下次
              {{ formatTime(plan.nextAt ? plan.nextAt * 1000 : undefined) }}
            </p>
          </div>
          <div v-if="manage" class="flex gap-2">
            <UButton
              size="sm"
              :disabled="state.busy"
              @click="client.change('run', plan.id)"
              >运行</UButton
            ><UButton
              size="sm"
              color="neutral"
              variant="outline"
              :disabled="state.busy"
              @click="
                client.change(plan.scheduleId ? 'pause' : 'resume', plan.id)
              "
              >{{ plan.scheduleId ? '暂停' : '恢复' }}</UButton
            >
          </div>
        </div></UCard
      >
      <UCard
        ><template #header><h3>运行记录与日志</h3></template>
        <p v-if="!state.data.runs.length">暂无运行记录。</p>
        <article
          v-for="run in state.data.runs"
          :key="run.id"
          class="border-b border-default py-4"
        >
          <div class="flex justify-between gap-3">
            <span>{{ formatTime(run.startedAt) }}</span
            ><UBadge
              :color="run.status === 'succeeded' ? 'success' : 'neutral'"
              >{{ runLabel[run.status] }}</UBadge
            >
          </div>
          <p class="text-xs text-muted mt-2">
            {{ run.task }} · {{ run.progress?.message }}
          </p>
          <pre
            v-if="run.error || run.output?.logs.length"
            class="text-xs whitespace-pre-wrap mt-2"
            >{{ run.error || run.output?.logs.join('\n') }}</pre
          >
        </article></UCard
      >
    </template>
  </div>
</template>
<style scoped>
.workspace-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
}
.workspace-heading h2 {
  font-size: 28px;
  line-height: 1.3;
  font-weight: 650;
  letter-spacing: -0.6px;
}
.workspace-heading p {
  margin-top: 8px;
  color: var(--ui-text-muted);
}
@media (max-width: 767px) {
  .workspace-heading {
    margin-bottom: 16px;
  }
  .workspace-heading h2 {
    font-size: 24px;
  }
}
</style>
