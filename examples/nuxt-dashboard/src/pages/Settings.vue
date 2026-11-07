<script setup lang="ts">
import { useRoute } from 'vue-router';
const route = useRoute();
import { reactive, ref } from 'vue';
import type { FormError } from '@nuxt/ui';
import { demoSettings, demoTimezones, readDemoSettings, validDemoRetention } from '../../../ui-demo/demo-settings';
const toast = useToast();
const state = reactive(readDemoSettings('workerkit-nuxt-settings'));
const savedAt = ref('');
const validate = (value: typeof state): FormError[] => {
  const errors: FormError[] = [];
  if (!value.name.trim()) errors.push({ name: 'name', message: '请输入工作空间名称' });
  if (!validDemoRetention(value.retention)) errors.push({ name: 'retention', message: '保留天数应为 1–90 的整数' });
  return errors;
};
function save() {
  try {
    localStorage.setItem('workerkit-nuxt-settings', JSON.stringify(state));
    savedAt.value = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    toast.add({ title: '演示设置已保存', description: '保存在当前浏览器，刷新后仍可查看。', color: 'success' });
  } catch { toast.add({ title: '浏览器存储不可用', description: '设置仍保留在当前页面，请允许本地存储后重试。', color: 'error' }); }
}
</script>
<template>
  <div>
    <div class="page-heading"><div><h2>{{ route.meta.title || '应用设置' }}</h2><p>{{ route.meta.description || '配置工作空间、显示偏好和通知选项。' }}</p></div><UBadge variant="subtle" color="neutral">仅保存到当前浏览器</UBadge></div>
    <UForm :state="state" :validate="validate" class="max-w-4xl space-y-6" @submit="save">
      <UCard :ui="{ body: 'p-5 sm:p-6 space-y-5', header: 'px-5 py-4 sm:px-6' }">
        <template #header><h3 class="section-title">基本信息</h3><p class="section-description">工作空间的名称和默认显示方式</p></template>
        <UFormField label="工作空间名称" name="name" required><UInput v-model="state.name" class="w-full max-w-lg" /></UFormField>
        <UFormField label="说明" name="description"><UTextarea v-model="state.description" class="w-full" :rows="2" /></UFormField>
        <div class="grid sm:grid-cols-2 gap-5"><UFormField label="显示时区" name="timezone"><USelect v-model="state.timezone" :items="demoTimezones" class="w-full" /></UFormField><UFormField label="日志保留天数" name="retention" hint="1–90 天"><UInputNumber v-model="state.retention" :min="1" :max="90" class="w-full" /></UFormField></div>
      </UCard>
      <UCard :ui="{ body: 'px-5 py-0 sm:px-6', header: 'px-5 py-4 sm:px-6' }">
        <template #header><h3 class="section-title">通知偏好</h3><p class="section-description">演示表单交互，尚未连接消息发送服务</p></template>
        <div class="setting-row"><div><label for="failure-notice" class="font-medium">任务失败提醒</label><p class="section-description">执行异常时接收通知</p></div><USwitch id="failure-notice" v-model="state.failureNotice" aria-label="任务失败提醒" /></div>
        <div class="setting-row"><div><label for="daily-digest" class="font-medium">每日运行摘要</label><p class="section-description">汇总应用状态与任务执行情况</p></div><USwitch id="daily-digest" v-model="state.dailyDigest" aria-label="每日运行摘要" /></div>
      </UCard>
      <div class="flex justify-between items-center gap-3 flex-wrap"><span class="text-xs text-muted">{{ savedAt ? `最近保存 ${savedAt}` : '修改后点击保存生效' }}</span><div class="flex gap-2"><UButton color="neutral" variant="outline" @click="Object.assign(state, demoSettings)">恢复默认</UButton><UButton type="submit" icon="i-lucide-check">保存设置</UButton></div></div>
    </UForm>
  </div>
</template>
