<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, shallowRef } from 'vue';
import ManagementPanel from './ManagementVben.vue';
import { createOperationsClient, formatTime, runLabel } from './operations';
const client = createOperationsClient();
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
  <div data-workspace class="demo-page min-w-0">
    <div class="demo-heading">
      <div>
        <h1>业务工作台</h1>
        <p>查看当前后端的任务、运行记录与依赖状态。</p>
      </div>
      <AButton :loading="state.busy" @click="client.refresh()">刷新</AButton>
    </div>
    <AAlert
      v-if="state.busy && !state.data"
      type="info"
      message="正在更新工作台数据…"
      class="mb-4"
    />
    <AAlert
      v-if="state.error"
      type="error"
      :message="state.error"
      class="mb-4"
    />
    <AButton v-if="state.unauthorized" :href="client.loginUrl()"
      >登录后端</AButton
    >
    <template v-if="state.data"
      ><ManagementPanel :client="client" :state="state" />
      <div class="flex flex-wrap gap-3 items-center mb-5">
        <strong>{{ state.data.backend }}</strong
        ><span>{{ state.data.user.name }}</span
        ><span>{{ state.data.runtime.ok ? '依赖正常' : '依赖异常' }}</span
        ><a v-if="['payload', 'sonic'].includes(state.data.backend)" href="/admin">管理内容与媒体 ↗</a>
      </div>
      <ACard class="mb-5"
        ><h2 class="text-lg mb-4">运行诊断</h2>
        <div
          v-for="check in state.data.runtime.checks"
          :key="check.name"
          class="flex justify-between py-2"
        >
          <strong>{{ check.name }}</strong
          ><span>{{ check.status }} · {{ check.durationMs }} ms</span>
        </div></ACard
      >
      <ACard v-if="manage" class="mb-5"
        ><h2 class="text-lg mb-4">创建任务计划</h2>
        <form
          class="flex flex-wrap gap-4 items-end"
          @submit.prevent="
            client.create(draft.task, draft.minutes, draft.inputs)
          "
        >
          <label
            >执行任务<br /><ASelect
              v-model:value="draft.task"
              :options="
                state.data.definitions.map((d) => ({
                  label: d.label,
                  value: d.id,
                }))
              "
              style="min-width: 180px" /></label
          ><label
            >间隔（分钟）<br /><AInputNumber
              v-model:value="draft.minutes"
              :min="1"
              :max="10080" /></label
          ><label v-for="field in definition?.fields" :key="field.name"
            >{{ field.label }}<br /><AInput
              v-model:value="draft.inputs[field.name]"
              :required="field.required" /></label
          ><AButton type="primary" html-type="submit" :disabled="state.busy"
            >创建计划</AButton
          >
        </form></ACard
      >
      <ACard class="mb-5"
        ><h2 class="text-lg mb-4">任务计划</h2>
        <p v-if="!state.data.plans.length">暂无计划，请创建第一个任务。</p>
        <div
          v-for="plan in state.data.plans"
          :key="plan.id"
          class="flex flex-wrap justify-between items-center gap-4 py-4"
        >
          <div>
            <strong>{{
              state.data.definitions.find((d) => d.id === plan.task)?.label ||
              plan.task
            }}</strong>
            <p>
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
            <AButton
              :disabled="state.busy"
              @click="client.change('run', plan.id)"
              >运行</AButton
            >
            <AButton
              :disabled="state.busy"
              @click="
                client.change(plan.scheduleId ? 'pause' : 'resume', plan.id)
              "
              >{{ plan.scheduleId ? '暂停' : '恢复' }}</AButton
            >
          </div>
        </div></ACard
      >
      <ACard
        ><h2 class="text-lg mb-4">运行记录与日志</h2>
        <p v-if="!state.data.runs.length">暂无运行记录。</p>
        <article v-for="run in state.data.runs" :key="run.id" class="py-4">
          <div class="flex justify-between">
            <span>{{ formatTime(run.startedAt) }}</span
            ><strong>{{ runLabel[run.status] }}</strong>
          </div>
          <p>{{ run.task }} · {{ run.progress?.message }}</p>
          <pre
            class="whitespace-pre-wrap"
            v-if="run.error || run.output?.logs.length"
            >{{ run.error || run.output?.logs.join('\n') }}</pre
          >
        </article></ACard
      >
    </template>
  </div>
</template>
