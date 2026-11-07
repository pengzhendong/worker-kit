<script setup lang="ts">
import { h } from 'vue';
import {
  NButton,
  NCard,
  NDataTable,
  NInput,
  NInputNumber,
  NSelect,
  NSwitch,
  NTag,
  NModal,
} from 'naive-ui';
import {
  taskColumns,
  taskValue,
  type DemoTask,
} from '../../ui-demo/component-fixtures';
import LibraryDemos from './LibraryDemos.vue';
defineProps<{ kind: string; title: string }>();
defineEmits<{ toggleTheme: [] }>();
const columns = (run: (id: number) => void) => [
  ...taskColumns.map(({ key, title }) => ({
    key,
    title,
    minWidth: 120,
    render: (row: DemoTask) => taskValue(row, key),
  })),
  {
    key: 'enabled',
    title: '启用',
    width: 72,
    render: (row: DemoTask) =>
      h(NSwitch, {
        value: row.enabled,
        'aria-label': '启用' + row.name,
        'onUpdate:value': (value) => {
          row.enabled = value;
        },
      }),
  },
  {
    key: 'actions',
    title: '操作',
    width: 88,
    render: (row: DemoTask) =>
      h(
        NButton,
        {
          text: true,
          'aria-label': '运行' + row.name,
          onClick: () => run(row.id),
        },
        { default: () => '运行' },
      ),
  },
];
</script>
<template>
  <LibraryDemos
    :kind="kind"
    :title="title"
    :button="NButton"
    :card="NCard"
    :input="NInput"
    input-model="value"
    @toggle-theme="$emit('toggleTheme')"
  >
    <template #description="{ settings }">
      <NInput
        v-model:value="settings.description"
        type="textarea"
        aria-label="说明"
      />
    </template>
    <template #timezone="{ settings, timezones }">
      <NSelect
        v-model:value="settings.timezone"
        :options="timezones.map((zone) => ({ label: zone, value: zone }))"
        aria-label="显示时区"
      />
    </template>
    <template #retention="{ settings }">
      <NInputNumber
        v-model:value="settings.retention"
        :min="1"
        :max="90"
        aria-label="日志保留天数"
      />
    </template>
    <template #toggle="{ settings, field, label }">
      <NSwitch v-model:value="settings[field]" :aria-label="label" />
    </template>
    <template #filter="{ value, options, update }">
      <NSelect
        :value="value"
        :options="options.map((item) => ({ label: item, value: item }))"
        aria-label="任务状态筛选"
        @update:value="update"
      />
    </template>
    <template #table="{ rows, run }">
      <NDataTable :columns="columns(run)" :data="rows" :scroll-x="760" />
    </template>
    <template #theme>
      <div class="workspace-actions demo-theme-row">
        <NButton type="primary">主要按钮</NButton
        ><NButton secondary>次要按钮</NButton
        ><NButton disabled>禁用按钮</NButton>
      </div>
      <div class="workspace-actions demo-theme-row">
        <NTag type="success">成功</NTag><NTag type="warning">警告</NTag
        ><NTag type="error">错误</NTag>
      </div>
    </template>
    <template #dialog="{ open, confirming, close, confirm }">
      <NModal
        :show="open"
        preset="dialog"
        :title="confirming ? '确认演示操作' : '示例弹窗'"
        content="确认后显示演示结果。"
        :positive-text="confirming ? '确认操作' : '完成操作'"
        negative-text="取消"
        @positive-click="confirm"
        @update:show="(value) => !value && close()"
      />
    </template>
  </LibraryDemos>
</template>
