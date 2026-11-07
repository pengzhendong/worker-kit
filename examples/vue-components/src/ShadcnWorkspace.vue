<script setup lang="ts">
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Switch } from './components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './components/ui/dialog';
import { useWorkspace } from './useWorkspace';
withDefaults(defineProps<{ section?: string; title?: string }>(), {
  section: 'workspace',
  title: '业务工作台',
});
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
</script>
<template>
  <div data-workspace>
    <div class="workspace-toolbar">
      <div>
        <h1>{{ title }}</h1>
        <p>shadcn-vue 源码组件连接当前后端的真实接口。</p>
      </div>
      <Button variant="outline" :disabled="state.busy" @click="client.refresh()"
        >刷新</Button
      >
    </div>
    <p v-if="state.busy && !state.data" role="status">正在更新工作台数据…</p>
    <p v-if="state.error" role="alert" class="text-destructive">
      {{ state.error }}
    </p>
    <a
      v-if="state.unauthorized"
      class="workspace-login underline"
      :href="client.loginUrl()"
      >登录后端</a
    >
    <div v-if="state.data" class="workspace-stack">
      <div class="workspace-status">
        <Badge variant="secondary">{{ state.data.backend }}</Badge
        ><span>{{ state.data.user.name }}</span
        ><Badge :variant="state.data.runtime.ok ? 'default' : 'destructive'">{{
          state.data.runtime.ok ? '依赖正常' : '依赖异常'
        }}</Badge
        ><a
          v-if="['payload', 'sonic'].includes(state.data.backend)"
          href="/admin"
          class="underline"
          >管理内容与媒体 ↗</a
        >
      </div>
      <Card
        v-if="management && (section === 'workspace' || section === 'settings')"
        data-management
        ><CardHeader><CardTitle>管理功能</CardTitle></CardHeader
        ><CardContent
          ><Tabs :key="section" default-value="settings"
            ><TabsList class="flex-wrap h-auto">
              <TabsTrigger v-if="management.settings" value="settings"
                >KV 设置</TabsTrigger
              ><TabsTrigger v-if="management.keys" value="keys"
                >访问密钥</TabsTrigger
              ><TabsTrigger v-if="management.audit" value="audit"
                >操作审计</TabsTrigger
              ><TabsTrigger value="api">API 中心</TabsTrigger> </TabsList
            ><TabsContent v-if="management.settings" value="settings"
              ><form
                class="workspace-form"
                @submit.prevent="client.saveSettings(values)"
              >
                <label
                  v-for="(value, key) in values"
                  :key="key"
                  class="shadcn-field"
                  >{{ labels[key] || key
                  }}<Switch
                    v-if="typeof value === 'boolean'"
                    :model-value="Boolean(value)"
                    @update:model-value="values[key] = $event"
                    :disabled="
                      !management.capabilities.settings.manage
                    " /><Input
                    v-else
                    :type="typeof value === 'number' ? 'number' : 'text'"
                    :model-value="String(value)"
                    @update:model-value="
                      values[key] =
                        typeof value === 'number'
                          ? Number($event)
                          : String($event)
                    "
                    :disabled="!management.capabilities.settings.manage"
                    required /></label
                ><Button
                  type="submit"
                  :disabled="
                    state.busy || !management.capabilities.settings.manage
                  "
                  >保存设置</Button
                >
              </form>
              <p class="text-muted-foreground mt-4">
                只保存声明的非敏感字段；KV 跨区域同步可能短暂延迟。
              </p></TabsContent
            >
            <TabsContent v-if="management.keys" value="keys"
              ><form
                class="workspace-form"
                @submit.prevent="client.issueKey(name, days)"
              >
                <label class="shadcn-field"
                  >名称<Input v-model="name" maxlength="80" required /></label
                ><label class="shadcn-field"
                  >有效期（天）<Input
                    :model-value="days"
                    @update:model-value="days = Number($event)"
                    type="number"
                    min="1"
                    max="365"
                    required /></label
                ><Button type="submit" :disabled="state.busy">签发密钥</Button>
              </form>
              <div v-if="state.issuedToken" role="status" class="mt-4">
                <p>完整令牌只显示一次，请保存后关闭。</p>
                <code data-issued-token class="workspace-token">{{
                  state.issuedToken
                }}</code
                ><Button variant="outline" @click="client.closeToken()"
                  >已保存，关闭</Button
                >
              </div>
              <Table class="mt-4"
                ><TableHeader
                  ><TableRow
                    ><TableHead>名称</TableHead><TableHead>前缀</TableHead
                    ><TableHead>状态</TableHead
                    ><TableHead>操作</TableHead></TableRow
                  ></TableHeader
                ><TableBody
                  ><TableRow v-for="key in management.keys.items" :key="key.id"
                    ><TableCell>{{ key.name }}</TableCell
                    ><TableCell>{{ key.prefix }}</TableCell
                    ><TableCell>{{
                      key.revokedAt
                        ? '已撤销'
                        : Date.parse(key.expiresAt) <= Date.now()
                          ? '已过期'
                          : '有效'
                    }}</TableCell
                    ><TableCell
                      ><Button
                        v-if="!key.revokedAt"
                        variant="destructive"
                        size="sm"
                        @click="
                          selected = key.id;
                          confirm = true;
                        "
                        >撤销</Button
                      ></TableCell
                    ></TableRow
                  ></TableBody
                ></Table
              >
              <div class="workspace-actions mt-4">
                <Button
                  variant="outline"
                  :disabled="state.busy"
                  @click="client.pageKeys()"
                  >首页</Button
                ><Button
                  variant="outline"
                  :disabled="state.busy || !management.keys.cursor"
                  @click="client.pageKeys(management.keys.cursor)"
                  >下一页密钥</Button
                >
              </div></TabsContent
            >
            <TabsContent v-if="management.audit" value="audit"
              ><Table
                ><TableHeader
                  ><TableRow
                    ><TableHead>时间</TableHead><TableHead>操作</TableHead
                    ><TableHead>对象</TableHead
                    ><TableHead>身份</TableHead></TableRow
                  ></TableHeader
                ><TableBody
                  ><TableRow
                    v-for="entry in management.audit.items"
                    :key="entry.id"
                    ><TableCell>{{ formatTime(entry.at) }}</TableCell
                    ><TableCell>{{ entry.action }}</TableCell
                    ><TableCell>{{ entry.target }}</TableCell
                    ><TableCell>{{ entry.actor }}</TableCell></TableRow
                  ></TableBody
                ></Table
              ><Button
                class="mt-4"
                variant="outline"
                :disabled="state.busy || !management.audit.cursor"
                @click="client.pageAudit(management.audit.cursor)"
                >下一页审计</Button
              ></TabsContent
            >
            <TabsContent value="api"
              ><iframe
                class="workspace-reference"
                title="交互式 API 文档"
                :src="
                  client.apiUrl('/reference')
                " /></TabsContent></Tabs></CardContent
      ></Card>
      <Card v-if="section === 'workspace' || section === 'overview'"
        ><CardHeader><CardTitle>运行诊断</CardTitle></CardHeader
        ><CardContent
          ><div
            v-for="check in state.data.runtime.checks"
            :key="check.name"
            class="workspace-row"
          >
            <strong>{{ check.name }}</strong
            ><span>{{ check.status }} · {{ check.durationMs }} ms</span>
          </div></CardContent
        ></Card
      >
      <Card
        v-if="manageTasks && (section === 'workspace' || section === 'tasks')"
        ><CardHeader><CardTitle>创建任务计划</CardTitle></CardHeader
        ><CardContent
          ><form
            class="workspace-form"
            @submit.prevent="
              client.create(draft.task, draft.minutes, draft.inputs)
            "
          >
            <label class="shadcn-field"
              >执行任务<Select v-model="draft.task"
                ><SelectTrigger><SelectValue /></SelectTrigger
                ><SelectContent
                  ><SelectItem
                    v-for="task in state.data.definitions"
                    :key="task.id"
                    :value="task.id"
                    >{{ task.label }}</SelectItem
                  ></SelectContent
                ></Select
              ></label
            ><label class="shadcn-field"
              >间隔（分钟）<Input
                :model-value="draft.minutes"
                @update:model-value="draft.minutes = Number($event)"
                type="number"
                min="1"
                max="10080"
                required /></label
            ><label
              v-for="field in definition?.fields"
              :key="field.name"
              class="shadcn-field"
              >{{ field.label
              }}<Input
                v-model="draft.inputs[field.name]"
                :required="field.required" /></label
            ><Button type="submit" :disabled="state.busy">创建计划</Button>
          </form></CardContent
        ></Card
      >
      <Card v-if="section === 'workspace' || section === 'tasks'"
        ><CardHeader><CardTitle>任务计划</CardTitle></CardHeader
        ><CardContent
          ><p v-if="!state.data.plans.length">暂无计划</p>
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
              <Button
                variant="outline"
                :disabled="state.busy"
                @click="client.change('run', plan.id)"
                >运行</Button
              ><Button
                variant="outline"
                :disabled="state.busy"
                @click="
                  client.change(plan.scheduleId ? 'pause' : 'resume', plan.id)
                "
                >{{ plan.scheduleId ? '暂停' : '恢复' }}</Button
              >
            </div>
          </div></CardContent
        ></Card
      >
      <Card v-if="section === 'workspace' || section === 'runs'"
        ><CardHeader><CardTitle>运行记录与日志</CardTitle></CardHeader
        ><CardContent
          ><p v-if="!state.data.runs.length">暂无运行记录</p>
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
          </article></CardContent
        ></Card
      >
    </div>
    <Dialog v-model:open="confirm"
      ><DialogContent
        ><DialogHeader
          ><DialogTitle>撤销访问密钥？</DialogTitle
          ><DialogDescription
            >撤销后，该密钥将不能发起新的授权请求。</DialogDescription
          ></DialogHeader
        ><DialogFooter
          ><Button variant="outline" @click="confirm = false">取消</Button
          ><Button variant="destructive" :disabled="state.busy" @click="revoke"
            >确认撤销</Button
          ></DialogFooter
        ></DialogContent
      ></Dialog
    >
  </div>
</template>
