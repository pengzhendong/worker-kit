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
        <p>Vuetify 原生组件 · 当前后端真实数据</p>
      </div>
      <VBtn :loading="state.busy" @click="client.refresh()">刷新</VBtn>
    </div>
    <VAlert v-if="state.error" type="error">{{ state.error }}</VAlert
    ><VBtn
      v-if="state.unauthorized"
      class="workspace-login"
      :href="client.loginUrl()"
      >登录后端</VBtn
    >
    <div v-if="state.data" class="workspace-stack">
      <div class="workspace-status">
        <VChip>{{ state.data.backend }}</VChip
        ><span>{{ state.data.user.name }}</span
        ><VChip :color="state.data.runtime.ok ? 'success' : 'error'">{{
          state.data.runtime.ok ? '依赖正常' : '依赖异常'
        }}</VChip>
      </div>
      <VCard
        v-if="management && (section === 'workspace' || section === 'settings')"
        title="KV 设置"
        ><VCardText
          ><form
            class="workspace-form"
            @submit.prevent="client.saveSettings(values)"
          >
            <template v-for="(value, key) in values" :key="key"
              ><VSwitch
                v-if="typeof value === 'boolean'"
                v-model="values[key]"
                :label="labels[key] || key" /><VTextField
                v-else
                :model-value="String(value)"
                @update:model-value="
                  values[key] =
                    typeof value === 'number' ? Number($event) : $event
                "
                :label="labels[key] || key"
                :type="typeof value === 'number' ? 'number' : 'text'"
                hide-details
                required /></template
            ><VBtn
              type="submit"
              color="primary"
              :disabled="!management.capabilities.settings.manage || state.busy"
              >保存设置</VBtn
            >
          </form></VCardText
        ></VCard
      >
      <VCard v-if="section === 'workspace' && management?.keys" title="访问密钥"
        ><VCardText
          ><form
            class="workspace-form"
            @submit.prevent="client.issueKey(name, days)"
          >
            <VTextField
              v-model="name"
              label="名称"
              required
              hide-details
            /><VTextField
              v-model="days"
              type="number"
              label="有效期（天）"
              min="1"
              max="365"
              hide-details
            /><VBtn type="submit" :disabled="state.busy">签发密钥</VBtn>
          </form>
          <div v-if="state.issuedToken">
            <code data-issued-token class="workspace-token">{{
              state.issuedToken
            }}</code
            ><VBtn @click="client.closeToken()">已保存，关闭</VBtn>
          </div>
          <VTable class="workspace-list"
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
                  <VBtn
                    v-if="!key.revokedAt"
                    color="error"
                    variant="text"
                    @click="
                      selected = key.id;
                      confirm = true;
                    "
                    >撤销</VBtn
                  >
                </td>
              </tr>
            </tbody></VTable
          ><VBtn
            :disabled="!management.keys.cursor"
            @click="client.pageKeys(management.keys.cursor)"
            >下一页密钥</VBtn
          ></VCardText
        ></VCard
      >
      <VCard
        v-if="section === 'workspace' && management?.audit"
        title="操作审计"
        ><VCardText
          ><VTable class="workspace-list"
            ><tbody>
              <tr v-for="item in management.audit.items" :key="item.id">
                <td>{{ formatTime(item.at) }}</td>
                <td>{{ item.action }}</td>
                <td>{{ item.actor }}</td>
              </tr>
            </tbody></VTable
          ><VBtn
            :disabled="!management.audit.cursor"
            @click="client.pageAudit(management.audit.cursor)"
            >下一页审计</VBtn
          ></VCardText
        ></VCard
      >
      <VCard
        v-if="section === 'workspace' || section === 'overview'"
        title="运行诊断"
        ><VCardText
          ><div
            v-for="check in state.data.runtime.checks"
            :key="check.name"
            class="workspace-row"
          >
            {{ check.name }} · {{ check.status }}
          </div></VCardText
        ></VCard
      ><VCard
        v-if="manageTasks && (section === 'workspace' || section === 'tasks')"
        title="创建任务计划"
        ><VCardText
          ><form
            class="workspace-form"
            @submit.prevent="
              client.create(draft.task, draft.minutes, draft.inputs)
            "
          >
            <VSelect
              v-model="draft.task"
              :items="state.data.definitions"
              item-title="label"
              item-value="id"
              label="执行任务"
              hide-details
            /><VTextField
              v-model="draft.minutes"
              label="间隔（分钟）"
              type="number"
              hide-details
            /><VTextField
              v-for="field in definition?.fields"
              :key="field.name"
              v-model="draft.inputs[field.name]"
              :label="field.label"
              :required="field.required"
            /><VBtn type="submit">创建计划</VBtn>
          </form></VCardText
        ></VCard
      ><VCard
        v-if="section === 'workspace' || section === 'tasks'"
        title="任务计划"
        ><VCardText
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
              <VBtn @click="client.change('run', plan.id)">运行</VBtn
              ><VBtn
                @click="
                  client.change(plan.scheduleId ? 'pause' : 'resume', plan.id)
                "
                >{{ plan.scheduleId ? '暂停' : '恢复' }}</VBtn
              >
            </div>
          </div>
          <p v-if="!state.data.plans.length">暂无计划</p></VCardText
        ></VCard
      ><VCard
        v-if="section === 'workspace' || section === 'runs'"
        title="运行记录与日志"
        ><VCardText
          ><div v-for="run in state.data.runs" :key="run.id">
            {{ run.task }} · {{ runLabel[run.status] }}
            <pre v-if="run.error || run.output?.logs.length">{{
              run.error || run.output?.logs.join('\n')
            }}</pre>
          </div>
          <p v-if="!state.data.runs.length">暂无运行记录</p></VCardText
        ></VCard
      ><VCard v-if="section === 'workspace'" title="API 中心"
        ><VCardText
          ><iframe
            class="workspace-reference"
            title="交互式 API 文档"
            :src="client.apiUrl('/reference')"
            loading="lazy" /></VCardText
      ></VCard>
    </div>
    <VDialog v-model="confirm" max-width="480"
      ><VCard title="撤销访问密钥？"
        ><VCardText>撤销后将不能发起新的授权请求。</VCardText
        ><VCardActions
          ><VBtn @click="confirm = false">取消</VBtn
          ><VBtn color="error" @click="revoke">确认撤销</VBtn></VCardActions
        ></VCard
      ></VDialog
    >
  </div>
</template>
