<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { createOperationsClient } from './operations';
type Client = ReturnType<typeof createOperationsClient>;
const props = defineProps<{
  client: Client;
  state: ReturnType<Client['snapshot']>;
}>();
const data = computed(() => props.state.data?.management);
const section = ref(''),
  name = ref(''),
  days = ref(30),
  selected = ref(''),
  confirm = ref(false);
const values = reactive<Record<string, string | number | boolean>>({});
const labels: Record<string, string> = {
  siteTitle: '站点名称',
  refreshSeconds: '刷新间隔（秒）',
  maintenance: '维护模式',
};
watch(
  () => data.value?.settings,
  (saved) => {
    if (saved) {
      for (const key of Object.keys(values)) delete values[key];
      Object.assign(values, saved.values);
    }
  },
  { immediate: true },
);
const tabs = computed(() => [
  ...(data.value?.capabilities.settings.read
    ? [{ key: 'settings', label: 'KV 设置' }]
    : []),
  ...(data.value?.capabilities.keys.manage
    ? [{ key: 'keys', label: '访问密钥' }]
    : []),
  ...(data.value?.capabilities.audit.read
    ? [{ key: 'audit', label: '操作审计' }]
    : []),
  { key: 'api', label: 'API 中心' },
]);
async function revoke() {
  await props.client.revokeKey(selected.value);
  if (!props.state.error) confirm.value = false;
}
</script>
<template>
  <section v-if="data" data-management class="management-panel">
    <UCard
      ><h3>管理功能</h3>
      <p>与当前后端共用登录；配置、密钥和审计按后端隔离。</p>
      <nav aria-label="管理功能" class="management-actions">
        <UButton
          v-for="tab in tabs"
          :key="tab.key"
          @click="section = section === tab.key ? '' : tab.key"
          >{{ tab.label }}</UButton
        >
      </nav>
      <div v-if="section === 'settings' && data.settings">
        <h3>KV 设置</h3>
        <form
          class="management-form"
          @submit.prevent="client.saveSettings(values)"
        >
          <label v-for="(value, key) in values" :key="key"
            >{{ labels[key] || key
            }}<input
              type="checkbox"
              v-if="typeof value === 'boolean'"
              :checked="Boolean(values[key])"
              @change="
                values[key] = ($event.target as HTMLInputElement).checked
              " /><UInput
              v-else
              :type="typeof value === 'number' ? 'number' : 'text'"
              :model-value="String(values[key])"
              @update:model-value="
                values[key] =
                  typeof value === 'number'
                    ? Number($event)
                    : String($event ?? '')
              "
              :disabled="!data.capabilities.settings.manage"
              required /></label
          ><UButton
            type="submit"
            :disabled="state.busy || !data.capabilities.settings.manage"
            >保存设置</UButton
          >
        </form>
        <p>仅存储应用声明的非敏感字段。KV 跨区域同步可能短暂延迟。</p>
      </div>
      <div v-if="section === 'keys' && data.keys">
        <h3>访问密钥</h3>
        <form
          class="management-form"
          @submit.prevent="client.issueKey(name, days)"
        >
          <label>名称<UInput v-model="name" maxlength="80" required /></label
          ><label
            >有效期（天）<UInput
              v-model="days"
              type="number"
              min="1"
              max="365"
              required /></label
          ><UButton type="submit" :disabled="state.busy">签发密钥</UButton>
        </form>
        <div v-if="state.issuedToken" role="status">
          <p>完整令牌只显示一次，请保存后关闭。</p>
          <code data-issued-token class="management-token">{{
            state.issuedToken
          }}</code
          ><UButton @click="client.closeToken()">已保存，关闭</UButton>
        </div>
        <div class="management-table">
          <table>
            <thead>
              <tr>
                <th>名称</th>
                <th>前缀</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="key in data.keys.items" :key="key.id">
                <td>{{ key.name }}</td>
                <td>{{ key.prefix }}</td>
                <td>
                  {{
                    key.revokedAt
                      ? '已撤销'
                      : Date.parse(key.expiresAt) <= Date.now()
                        ? '已过期'
                        : '有效'
                  }}
                </td>
                <td>
                  <UButton
                    v-if="!key.revokedAt"
                    @click="
                      selected = key.id;
                      confirm = true;
                    "
                    >撤销</UButton
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="management-actions">
          <UButton :disabled="state.busy" @click="client.pageKeys()"
            >返回首页</UButton
          ><UButton
            :disabled="state.busy || !data.keys.cursor"
            @click="client.pageKeys(data.keys.cursor)"
            >下一页密钥</UButton
          >
        </div>
      </div>
      <div v-if="section === 'audit' && data.audit">
        <h3>操作审计</h3>
        <p>
          保留最近 30 天的操作元数据，不记录密码、配置值或完整令牌；KV
          审计采用尽力写入。
        </p>
        <div class="management-table">
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>操作人</th>
                <th>动作</th>
                <th>对象</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in data.audit.items" :key="item.id">
                <td>{{ new Date(item.at).toLocaleString('zh-CN') }}</td>
                <td>{{ item.actor }}</td>
                <td>{{ item.action }}</td>
                <td>{{ item.target }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="management-actions">
          <UButton :disabled="state.busy" @click="client.pageAudit()"
            >返回首页</UButton
          ><UButton
            :disabled="state.busy || !data.audit.cursor"
            @click="client.pageAudit(data.audit.cursor)"
            >下一页审计</UButton
          >
        </div>
      </div>
      <div v-if="section === 'api'">
        <h3>API 中心</h3>
        <p>使用当前后端的登录与权限。调试写接口会修改真实数据。</p>
        <a :href="client.apiUrl('/reference')" target="_blank" rel="noopener"
          >打开交互式 API 文档 ↗</a
        >
        <p>
          <a
            :href="client.apiUrl('/openapi.json')"
            target="_blank"
            rel="noopener"
            >查看 OpenAPI 声明</a
          >
        </p>
      </div> </UCard
    ><UModal
      v-model:open="confirm"
      title="撤销访问密钥？"
      description="撤销后不可恢复。KV 跨区域同步可能短暂延迟。"
      ><template #footer
        ><UButton color="neutral" @click="confirm = false">取消</UButton
        ><UButton color="error" :loading="state.busy" @click="revoke"
          >确认撤销</UButton
        ></template
      ></UModal
    >
  </section>
</template>
<style scoped>
.management-panel {
  margin: 20px 0;
}
.management-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0;
}
.management-form {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: end;
  margin: 16px 0;
}
.management-form label {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.management-table {
  overflow: auto;
  margin: 16px 0;
}
.management-table table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}
.management-table th,
.management-table td {
  padding: 12px;
  border-bottom: 1px solid currentColor;
  overflow-wrap: anywhere;
}
.management-token {
  display: block;
  overflow-wrap: anywhere;
  margin: 12px 0;
}
.management-panel p {
  margin: 12px 0;
  line-height: 1.6;
}
</style>
