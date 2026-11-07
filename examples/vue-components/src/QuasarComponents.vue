<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import type { QTableColumn } from 'quasar';
import DemoFiles from './DemoFiles.vue';
import {
  createDemoTasks,
  demoMedia,
  filterDemoTasks,
  runDemoTask,
  taskColumns,
  taskFilters,
  taskPageSize,
  taskValue,
  type DemoTask,
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
  description: string;
}>();
const q = useQuasar();
const query = ref('');
const filter = ref(taskFilters[0]);
const rows = ref(createDemoTasks());
const filtered = computed(() =>
  filterDemoTasks(rows.value, query.value, filter.value),
);
const taskResult = ref('');
const columns: QTableColumn<DemoTask>[] = [
  ...taskColumns.map(({ key, title }) => ({
    name: key,
    label: title,
    field: (row: DemoTask) => taskValue(row, key),
    align: 'left' as const,
    sortable: key === 'name' || key === 'app',
  })),
  { name: 'enabled', label: '启用', field: 'enabled', align: 'center' },
  { name: 'actions', label: '操作', field: 'id', align: 'right' },
];
const pagination = ref({ page: 1, rowsPerPage: taskPageSize });
watch([query, filter], () => {
  pagination.value.page = 1;
});
function run(row: DemoTask) {
  Object.assign(row, runDemoTask(row));
  taskResult.value = `已模拟运行：${row.name}`;
}
const settingsKey = demoSettingsKey(import.meta.env.BASE_URL);
const settings = reactive(
  props.kind === 'form' ? readDemoSettings(settingsKey) : { ...demoSettings },
);
const saveResult = ref('');
const dialogOpen = ref(false);
const confirming = ref(false);
const result = ref('尚未执行操作');
const long = ref(false);

function saveSettings() {
  try {
    localStorage.setItem(settingsKey, JSON.stringify(settings));
    saveResult.value = '演示设置已保存到当前浏览器';
  } catch {
    saveResult.value = '浏览器存储不可用';
  }
}

function showDialog(confirm: boolean) {
  confirming.value = confirm;
  dialogOpen.value = true;
}
function finishDialog() {
  result.value = confirming.value ? '已确认演示操作' : '已完成演示操作';
  dialogOpen.value = false;
}
</script>

<template>
  <QCard v-if="kind === 'preview'" flat bordered>
    <QCardSection>
      <DemoFiles :samples="demoMedia">
        <template #picker="{ file, select }">
          <QFile
            :model-value="file"
            outlined
            clearable
            label="选择文件"
            accept="image/*,audio/*,video/*"
            class="demo-field"
            @update:model-value="select"
          />
        </template>
        <template #sample="{ sample, active, select }">
          <QBtn
            outline
            color="primary"
            :label="'预览' + sample.name"
            :aria-pressed="active"
            @click="select"
          />
        </template>
      </DemoFiles>
    </QCardSection>
  </QCard>

  <section v-else class="workspace-stack">
    <header>
      <h1>{{ title }}</h1>
      <p class="q-ma-none">{{ description }}</p>
    </header>

    <template v-if="kind === 'table'">
      <QTable
        v-model:pagination="pagination"
        flat
        bordered
        row-key="id"
        :rows="filtered"
        :columns="columns"
        :rows-per-page-options="[2, 3]"
        rows-per-page-label="每页条数"
        no-data-label="没有匹配的任务"
        no-results-label="没有匹配的任务"
      >
        <template #top>
          <div class="workspace-actions">
            <QInput
              v-model="query"
              outlined
              dense
              label="搜索任务"
              class="demo-field"
            />
            <QSelect
              v-model="filter"
              outlined
              dense
              label="任务状态筛选"
              :options="taskFilters"
            />
          </div>
        </template>
        <template #body-cell-status="scope">
          <QTd :props="scope">
            <QBadge
              :color="
                scope.row.status === 'success'
                  ? 'positive'
                  : scope.row.status === 'warning'
                    ? 'warning'
                    : 'grey-7'
              "
            >
              {{ scope.value }}
            </QBadge>
          </QTd>
        </template>
        <template #body-cell-enabled="scope">
          <QTd :props="scope">
            <QToggle
              v-model="scope.row.enabled"
              :aria-label="'启用' + scope.row.name"
            />
          </QTd>
        </template>
        <template #body-cell-actions="scope">
          <QTd :props="scope">
            <QBtn
              flat
              color="primary"
              label="运行"
              :aria-label="'运行' + scope.row.name"
              @click="run(scope.row)"
            />
          </QTd>
        </template>
      </QTable>
      <p v-if="taskResult" role="status">{{ taskResult }}</p>
    </template>

    <QCard v-else-if="kind === 'form'" flat bordered>
      <QCardSection>
        <QForm class="demo-form" @submit="saveSettings">
          <QInput
            v-model="settings.name"
            outlined
            label="工作空间名称"
            :rules="[(value: string) => !!value.trim() || '请输入工作空间名称']"
          />
          <QInput
            v-model="settings.description"
            outlined
            type="textarea"
            rows="2"
            label="说明"
          />
          <QSelect
            v-model="settings.timezone"
            outlined
            label="显示时区"
            :options="demoTimezones"
          />
          <QInput
            v-model.number="settings.retention"
            outlined
            type="number"
            label="日志保留天数"
            :rules="[
              (value: number) =>
                validDemoRetention(value) || '保留天数应为 1–90 的整数',
            ]"
          />
          <QToggle v-model="settings.failureNotice" label="任务失败提醒" />
          <QToggle v-model="settings.dailyDigest" label="每日运行摘要" />
          <div>
            <QBtn unelevated color="primary" label="保存设置" type="submit" />
          </div>
        </QForm>
        <QBanner v-if="saveResult" role="status" class="q-mt-md">{{
          saveResult
        }}</QBanner>
      </QCardSection>
    </QCard>

    <QCard v-else-if="kind === 'dialogs'" flat bordered>
      <QCardSection>
        <div class="workspace-actions">
          <QBtn
            unelevated
            color="primary"
            label="打开示例弹窗"
            @click="showDialog(false)"
          />
          <QBtn
            outline
            color="negative"
            label="打开确认弹窗"
            @click="showDialog(true)"
          />
        </div>
        <p role="status" class="q-mt-md q-mb-none">{{ result }}</p>
      </QCardSection>
      <QDialog v-model="dialogOpen" aria-labelledby="quasar-dialog-title">
        <QCard>
          <QCardSection>
            <h2 id="quasar-dialog-title" class="q-ma-none">
              {{ confirming ? '确认演示操作' : '示例弹窗' }}
            </h2>
          </QCardSection>
          <QCardSection>弹窗关闭后，焦点会回到打开它的按钮。</QCardSection>
          <QCardActions align="right">
            <QBtn flat label="取消" @click="dialogOpen = false" />
            <QBtn
              unelevated
              :color="confirming ? 'negative' : 'primary'"
              :label="confirming ? '确认操作' : '完成操作'"
              @click="finishDialog"
            />
          </QCardActions>
        </QCard>
      </QDialog>
    </QCard>

    <template v-else-if="kind === 'layout'">
      <div>
        <QBtn
          outline
          color="primary"
          :label="long ? '收起长内容' : '填充长内容'"
          @click="long = !long"
        />
      </div>
      <div class="row q-col-gutter-md">
        <div
          v-for="index in long ? 36 : 6"
          :key="index"
          class="col-12 col-sm-6 col-md-4"
        >
          <QCard flat bordered
            ><QCardSection
              ><h2 class="q-ma-none">布局卡片 {{ index }}</h2></QCardSection
            ></QCard
          >
        </div>
      </div>
    </template>

    <QCard v-else-if="kind === 'theme'" flat bordered>
      <QCardSection>
        <QBtn
          outline
          color="primary"
          label="切换示例主题"
          @click="q.dark.toggle()"
        />
      </QCardSection>
      <QSeparator />
      <QCardSection class="workspace-actions">
        <QBtn unelevated color="primary" label="主要按钮" />
        <QBtn outline color="primary" label="次要按钮" />
        <QBtn flat color="primary" label="文字按钮" />
        <QBtn disable label="禁用按钮" />
      </QCardSection>
      <QCardSection class="workspace-actions">
        <QChip color="positive" text-color="white">成功</QChip>
        <QChip color="warning">警告</QChip>
        <QChip color="negative" text-color="white">错误</QChip>
      </QCardSection>
    </QCard>
  </section>
</template>

<style scoped>
.demo-form {
  display: grid;
  gap: 16px;
  max-width: 440px;
}
.demo-field {
  width: min(100%, 360px);
}
</style>
