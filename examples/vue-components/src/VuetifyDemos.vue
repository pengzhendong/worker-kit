<script setup lang="ts">
import {
  VBtn,
  VCard,
  VCardActions,
  VChip,
  VSpacer,
  VDialog,
  VSelect,
  VSwitch,
  VTextarea,
  VTextField,
  VTable,
} from 'vuetify/components';
import { taskColumns, taskValue } from '../../ui-demo/component-fixtures';
import LibraryDemos from './LibraryDemos.vue';
defineProps<{ kind: string; title: string }>();
defineEmits<{ toggleTheme: [] }>();
</script>
<template>
  <LibraryDemos
    :kind="kind"
    :title="title"
    :button="VBtn"
    :card="VCard"
    :input="VTextField"
    class="vuetify-demo"
    @toggle-theme="$emit('toggleTheme')"
  >
    <template #description="{ settings }">
      <VTextarea
        v-model="settings.description"
        rows="2"
        hide-details
        aria-label="说明"
      />
    </template>
    <template #timezone="{ settings, timezones }">
      <VSelect
        v-model="settings.timezone"
        :items="timezones"
        hide-details
        aria-label="显示时区"
      />
    </template>
    <template #retention="{ settings }">
      <VTextField
        :model-value="settings.retention?.toString() ?? ''"
        type="number"
        min="1"
        max="90"
        hide-details
        aria-label="日志保留天数"
        @update:model-value="
          settings.retention = $event === '' ? null : Number($event)
        "
      />
    </template>
    <template #toggle="{ settings, field, label }">
      <VSwitch v-model="settings[field]" hide-details :aria-label="label" />
    </template>
    <template #filter="{ value, options, update }">
      <VSelect
        :model-value="value"
        :items="options"
        hide-details
        aria-label="任务状态筛选"
        @update:model-value="update"
      />
    </template>
    <template #table="{ rows, run }">
      <VTable>
        <thead>
          <tr>
            <th v-for="column in taskColumns" :key="column.key">
              {{ column.title }}
            </th>
            <th>启用</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td v-for="column in taskColumns" :key="column.key">
              {{ taskValue(row, column.key) }}
            </td>
            <td>
              <VSwitch
                v-model="row.enabled"
                hide-details
                :aria-label="'启用' + row.name"
              />
            </td>
            <td>
              <VBtn
                variant="text"
                :aria-label="'运行' + row.name"
                @click="run(row.id)"
                >运行</VBtn
              >
            </td>
          </tr>
        </tbody>
      </VTable>
    </template>
    <template #theme>
      <div class="workspace-actions demo-theme-row">
        <VBtn color="primary">主要按钮</VBtn
        ><VBtn variant="outlined">次要按钮</VBtn><VBtn disabled>禁用按钮</VBtn>
      </div>
      <div class="workspace-actions demo-theme-row">
        <VChip color="success">成功</VChip><VChip color="warning">警告</VChip
        ><VChip color="error">错误</VChip>
      </div>
    </template>
    <template #dialog="{ open, confirming, close, confirm }">
      <VDialog
        :model-value="open"
        max-width="480"
        @update:model-value="(value) => !value && close()"
      >
        <VCard
          :title="confirming ? '确认演示操作' : '示例弹窗'"
          text="确认后显示演示结果。"
          ><VCardActions
            ><VSpacer /><VBtn @click="close">取消</VBtn
            ><VBtn color="primary" @click="confirm">{{
              confirming ? '确认操作' : '完成操作'
            }}</VBtn></VCardActions
          ></VCard
        >
      </VDialog>
    </template>
  </LibraryDemos>
</template>
<style scoped>
.vuetify-demo :deep(.v-card) {
  padding: 16px;
}
.vuetify-demo.v-card {
  padding: 16px;
}
</style>
