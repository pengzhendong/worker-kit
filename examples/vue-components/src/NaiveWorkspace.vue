<script setup lang="ts">
import { computed, h } from 'vue';
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  NSwitch,
  NTabPane,
  NTabs,
  NTag,
} from 'naive-ui';
import { useWorkspace } from './useWorkspace';
const {
  client,
  state,
  management,
  draft,
  definition,
  manageTasks,
  values,
  name,
  days,
  selected,
  confirm,
  revoke,
  labels,
  formatTime,
  runLabel,
} = useWorkspace();
const keyColumns = [
  { title: '名称', key: 'name' },
  { title: '前缀', key: 'prefix' },
  {
    title: '状态',
    key: 'status',
    render: (row: any) =>
      row.revokedAt
        ? '已撤销'
        : Date.parse(row.expiresAt) <= Date.now()
          ? '已过期'
          : '有效',
  },
  {
    title: '操作',
    key: 'actions',
    render: (row: any) =>
      row.revokedAt
        ? null
        : h(
            NButton,
            {
              type: 'error',
              secondary: true,
              onClick: () => {
                selected.value = row.id;
                confirm.value = true;
              },
            },
            { default: () => '撤销' },
          ),
  },
];
const auditColumns = [
  { title: '时间', key: 'at', render: (row: any) => formatTime(row.at) },
  { title: '操作', key: 'action' },
  { title: '对象', key: 'target' },
  { title: '身份', key: 'actor' },
];
const taskOptions = computed(
  () =>
    state.value.data?.definitions.map((task) => ({
      label: task.label,
      value: task.id,
    })) || [],
);
</script>
<template>
  <div data-workspace>
    <div class="workspace-toolbar">
      <div>
        <h1>业务工作台</h1>
        <p>Naive UI 原生组件连接当前后端的真实接口。</p>
      </div>
      <NButton :loading="state.busy" @click="client.refresh()">刷新</NButton>
    </div>
    <NAlert v-if="state.busy && !state.data">正在更新工作台数据…</NAlert
    ><NAlert v-if="state.error" type="error">{{ state.error }}</NAlert
    ><NButton v-if="state.unauthorized" tag="a" :href="client.loginUrl()"
      >登录后端</NButton
    >
    <div v-if="state.data" class="workspace-stack">
      <div class="workspace-status">
        <NTag>{{ state.data.backend }}</NTag
        ><span>{{ state.data.user.name }}</span
        ><NTag :type="state.data.runtime.ok ? 'success' : 'error'">{{
          state.data.runtime.ok ? '依赖正常' : '依赖异常'
        }}</NTag
        ><NButton
          tag="a"
          v-if="['payload', 'sonic'].includes(state.data.backend)"
          href="/admin"
          text
          type="primary"
          >管理内容与媒体 ↗</NButton
        >
      </div>
      <NCard v-if="management" title="管理功能"
        ><NTabs type="line" animated>
          <NTabPane v-if="management.settings" name="settings" tab="KV 设置"
            ><form
              class="workspace-form"
              @submit.prevent="client.saveSettings(values)"
            >
              <label
                v-for="(value, key) in values"
                :key="key"
                class="workspace-field"
                >{{ labels[key] || key
                }}<NSwitch
                  v-if="typeof value === 'boolean'"
                  :value="Boolean(value)"
                  @update:value="values[key] = $event"
                  :disabled="
                    !management.capabilities.settings.manage
                  " /><NInputNumber
                  v-else-if="typeof value === 'number'"
                  :value="Number(value)"
                  @update:value="values[key] = Number($event)"
                  :disabled="!management.capabilities.settings.manage" /><NInput
                  v-else
                  :value="String(value)"
                  @update:value="values[key] = $event"
                  :disabled="!management.capabilities.settings.manage"
                  required /></label
              ><NButton
                attr-type="submit"
                type="primary"
                :disabled="
                  state.busy || !management.capabilities.settings.manage
                "
                >保存设置</NButton
              >
            </form>
            <p class="muted">
              只保存声明的非敏感字段；KV 跨区域同步可能短暂延迟。
            </p></NTabPane
          >
          <NTabPane v-if="management.keys" name="keys" tab="访问密钥"
            ><form
              class="workspace-form"
              @submit.prevent="client.issueKey(name, days)"
            >
              <label class="workspace-field"
                >名称<NInput
                  :input-props="{ 'aria-label': '名称' }"
                  v-model:value="name"
                  :maxlength="80"
                  required /></label
              ><label class="workspace-field"
                >有效期（天）<NInputNumber
                  v-model:value="days"
                  :min="1"
                  :max="365" /></label
              ><NButton attr-type="submit" type="primary" :disabled="state.busy"
                >签发密钥</NButton
              >
            </form>
            <div v-if="state.issuedToken" role="status">
              <p>完整令牌只显示一次，请保存后关闭。</p>
              <code data-issued-token class="workspace-token">{{
                state.issuedToken
              }}</code
              ><NButton @click="client.closeToken()">已保存，关闭</NButton>
            </div>
            <NDataTable
              :columns="keyColumns"
              :data="management.keys.items"
              :scroll-x="650"
            />
            <div class="workspace-actions">
              <NButton :disabled="state.busy" @click="client.pageKeys()"
                >首页</NButton
              ><NButton
                :disabled="state.busy || !management.keys.cursor"
                @click="client.pageKeys(management.keys.cursor)"
                >下一页密钥</NButton
              >
            </div></NTabPane
          >
          <NTabPane v-if="management.audit" name="audit" tab="操作审计"
            ><NDataTable
              :columns="auditColumns"
              :data="management.audit.items"
              :scroll-x="650"
            /><NButton
              :disabled="state.busy || !management.audit.cursor"
              @click="client.pageAudit(management.audit.cursor)"
              >下一页审计</NButton
            ></NTabPane
          >
          <NTabPane name="api" tab="API 中心" display-directive="if"
            ><iframe
              class="workspace-reference"
              title="交互式 API 文档"
              :src="client.apiUrl('/reference')"
          /></NTabPane> </NTabs
      ></NCard>
      <NCard title="运行诊断"
        ><div
          v-for="check in state.data.runtime.checks"
          :key="check.name"
          class="workspace-row"
        >
          <strong>{{ check.name }}</strong
          ><span>{{ check.status }} · {{ check.durationMs }} ms</span>
        </div></NCard
      >
      <NCard v-if="manageTasks" title="创建任务计划"
        ><form
          class="workspace-form"
          @submit.prevent="
            client.create(draft.task, draft.minutes, draft.inputs)
          "
        >
          <label class="workspace-field"
            >执行任务<NSelect
              v-model:value="draft.task"
              :options="taskOptions" /></label
          ><label class="workspace-field"
            >间隔（分钟）<NInputNumber
              v-model:value="draft.minutes"
              :min="1"
              :max="10080" /></label
          ><label
            v-for="field in definition?.fields"
            :key="field.name"
            class="workspace-field"
            >{{ field.label
            }}<NInput
              v-model:value="draft.inputs[field.name]"
              :required="field.required" /></label
          ><NButton attr-type="submit" type="primary" :disabled="state.busy"
            >创建计划</NButton
          >
        </form></NCard
      >
      <NCard title="任务计划"
        ><NEmpty v-if="!state.data.plans.length" description="暂无计划" />
        <div
          v-for="plan in state.data.plans"
          :key="plan.id"
          class="workspace-row"
        >
          <div>
            <strong>{{
              state.data.definitions.find((task) => task.id === plan.task)
                ?.label || plan.task
            }}</strong>
            <p>
              {{ plan.scheduleId ? '已启用' : '已暂停' }} · 下次
              {{ formatTime(plan.nextAt ? plan.nextAt * 1000 : undefined) }}
            </p>
          </div>
          <div v-if="manageTasks" class="workspace-actions">
            <NButton
              :disabled="state.busy"
              @click="client.change('run', plan.id)"
              >运行</NButton
            ><NButton
              :disabled="state.busy"
              @click="
                client.change(plan.scheduleId ? 'pause' : 'resume', plan.id)
              "
              >{{ plan.scheduleId ? '暂停' : '恢复' }}</NButton
            >
          </div>
        </div></NCard
      >
      <NCard title="运行记录与日志"
        ><NEmpty v-if="!state.data.runs.length" description="暂无运行记录" />
        <article
          v-for="run in state.data.runs"
          :key="run.id"
          class="workspace-row"
        >
          <div>
            <strong>{{ runLabel[run.status] }}</strong> ·
            {{ formatTime(run.startedAt) }}
            <p>{{ run.task }} · {{ run.progress?.message }}</p>
            <pre v-if="run.error || run.output?.logs.length">{{
              run.error || run.output?.logs.join('\n')
            }}</pre>
          </div>
        </article></NCard
      >
    </div>
    <NModal
      v-model:show="confirm"
      preset="dialog"
      title="撤销访问密钥？"
      content="撤销后，该密钥将不能发起新的授权请求。"
      positive-text="确认撤销"
      negative-text="取消"
      :loading="state.busy"
      @positive-click="revoke"
    />
  </div>
</template>
