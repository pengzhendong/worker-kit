<script setup lang="ts">
import { useRoute } from 'vue-router';
const route = useRoute();
import { computed, ref } from 'vue';
import { resources, resourceTypes, type Resource } from '../../../ui-demo/data';
const toast = useToast();
const query = ref('');
const category = ref('all');
const uploadOpen = ref(false);
const files = ref<File[] | null>(null);
const selected = ref<Resource | null>(null);
const previewOpen = ref(false);
const filtered = computed(() => resources.value.filter(r => (category.value === 'all' || r.type === category.value) && r.name.toLowerCase().includes(query.value.toLowerCase())));
const categories = [{ label: '全部资源', value: 'all' }, { label: '图片', value: 'image' }, { label: '视频', value: 'video' }, { label: '音频', value: 'audio' }, { label: '文档', value: 'document' }];
function preview(resource: Resource) { selected.value = resource; previewOpen.value = true; }
function upload() {
  if (!files.value?.length) return;
  if (files.value.some(f => f.size > 100 * 1024 * 1024)) { toast.add({ title: '单个文件不能超过 100 MB', color: 'error' }); return; }
  for (const file of files.value) {
    const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'document';
    resources.value.unshift({ id: crypto.randomUUID(), name: file.name, type, size: file.size > 1048576 ? `${(file.size / 1048576).toFixed(1)} MB` : `${Math.ceil(file.size / 1024)} KB`, date: '刚刚', tag: '本地文件', local: true, url: URL.createObjectURL(file) });
  }
  toast.add({ title: `已加入 ${files.value.length} 个本地文件`, description: '文件仅在当前浏览器预览，没有上传到服务器。', color: 'success' });
  files.value = null; uploadOpen.value = false;
}
</script>

<template>
  <div>
    <div class="page-heading"><div><h2>{{ route.meta.title || '文件' }}</h2><p>{{ route.meta.description || '浏览图片、音视频和文档，统一管理应用中的资源。' }}</p></div><UButton icon="i-lucide-upload" @click="uploadOpen = true">添加文件</UButton></div>
    <div class="flex justify-between items-center gap-4 flex-wrap mb-6"><UTabs v-model="category" :items="categories" :content="false" variant="link" :ui="{ list: 'flex-wrap', trigger: 'px-3' }" /><UInput v-model="query" icon="i-lucide-search" placeholder="搜索资源…" aria-label="搜索资源" class="w-full sm:w-60" /></div>
    <div class="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
      <UCard v-for="resource in filtered" :key="resource.id" :ui="{ body: 'p-0', root: 'overflow-hidden' }">
        <button class="resource-preview relative w-full group" :aria-label="`预览${resource.name}`" @click="preview(resource)">
          <img v-if="resource.type === 'image' && resource.url" :src="resource.url" :alt="resource.name" class="transition-transform group-hover:scale-105" />
          <span v-else class="size-16 rounded-2xl flex items-center justify-center" :class="`tone-${resourceTypes[resource.type].color}`"><UIcon :name="resourceTypes[resource.type].icon" class="size-8" /></span>
          <UBadge class="absolute top-3 left-3 bg-default/95" color="neutral" variant="outline" size="sm">{{ resourceTypes[resource.type].label }}</UBadge>
          <span class="absolute bottom-3 right-3 size-7 flex items-center justify-center rounded-lg bg-default/90 text-muted"><UIcon name="i-lucide-expand" class="size-3.5" /></span>
        </button>
        <div class="p-4"><button class="font-medium text-left truncate w-full hover:text-primary" @click="preview(resource)">{{ resource.name }}</button><p class="text-xs text-muted mt-1">{{ resource.size }}<span class="mx-2">·</span>{{ resource.date }}</p><div class="flex justify-between items-center mt-4"><span class="text-xs text-muted">{{ resource.tag }}</span><UButton :icon="resource.url ? 'i-lucide-download' : 'i-lucide-eye'" :aria-label="resource.url ? `下载${resource.name}` : `查看${resource.name}`" :to="resource.url" :download="resource.url ? resource.name : undefined" color="neutral" variant="ghost" size="xs" @click="!resource.url && preview(resource)" /></div></div>
      </UCard>
    </div>
    <UEmpty v-if="!filtered.length" icon="i-lucide-folder-search" title="没有匹配的资源" description="调整搜索条件，或添加一个本地文件试试。" class="my-12" />
    <p class="text-xs text-muted mt-6">共 {{ filtered.length }} 个资源 · 示例媒体与本地文件可预览，文件不会发送到服务器。</p>
    <UModal v-model:open="uploadOpen" title="添加本地文件" description="体验文件选择和预览，刷新页面后恢复示例。">
      <template #body><UFileUpload v-model="files" multiple label="拖入文件，或点击选择" description="图片、音视频、文档 · 单个文件不超过 100 MB" class="w-full min-h-48" /></template>
      <template #footer><div class="flex justify-end gap-2 w-full"><UButton color="neutral" variant="outline" @click="uploadOpen = false">取消</UButton><UButton :disabled="!files?.length" @click="upload">加入资源库</UButton></div></template>
    </UModal>
    <UModal v-model:open="previewOpen" :title="selected?.name" :description="selected ? `${selected.size} · ${selected.tag}` : undefined" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body><div v-if="selected">
        <img v-if="selected.type === 'image' && selected.url" :src="selected.url" :alt="selected.name" class="w-full max-h-[60vh] object-contain rounded-lg" />
        <video v-else-if="selected.type === 'video' && selected.url" :src="selected.url" controls preload="metadata" class="w-full rounded-lg" />
        <audio v-else-if="selected.type === 'audio' && selected.url" :src="selected.url" controls preload="metadata" class="w-full my-6" />
        <UAlert v-else icon="i-lucide-file-text" title="文档资源" :description="selected.local ? '本地文档可通过卡片上的下载按钮保存。' : '这是一条文档元数据示例，用来展示资源分类与详情布局。'" color="neutral" variant="subtle" />
      </div></template>
    </UModal>
  </div>
</template>
