<script setup>
import { ref } from 'vue';
import { VMap } from 'vuetify/labs/VMap';

const selected = ref(null);
const regions = { north: '北区', west: '西区', east: '东区' };
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 140">
  <path id="north" aria-label="北区" d="M22 24 115 5 204 16 258 52 188 68 90 62Z"/>
  <path id="west" aria-label="西区" d="M22 28 89 66 147 71 124 128 44 119 8 74Z"/>
  <path id="east" aria-label="东区" d="M151 71 191 73 258 56 272 92 210 128 129 131Z"/>
</svg>`;
</script>

<template>
  <div>
    <VMap
      v-model="selected"
      :svg="svg"
      label="园区分区图"
      selectable
      class="local-map"
    >
      <template #default="{ zoomIn, zoomOut, resetZoom }">
        <div class="d-flex flex-wrap ga-1 position-absolute ma-2">
          <v-btn size="x-small" @click="zoomIn">放大</v-btn>
          <v-btn size="x-small" @click="zoomOut">缩小</v-btn>
          <v-btn size="x-small" @click="resetZoom">重置</v-btn>
        </div>
      </template>
    </VMap>
    <p class="mt-2" aria-live="polite">
      {{ selected ? regions[selected] : '请选择一个区域' }}
    </p>
  </div>
</template>

<style scoped>
.local-map {
  height: 13rem;
}
</style>
