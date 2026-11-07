<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch, type Component } from 'vue';
import DemoFiles from './DemoFiles.vue';
import {
  createDemoTasks,
  demoMedia,
  filterDemoTasks,
  runDemoTask,
  taskFilters,
  taskPageSize,
} from '../../ui-demo/component-fixtures';
import {
  demoSettings,
  demoSettingsKey,
  demoTimezones,
  readDemoSettings,
  validDemoRetention,
} from '../../ui-demo/demo-settings';

const props = defineProps<{
  kind: string;
  title: string;
  button: Component;
  card: Component;
  input: Component;
  inputModel?: 'value' | 'modelValue';
}>();
const emit = defineEmits<{ toggleTheme: [] }>();
const rows = ref(createDemoTasks());
const picker = ref<HTMLInputElement>();
const query = ref('');
const filter = ref(taskFilters[0]);
const page = ref(1);
const taskResult = ref('');
const filtered = computed(() =>
  filterDemoTasks(rows.value, query.value, filter.value),
);
const pageCount = computed(() =>
  Math.max(1, Math.ceil(filtered.value.length / taskPageSize)),
);
const visibleRows = computed(() =>
  filtered.value.slice(
    (page.value - 1) * taskPageSize,
    page.value * taskPageSize,
  ),
);
watch([query, filter], () => {
  page.value = 1;
});
watch(pageCount, (count) => {
  page.value = Math.min(page.value, count);
});
function run(id: number) {
  rows.value = rows.value.map((task) => {
    if (task.id !== id) return task;
    taskResult.value = `已模拟运行：${task.name}`;
    return runDemoTask(task);
  });
}
const settingsKey = demoSettingsKey(import.meta.env.BASE_URL);
const settings = reactive<
  Omit<typeof demoSettings, 'retention'> & { retention: number | null }
>(props.kind === 'form' ? readDemoSettings(settingsKey) : { ...demoSettings });
const submitted = ref(false);
const saved = ref(false);
const storageError = ref(false);
const dialog = ref(false);
const confirming = ref(false);
const dialogResult = ref('');
let opener: HTMLElement | undefined;
function showDialog(confirm: boolean, event: MouseEvent) {
  opener = event.currentTarget as HTMLElement;
  confirming.value = confirm;
  dialog.value = true;
}
function closeDialog() {
  dialog.value = false;
  void nextTick(() => opener?.focus());
}
function finishDialog() {
  dialogResult.value = confirming.value ? '已确认演示操作' : '已完成演示操作';
  closeDialog();
}
const long = ref(false);
function inputProps(
  value: string,
  update: (next: string) => void,
  label: string,
) {
  const model = props.inputModel || 'modelValue';
  return {
    [model]: value,
    ['onUpdate:' + model]: (next: string | null) => update(next ?? ''),
    ...(model === 'value'
      ? { inputProps: { 'aria-label': label } }
      : { 'aria-label': label }),
  };
}
function pickFile(event: Event, select: (file: File | null) => void) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) select(file);
  input.value = '';
}
function save() {
  submitted.value = true;
  saved.value = false;
  storageError.value = false;
  if (!settings.name.trim() || !validDemoRetention(settings.retention)) return;
  try {
    localStorage.setItem(settingsKey, JSON.stringify(settings));
    saved.value = true;
  } catch {
    storageError.value = true;
  }
}
</script>

<template>
  <component :is="card" v-if="kind === 'preview'"
    ><DemoFiles :samples="demoMedia">
      <template #picker="{ file, select }">
        <div class="workspace-actions">
          <input
            ref="picker"
            type="file"
            accept="image/*,audio/*,video/*"
            hidden
            @change="pickFile($event, select)"
          />
          <component :is="button" @click="picker?.click()">选择文件</component>
          <span v-if="file">{{ file.name }}</span>
        </div>
      </template>
      <template #sample="{ sample, active, select }">
        <component :is="button" :aria-pressed="active" @click="select">
          预览{{ sample.name }}
        </component>
      </template>
    </DemoFiles></component
  >
  <section v-else class="workspace-stack">
    <header>
      <h1>{{ title }}</h1>
      <p>原生组件演示，操作在当前浏览器内完成。</p>
    </header>
    <component :is="card" v-if="kind === 'table'">
      <div class="library-demo-controls">
        <component
          :is="input"
          v-bind="inputProps(query, (next) => (query = next), '搜索任务')"
          placeholder="搜索任务或应用"
        />
        <slot
          name="filter"
          :value="filter"
          :options="taskFilters"
          :update="(value: string) => (filter = value)"
        />
      </div>
      <div class="library-table-scroll">
        <slot name="table" :rows="visibleRows" :run="run" />
      </div>
      <p v-if="!filtered.length" role="status">没有匹配的任务</p>
      <div
        v-else
        class="workspace-actions library-demo-result"
        aria-label="任务分页"
      >
        <component :is="button" :disabled="page === 1" @click="page--"
          >上一页</component
        >
        <span
          >第 {{ page }} / {{ pageCount }} 页 · 共
          {{ filtered.length }} 个任务</span
        >
        <component :is="button" :disabled="page === pageCount" @click="page++"
          >下一页</component
        >
      </div>
      <p v-if="taskResult" role="status" class="library-demo-result">
        {{ taskResult }}
      </p>
    </component>
    <component :is="card" v-else-if="kind === 'form'">
      <form class="library-demo-controls" novalidate @submit.prevent="save">
        <label>
          工作空间名称
          <component
            :is="input"
            v-bind="
              inputProps(
                settings.name,
                (next) => (settings.name = next),
                '工作空间名称',
              )
            "
          />
        </label>
        <p v-if="submitted && !settings.name.trim()" role="alert">
          请输入工作空间名称
        </p>
        <label>
          说明
          <slot name="description" :settings="settings" />
        </label>
        <label>
          显示时区
          <slot
            name="timezone"
            :settings="settings"
            :timezones="demoTimezones"
          />
        </label>
        <label>
          日志保留天数
          <slot name="retention" :settings="settings" />
        </label>
        <p
          v-if="submitted && !validDemoRetention(settings.retention)"
          role="alert"
        >
          保留天数应为 1–90 的整数
        </p>
        <div
          v-for="[field, label] in [
            ['failureNotice', '任务失败提醒'],
            ['dailyDigest', '每日运行摘要'],
          ] as const"
          :key="field"
          class="workspace-actions"
        >
          <span>{{ label }}</span>
          <slot
            name="toggle"
            :settings="settings"
            :field="field"
            :label="label"
          />
        </div>
        <div><component :is="button" @click="save">保存设置</component></div>
        <p v-if="saved" role="status">演示设置已保存到当前浏览器</p>
        <p v-if="storageError" role="alert">浏览器存储不可用</p>
      </form>
    </component>
    <component :is="card" v-else-if="kind === 'dialogs'">
      <div class="workspace-actions">
        <component :is="button" @click="showDialog(false, $event)"
          >打开示例弹窗</component
        >
        <component :is="button" @click="showDialog(true, $event)"
          >打开确认弹窗</component
        >
      </div>
      <p v-if="dialogResult" role="status" class="library-demo-result">
        {{ dialogResult }}
      </p>
      <slot
        name="dialog"
        :open="dialog"
        :confirming="confirming"
        :close="closeDialog"
        :confirm="finishDialog"
      />
    </component>
    <template v-else-if="kind === 'layout'">
      <div>
        <component :is="button" @click="long = !long">{{
          long ? '收起长内容' : '填充长内容'
        }}</component>
      </div>
      <div class="library-demo-grid">
        <component :is="card" v-for="i in long ? 36 : 6" :key="i"
          >布局卡片 {{ i }}</component
        >
      </div>
    </template>
    <component :is="card" v-else-if="kind === 'theme'">
      <div class="workspace-actions">
        <component :is="button" @click="emit('toggleTheme')"
          >切换示例主题</component
        >
      </div>
      <slot name="theme" />
    </component>
  </section>
</template>

<style scoped>
.workspace-stack {
  align-content: start;
}
.library-table-scroll {
  overflow-x: auto;
}
.library-demo-controls {
  display: grid;
  gap: 12px;
  max-width: 400px;
  margin-bottom: 16px;
}
.library-demo-controls label {
  display: grid;
  gap: 8px;
}
.library-demo-controls p,
.library-demo-result {
  margin: 12px 0 0;
}
.library-demo-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.library-demo-grid > * {
  min-height: 96px;
}
@media (max-width: 767px) {
  .library-demo-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 479px) {
  .library-demo-grid {
    grid-template-columns: 1fr;
  }
}
</style>
