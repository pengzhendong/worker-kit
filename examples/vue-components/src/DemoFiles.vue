<script setup lang="ts">
import { computed, ref, watch } from 'vue';

type Sample = { name: string; type: string; url: string };
defineProps<{ samples?: Sample[] }>();
const sample = ref<Sample>();
const failed = ref(false);

const file = ref<File | null>(null);
const localSource = ref('');
const source = computed(() =>
  sample.value
    ? import.meta.env.BASE_URL + sample.value.url
    : localSource.value,
);
const name = computed(() => sample.value?.name ?? file.value?.name);
const type = computed(
  () => sample.value?.type ?? file.value?.type.split('/')[0],
);
watch(file, (value, _, cleanup) => {
  const url = value ? URL.createObjectURL(value) : '';
  localSource.value = url;
  if (url) cleanup(() => URL.revokeObjectURL(url));
});
function select(value: File | null) {
  failed.value = false;
  sample.value = undefined;
  file.value = value;
}
function selectSample(item: Sample) {
  select(null);
  sample.value = item;
}
function onInput(event: Event) {
  const input = event.target as HTMLInputElement;
  const value = input.files?.[0];
  if (value) select(value);
  input.value = '';
}
</script>

<template>
  <section class="demo-files">
    <h1>文件</h1>
    <p>选择图片、音频或视频，在当前浏览器预览。</p>
    <slot name="picker" :file="file" :select="select">
      <label
        >选择文件
        <input type="file" accept="image/*,audio/*,video/*" @change="onInput"
      /></label>
    </slot>
    <div v-if="samples?.length" class="demo-file-samples" aria-label="示例文件">
      <slot
        v-for="item in samples"
        :key="item.url"
        name="sample"
        :sample="item"
        :active="item.url === sample?.url"
        :select="() => selectSample(item)"
      >
        <button
          type="button"
          :aria-pressed="item.url === sample?.url"
          @click="selectSample(item)"
        >
          预览{{ item.name }}
        </button>
      </slot>
    </div>
    <template v-if="name && source">
      <p v-if="samples?.length" role="status">正在预览：{{ name }}</p>
      <p v-if="failed" role="alert">无法加载此文件，请选择其他文件。</p>
      <img
        v-else-if="type === 'image'"
        :src="source"
        :alt="name"
        @error="failed = true"
      />
      <audio
        v-else-if="type === 'audio'"
        :src="source"
        controls
        @error="failed = true"
      />
      <video
        v-else-if="type === 'video'"
        :src="source"
        controls
        playsinline
        @error="failed = true"
      />
      <p v-else role="alert">请选择支持预览的图片、音频或视频。</p>
    </template>
  </section>
</template>

<style scoped>
.demo-file-samples {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-block: 16px;
}
</style>
