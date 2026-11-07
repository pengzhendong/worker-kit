<script setup lang="ts">
import { useWorkspace } from './useWorkspace';
withDefaults(defineProps<{ section?: string; title?: string }>(), {
  section: 'workspace',
  title: '业务工作台',
});
const {
  client,
  state,
  management,
  values,
  labels,
  name,
  days,
  selected,
  confirm,
  revoke,
  draft,
  definition,
  manageTasks,
  formatTime,
  runLabel,
} = useWorkspace();
</script>
<template>
  <div data-workspace>
    <div class="workspace-toolbar">
      <div>
        <h1>{{ title }}</h1>
        <p>Quasar 原生组件 · 当前后端真实数据</p>
      </div>
      <QBtn :loading="state.busy" @click="client.refresh()">刷新</QBtn>
    </div>
    <QBanner v-if="state.error" type="error">{{ state.error }}</QBanner
    ><QBtn
      v-if="state.unauthorized"
      class="workspace-login"
      :href="client.loginUrl()"
      >登录后端</QBtn
    >
    <div v-if="state.data" class="workspace-stack">
      <div class="workspace-status">
        <QBadge>{{ state.data.backend }}</QBadge
        ><span>{{ state.data.user.name }}</span
        ><QBadge :color="state.data.runtime.ok ? 'positive' : 'negative'">{{
          state.data.runtime.ok ? '依赖正常' : '依赖异常'
        }}</QBadge>
      </div>
      <QCard
        v-if="management && (section === 'workspace' || section === 'settings')"
        ><QCardSection class="text-h6">KV 设置</QCardSection
        ><QCardSection
          ><form
            class="workspace-form"
            @submit.prevent="client.saveSettings(values)"
          >
            <template v-for="(value, key) in values" :key="key"
              ><QToggle
                v-if="typeof value === 'boolean'"
                v-model="values[key]"
                :label="labels[key] || key" /><QInput
                v-else
                :model-value="String(value)"
                @update:model-value="
                  values[key] =
                    typeof value === 'number' ? Number($event) : ($event ?? '')
                "
                :label="labels[key] || key"
                :type="typeof value === 'number' ? 'number' : 'text'"
                outlined
                dense
                required /></template
            ><QBtn
              type="submit"
              color="primary"
              :disabled="!management.capabilities.settings.manage || state.busy"
              >保存设置</QBtn
            >
          </form></QCardSection
        ></QCard
      >
      <QCard v-if="section === 'workspace' && management?.keys"
        ><QCardSection class="text-h6">访问密钥</QCardSection
        ><QCardSection
          ><form
            class="workspace-form"
            @submit.prevent="client.issueKey(name, days)"
          >
            <QInput
              v-model="name"
              label="名称"
              required
              outlined
              dense
            /><QInput
              v-model="days"
              type="number"
              label="有效期（天）"
              min="1"
              max="365"
              outlined
              dense
            /><QBtn type="submit" :disabled="state.busy">签发密钥</QBtn>
          </form>
          <div v-if="state.issuedToken">
            <code data-issued-token class="workspace-token">{{
              state.issuedToken
            }}</code
            ><QBtn @click="client.closeToken()">已保存，关闭</QBtn>
          </div>
          <QMarkupTable class="workspace-list" flat
            ><thead>
              <tr>
                <th>名称</th>
                <th>前缀</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="key in management.keys.items" :key="key.id">
                <td>{{ key.name }}</td>
                <td>{{ key.prefix }}</td>
                <td>{{ key.revokedAt ? '已撤销' : '有效' }}</td>
                <td>
                  <QBtn
                    v-if="!key.revokedAt"
                    color="negative"
                    flat
                    @click="
                      selected = key.id;
                      confirm = true;
                    "
                    >撤销</QBtn
                  >
                </td>
              </tr>
            </tbody></QMarkupTable
          ><QBtn
            :disabled="!management.keys.cursor"
            @click="client.pageKeys(management.keys.cursor)"
            >下一页密钥</QBtn
          ></QCardSection
        ></QCard
      >
      <QCard v-if="section === 'workspace' && management?.audit"
        ><QCardSection class="text-h6">操作审计</QCardSection
        ><QCardSection
          ><QMarkupTable class="workspace-list" flat
            ><tbody>
              <tr v-for="item in management.audit.items" :key="item.id">
                <td>{{ formatTime(item.at) }}</td>
                <td>{{ item.action }}</td>
                <td>{{ item.actor }}</td>
              </tr>
            </tbody></QMarkupTable
          ><QBtn
            :disabled="!management.audit.cursor"
            @click="client.pageAudit(management.audit.cursor)"
            >下一页审计</QBtn
          ></QCardSection
        ></QCard
      >
      <QCard v-if="section === 'workspace' || section === 'overview'"
        ><QCardSection class="text-h6">运行诊断</QCardSection
        ><QCardSection
          ><div
            v-for="check in state.data.runtime.checks"
            :key="check.name"
            class="workspace-row"
          >
            {{ check.name }} · {{ check.status }}
          </div></QCardSection
        ></QCard
      ><QCard
        v-if="manageTasks && (section === 'workspace' || section === 'tasks')"
        ><QCardSection class="text-h6">创建任务计划</QCardSection
        ><QCardSection
          ><form
            class="workspace-form"
            @submit.prevent="
              client.create(draft.task, draft.minutes, draft.inputs)
            "
          >
            <QSelect
              v-model="draft.task"
              :options="state.data.definitions"
              option-label="label"
              option-value="id"
              emit-value
              map-options
              label="执行任务"
              outlined
              dense
            /><QInput
              v-model="draft.minutes"
              label="间隔（分钟）"
              type="number"
              outlined
              dense
            /><QInput
              v-for="field in definition?.fields"
              :key="field.name"
              v-model="draft.inputs[field.name]"
              :label="field.label"
              :required="field.required"
            /><QBtn type="submit">创建计划</QBtn>
          </form></QCardSection
        ></QCard
      ><QCard v-if="section === 'workspace' || section === 'tasks'"
        ><QCardSection class="text-h6">任务计划</QCardSection
        ><QCardSection
          ><div
            v-for="plan in state.data.plans"
            :key="plan.id"
            class="workspace-row"
          >
            <span
              >{{ plan.task }} ·
              {{ plan.scheduleId ? '已启用' : '已暂停' }}</span
            >
            <div v-if="manageTasks" class="workspace-actions">
              <QBtn @click="client.change('run', plan.id)">运行</QBtn
              ><QBtn
                @click="
                  client.change(plan.scheduleId ? 'pause' : 'resume', plan.id)
                "
                >{{ plan.scheduleId ? '暂停' : '恢复' }}</QBtn
              >
            </div>
          </div>
          <p v-if="!state.data.plans.length">暂无计划</p></QCardSection
        ></QCard
      ><QCard v-if="section === 'workspace' || section === 'runs'"
        ><QCardSection class="text-h6">运行记录与日志</QCardSection
        ><QCardSection
          ><div v-for="run in state.data.runs" :key="run.id">
            {{ run.task }} · {{ runLabel[run.status] }}
            <pre v-if="run.error || run.output?.logs.length">{{
              run.error || run.output?.logs.join('\n')
            }}</pre>
          </div>
          <p v-if="!state.data.runs.length">暂无运行记录</p></QCardSection
        ></QCard
      ><QCard v-if="section === 'workspace'"
        ><QCardSection class="text-h6">API 中心</QCardSection
        ><QCardSection
          ><iframe
            class="workspace-reference"
            title="交互式 API 文档"
            :src="client.apiUrl('/reference')"
            loading="lazy" /></QCardSection
      ></QCard>
    </div>
    <QDialog v-model="confirm"
      ><QCard
        ><QCardSection class="text-h6">撤销访问密钥？</QCardSection
        ><QCardSection>撤销后将不能发起新的授权请求。</QCardSection
        ><QCardActions
          ><QBtn @click="confirm = false">取消</QBtn
          ><QBtn color="negative" @click="revoke">确认撤销</QBtn></QCardActions
        ></QCard
      ></QDialog
    >
  </div>
</template>
