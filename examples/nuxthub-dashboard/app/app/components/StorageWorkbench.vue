<script setup lang="ts">
import {
  createApiClient,
  isRequestCancelled,
  type createSessionScope,
} from '@pengzhendong/worker-kit/client';
import type { HubSnapshot } from '../../shared/types/storage';
const props = defineProps<{ scope: ReturnType<typeof createSessionScope> }>();
const root = useRuntimeConfig().app.baseURL;
const api = createApiClient({ baseUrl: root + 'api', scope: props.scope });
const snapshot = shallowRef<HubSnapshot | null>(null),
  busy = ref(false),
  error = ref('');
const title = ref(''),
  label = ref(''),
  text = ref(''),
  lifetime = new AbortController();
const toast = useToast();
onScopeDispose(() => lifetime.abort());
async function refresh() {
  const version = props.scope.version;
  busy.value = true;
  error.value = '';
  try {
    snapshot.value = await api<HubSnapshot>('/probe', {
      signal: lifetime.signal,
    });
    label.value = snapshot.value.label;
  } catch (cause) {
    if (!isRequestCancelled(cause))
      error.value = cause instanceof Error ? cause.message : '读取失败';
  } finally {
    if (version === props.scope.version) busy.value = false;
  }
}
async function change(path: string, method: string, body: object) {
  const version = props.scope.version;
  busy.value = true;
  error.value = '';
  try {
    await api('/' + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: lifetime.signal,
    });
    title.value = '';
    text.value = '';
    toast.add({ title: '操作完成', color: 'success' });
    await refresh();
  } catch (cause) {
    if (!isRequestCancelled(cause))
      error.value = cause instanceof Error ? cause.message : '操作失败';
  } finally {
    if (version === props.scope.version) busy.value = false;
  }
}
const columns = [
  { accessorKey: 'title', header: '标题' },
  { accessorKey: 'createdAt', header: '创建时间' },
  { id: 'actions', header: '操作' },
];
const capabilities = {
  db: {
    title: '保存业务数据',
    description: '例如笔记、订单、任务记录，保存在 D1 数据库。',
  },
  kv: {
    title: '保存应用配置',
    description: '例如站点名称、功能开关，保存在 KV。',
  },
  blob: {
    title: '保存文件',
    description: '例如图片、附件，本例用文本文件演示 R2。',
  },
  cache: {
    title: '缓存计算结果',
    description: '例如统计结果，减少重复计算和查询。',
  },
};
onMounted(refresh);
</script>
<template>
  <section>
    <div class="flex justify-end mb-5">
      <UButton :loading="busy" @click="refresh">刷新</UButton>
    </div>
    <UAlert
      v-if="error"
      color="error"
      :description="error"
      class="mb-5"
    /><UAlert
      title="怎么体验？"
      description="添加笔记、保存标签和文本文件，再刷新验证数据是否保留。操作会写入演示站真实存储，试完可以删除。"
      class="mb-6"
    />
    <template v-if="snapshot"
      ><div class="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <UCard v-for="(driver, key) in snapshot.drivers" :key="key"
          ><strong>{{
            capabilities[key as keyof typeof capabilities].title
          }}</strong>
          <p class="text-sm text-muted mt-2">
            {{ capabilities[key as keyof typeof capabilities].description }}
          </p>
          <p class="text-xs text-muted mt-3">{{ driver }}</p></UCard
        >
      </div>
      <UCard class="mb-6"
        ><template #header
          ><h2>笔记记录 · 数据库</h2>
          <p class="text-sm text-muted mt-2">
            添加一条笔记，刷新后检查是否还在；试完可以删除。
          </p></template
        >
        <form
          class="flex gap-3 mb-5"
          @submit.prevent="change('notes', 'POST', { title })"
        >
          <UInput
            v-model="title"
            aria-label="记录标题"
            placeholder="输入记录标题"
            required
            :maxlength="80"
            class="flex-1"
          /><UButton type="submit" :disabled="busy">添加记录</UButton>
        </form>
        <UTable :data="snapshot.notes" :columns="columns"
          ><template #actions-cell="{ row }"
            ><UButton
              color="error"
              variant="ghost"
              :disabled="busy"
              @click="change('notes', 'DELETE', { id: row.original.id })"
              >删除</UButton
            ></template
          ></UTable
        ></UCard
      >
      <div class="grid lg:grid-cols-2 gap-6 mb-6">
        <UCard
          ><template #header
            ><h2>应用配置 · KV</h2>
            <p class="text-sm text-muted mt-2">
              试着保存一个名称，刷新后检查输入框。跨节点同步可能稍有延迟。
            </p></template
          >
          <form
            class="space-y-4"
            @submit.prevent="change('label', 'PUT', { label })"
          >
            <UFormField label="工作台标签"
              ><UInput
                v-model="label"
                :maxlength="80"
                class="w-full" /></UFormField
            ><UButton type="submit" :disabled="busy">保存标签</UButton>
          </form></UCard
        ><UCard
          ><template #header><h2>缓存 · Nitro / KV</h2></template>
          <p class="text-muted mb-3">
            示例结果缓存 60 秒；不同边缘节点首次加载时可能暂时不同。
          </p>
          <code>{{ snapshot.cache.generatedAt }}</code></UCard
        >
      </div>
      <UCard
        ><template #header
          ><h2>文件存储 · R2</h2>
          <p class="text-sm text-muted mt-2">
            输入一段文字，保存成一份真实文本文件；下方会显示文件名和大小。
          </p></template
        >
        <form
          class="flex gap-3 mb-5"
          @submit.prevent="change('files', 'POST', { text })"
        >
          <UInput
            v-model="text"
            aria-label="文件文本"
            placeholder="输入示例文本"
            :maxlength="4096"
            required
            class="flex-1"
          /><UButton type="submit" :disabled="busy">保存文件</UButton>
        </form>
        <div
          v-for="file in snapshot.files"
          :key="file.pathname"
          class="flex gap-3 items-center justify-between border-b border-default py-3"
        >
          <code class="text-xs break-all"
            >{{ file.pathname }} · {{ file.size }} B</code
          ><UButton
            color="error"
            variant="ghost"
            :disabled="busy"
            @click="change('files', 'DELETE', { pathname: file.pathname })"
            >删除文件</UButton
          >
        </div>
        <p v-if="!snapshot.files.length" class="text-muted">
          暂无示例文件。
        </p></UCard
      ></template
    >
  </section>
</template>
