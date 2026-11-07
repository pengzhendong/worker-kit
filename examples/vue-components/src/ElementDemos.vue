<script setup lang="ts">
import {
  ElButton,
  ElCard,
  ElDialog,
  ElInput,
  ElInputNumber,
  ElSelect,
  ElOption,
  ElSwitch,
  ElTag,
  ElTable,
  ElTableColumn,
} from 'element-plus';
import {
  taskColumns,
  taskValue,
  type DemoTask,
} from '../../ui-demo/component-fixtures';
import LibraryDemos from './LibraryDemos.vue';
defineProps<{ kind: string; title: string }>();
defineEmits<{ toggleTheme: [] }>();
</script>
<template>
  <LibraryDemos
    :kind="kind"
    :title="title"
    :button="ElButton"
    :card="ElCard"
    :input="ElInput"
    @toggle-theme="$emit('toggleTheme')"
  >
    <template #description="{ settings }">
      <ElInput
        v-model="settings.description"
        type="textarea"
        aria-label="说明"
      />
    </template>
    <template #timezone="{ settings, timezones }">
      <ElSelect v-model="settings.timezone" aria-label="显示时区">
        <ElOption
          v-for="zone in timezones"
          :key="zone"
          :label="zone"
          :value="zone"
        />
      </ElSelect>
    </template>
    <template #retention="{ settings }">
      <ElInputNumber
        :model-value="settings.retention ?? undefined"
        :min="1"
        :max="90"
        aria-label="日志保留天数"
        @update:model-value="settings.retention = $event ?? null"
      />
    </template>
    <template #toggle="{ settings, field, label }">
      <ElSwitch v-model="settings[field]" :aria-label="label" />
    </template>
    <template #filter="{ value, options, update }">
      <ElSelect
        :model-value="value"
        aria-label="任务状态筛选"
        @update:model-value="update"
      >
        <ElOption
          v-for="item in options"
          :key="item"
          :label="item"
          :value="item"
        />
      </ElSelect>
    </template>
    <template #table="{ rows, run }">
      <ElTable :data="rows" stripe>
        <ElTableColumn
          v-for="column in taskColumns"
          :key="column.key"
          :label="column.title"
          min-width="120"
        >
          <template #default="{ row }">{{
            taskValue(row as DemoTask, column.key)
          }}</template>
        </ElTableColumn>
        <ElTableColumn label="启用" width="80">
          <template #default="{ row }"
            ><ElSwitch v-model="row.enabled" :aria-label="'启用' + row.name"
          /></template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="100">
          <template #default="{ row }"
            ><ElButton text :aria-label="'运行' + row.name" @click="run(row.id)"
              >运行</ElButton
            ></template
          >
        </ElTableColumn>
      </ElTable>
    </template>
    <template #theme>
      <div class="workspace-actions demo-theme-row">
        <ElButton type="primary">主要按钮</ElButton
        ><ElButton plain>次要按钮</ElButton
        ><ElButton disabled>禁用按钮</ElButton>
      </div>
      <div class="workspace-actions demo-theme-row">
        <ElTag type="success">成功</ElTag><ElTag type="warning">警告</ElTag
        ><ElTag type="danger">错误</ElTag>
      </div>
    </template>
    <template #dialog="{ open, confirming, close, confirm }">
      <ElDialog
        :model-value="open"
        :title="confirming ? '确认演示操作' : '示例弹窗'"
        width="min(480px, calc(100vw - 32px))"
        @update:model-value="(value) => !value && close()"
      >
        <p>确认后显示演示结果。</p>
        <template #footer
          ><ElButton @click="close">取消</ElButton
          ><ElButton type="primary" @click="confirm">{{
            confirming ? '确认操作' : '完成操作'
          }}</ElButton></template
        >
      </ElDialog>
    </template>
  </LibraryDemos>
</template>
