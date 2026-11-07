<script setup lang="ts">
import { computed } from 'vue';
import { useWorkspace } from './useWorkspace';
const props = defineProps<{ section: string; title: string }>();
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
const unavailable = computed(() => {
  const section = props.section;
  if (section === 'settings' || section === 'keys' || section === 'audit')
    return !management.value?.[section];
  return section === 'api' && !management.value;
});
const keyRows = computed(() => management.value?.keys?.items || []);
</script>
<template>
  <div data-workspace>
    <div class="workspace-toolbar">
      <div>
        <h1>{{ title }}</h1>
      </div>
      <ElButton :loading="state.busy" @click="client.refresh()">刷新</ElButton>
    </div>
    <ElAlert
      v-if="state.busy && !state.data"
      title="正在更新工作台数据…"
      :closable="false"
    />
    <ElAlert
      v-if="state.error"
      :title="state.error"
      type="error"
      :closable="false"
    />
    <ElLink
      v-if="state.unauthorized"
      class="workspace-login"
      :href="client.loginUrl()"
      type="primary"
      >登录后端</ElLink
    >
    <div v-if="state.data" class="workspace-stack">
      <div class="workspace-status">
        <ElTag>{{ state.data.backend }}</ElTag
        ><span>{{ state.data.user.name }}</span
        ><ElTag :type="state.data.runtime.ok ? 'success' : 'danger'">{{
          state.data.runtime.ok ? '依赖正常' : '依赖异常'
        }}</ElTag
        ><ElLink
          v-if="['payload', 'sonic'].includes(state.data.backend)"
          href="/admin"
          type="primary"
          >管理内容与媒体 ↗</ElLink
        >
      </div>
      <ElAlert
        v-if="unavailable"
        title="当前账户或后端未开放此功能"
        type="info"
        :closable="false"
      />
      <ElCard v-if="section === 'settings' && management?.settings">
        <form
          class="workspace-form"
          @submit.prevent="client.saveSettings(values)"
        >
          <label
            v-for="(value, key) in values"
            :key="key"
            class="workspace-field"
            >{{ labels[key] || key
            }}<ElSwitch
              v-if="typeof value === 'boolean'"
              :model-value="Boolean(value)"
              @update:model-value="values[key] = $event"
              :disabled="
                !management.capabilities.settings.manage
              " /><ElInputNumber
              v-else-if="typeof value === 'number'"
              :model-value="Number(value)"
              @update:model-value="values[key] = Number($event)"
              :disabled="!management.capabilities.settings.manage" /><ElInput
              v-else
              :model-value="String(value)"
              @update:model-value="values[key] = String($event)"
              :disabled="!management.capabilities.settings.manage"
              required /></label
          ><ElButton
            native-type="submit"
            type="primary"
            :disabled="state.busy || !management.capabilities.settings.manage"
            >保存设置</ElButton
          >
        </form>
        <p class="muted">只保存声明的非敏感字段；KV 跨区域同步可能短暂延迟。</p>
      </ElCard>
      <ElCard v-if="section === 'keys' && management?.keys">
        <form
          class="workspace-form"
          @submit.prevent="client.issueKey(name, days)"
        >
          <label class="workspace-field"
            >名称<ElInput v-model="name" maxlength="80" required /></label
          ><label class="workspace-field"
            >有效期（天）<ElInputNumber
              v-model="days"
              :min="1"
              :max="365" /></label
          ><ElButton native-type="submit" type="primary" :disabled="state.busy"
            >签发密钥</ElButton
          >
        </form>
        <div v-if="state.issuedToken" role="status">
          <p>完整令牌只显示一次，请保存后关闭。</p>
          <code data-issued-token class="workspace-token">{{
            state.issuedToken
          }}</code
          ><ElButton @click="client.closeToken()">已保存，关闭</ElButton>
        </div>
        <ElTable class="workspace-list" :data="keyRows"
          ><ElTableColumn prop="name" label="名称" /><ElTableColumn
            prop="prefix"
            label="前缀"
          /><ElTableColumn label="状态"
            ><template #default="{ row }">{{
              row.revokedAt
                ? '已撤销'
                : Date.parse(row.expiresAt) <= Date.now()
                  ? '已过期'
                  : '有效'
            }}</template></ElTableColumn
          ><ElTableColumn label="操作"
            ><template #default="{ row }"
              ><ElButton
                v-if="!row.revokedAt"
                type="danger"
                plain
                @click="
                  selected = row.id;
                  confirm = true;
                "
                >撤销</ElButton
              ></template
            ></ElTableColumn
          ></ElTable
        >
        <div class="workspace-actions">
          <ElButton :disabled="state.busy" @click="client.pageKeys()"
            >首页</ElButton
          ><ElButton
            :disabled="state.busy || !management.keys.cursor"
            @click="client.pageKeys(management.keys.cursor)"
            >下一页密钥</ElButton
          >
        </div>
      </ElCard>
      <ElCard v-if="section === 'audit' && management?.audit">
        <ElTable class="workspace-list" :data="management.audit.items"
          ><ElTableColumn label="时间"
            ><template #default="{ row }">{{
              formatTime(row.at)
            }}</template></ElTableColumn
          ><ElTableColumn prop="action" label="操作" /><ElTableColumn
            prop="target"
            label="对象" /><ElTableColumn prop="actor" label="身份" /></ElTable
        ><ElButton
          :disabled="state.busy || !management.audit.cursor"
          @click="client.pageAudit(management.audit.cursor)"
          >下一页审计</ElButton
        >
      </ElCard>
      <ElCard v-if="section === 'api' && management">
        <iframe
          class="workspace-reference"
          title="交互式 API 文档"
          :src="client.apiUrl('/reference')"
        />
      </ElCard>
      <ElCard v-if="section === 'workspace'">
        <template #header>工作台概览</template>
        <ElDescriptions :column="1">
          <ElDescriptionsItem label="运行检查">{{
            state.data.runtime.checks.length
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="任务调度">{{
            state.data.plans.length
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="近期运行">{{
            state.data.runs.length
          }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>
      <ElCard v-if="section === 'overview'"
        ><template #header>运行诊断</template>
        <div
          v-for="check in state.data.runtime.checks"
          :key="check.name"
          class="workspace-row"
        >
          <strong>{{ check.name }}</strong
          ><span>{{ check.status }} · {{ check.durationMs }} ms</span>
        </div></ElCard
      >
      <ElCard v-if="manageTasks && section === 'tasks'"
        ><template #header>创建任务计划</template>
        <form
          class="workspace-form"
          @submit.prevent="
            client.create(draft.task, draft.minutes, draft.inputs)
          "
        >
          <label class="workspace-field"
            >执行任务<ElSelect v-model="draft.task"
              ><ElOption
                v-for="task in state.data.definitions"
                :key="task.id"
                :value="task.id"
                :label="task.label" /></ElSelect></label
          ><label class="workspace-field"
            >间隔（分钟）<ElInputNumber
              v-model="draft.minutes"
              :min="1"
              :max="10080" /></label
          ><label
            v-for="field in definition?.fields"
            :key="field.name"
            class="workspace-field"
            >{{ field.label
            }}<ElInput
              v-model="draft.inputs[field.name]"
              :required="field.required" /></label
          ><ElButton native-type="submit" type="primary" :disabled="state.busy"
            >创建计划</ElButton
          >
        </form></ElCard
      >
      <ElCard v-if="section === 'tasks'"
        ><template #header>任务计划</template
        ><ElEmpty v-if="!state.data.plans.length" description="暂无计划" />
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
            <ElButton
              :disabled="state.busy"
              @click="client.change('run', plan.id)"
              >运行</ElButton
            ><ElButton
              :disabled="state.busy"
              @click="
                client.change(plan.scheduleId ? 'pause' : 'resume', plan.id)
              "
              >{{ plan.scheduleId ? '暂停' : '恢复' }}</ElButton
            >
          </div>
        </div></ElCard
      >
      <ElCard v-if="section === 'runs'"
        ><template #header>运行记录与日志</template
        ><ElEmpty v-if="!state.data.runs.length" description="暂无运行记录" />
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
        </article></ElCard
      >
    </div>
    <ElDialog
      v-model="confirm"
      title="撤销访问密钥？"
      width="min(480px, calc(100vw - 32px))"
      align-center
      ><p>撤销后，该密钥将不能发起新的授权请求。</p>
      <template #footer
        ><ElButton @click="confirm = false">取消</ElButton
        ><ElButton type="danger" :loading="state.busy" @click="revoke"
          >确认撤销</ElButton
        ></template
      ></ElDialog
    >
  </div>
</template>
