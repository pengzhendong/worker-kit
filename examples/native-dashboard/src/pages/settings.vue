<script setup lang="ts">
import { reactive, watch, ref } from 'vue';
import { useToast } from '@nuxt/ui/composables';
import { api, path, useResource, isRequestCancelled } from '../api';
const { data, busy, error, refresh } = useResource<{
  values: { siteTitle: string; refreshSeconds: number; maintenance: boolean };
}>('/settings');
const form = reactive({
    siteTitle: '',
    refreshSeconds: 30,
    maintenance: false,
  }),
  saving = ref(false),
  failure = ref('');
const toast = useToast();
watch(data, (value) => {
  if (value) Object.assign(form, value.values);
});
async function save() {
  saving.value = true;
  failure.value = '';
  try {
    const saved = await api<{ values: typeof form }>(path('/settings'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        values: { ...form, refreshSeconds: Number(form.refreshSeconds) },
      }),
    });
    data.value = saved;
    toast.add({ title: '设置已保存', color: 'success' });
  } catch (error) {
    if (!isRequestCancelled(error))
      failure.value = error instanceof Error ? error.message : '保存失败';
  } finally {
    saving.value = false;
  }
}
</script>
<template>
  <div class="page-heading">
    <div>
      <h1>KV 设置</h1>
      <p>保存业务配置；密码和令牌使用 Workers Secrets。</p>
    </div>
    <UButton color="neutral" variant="outline" :loading="busy" @click="refresh"
      >刷新设置</UButton
    >
  </div>
  <UAlert
    v-if="error || failure"
    color="error"
    :description="error || failure"
    class="mb-5"
  /><UCard v-if="data"
    ><UForm :state="form" class="space-y-5 max-w-xl" @submit="save"
      ><UFormField label="站点名称" name="siteTitle"
        ><UInput
          v-model="form.siteTitle"
          required
          :maxlength="80"
          class="w-full" /></UFormField
      ><UFormField label="刷新间隔（秒）" name="refreshSeconds"
        ><UInput
          v-model="form.refreshSeconds"
          type="number"
          :min="1"
          :max="10000"
          required /></UFormField
      ><USwitch v-model="form.maintenance" label="维护模式" /><UButton
        type="submit"
        :loading="saving"
        >保存设置</UButton
      ></UForm
    ></UCard
  >
</template>
