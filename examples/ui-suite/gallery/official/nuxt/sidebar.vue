<script setup>
import { ref } from 'vue';
const active = ref('概览');
</script>

<template>
  <div
    class="grid min-h-52 grid-cols-[minmax(6rem,10rem)_1fr] overflow-hidden rounded-lg border border-default"
  >
    <USidebar
      title="工作区"
      collapsible="none"
      class="w-full border-r border-default"
    >
      <UButton
        v-for="label in ['概览', '项目', '设置']"
        :key="label"
        :label="label"
        :variant="active === label ? 'soft' : 'ghost'"
        @click="active = label"
      />
    </USidebar>
    <p class="p-4" aria-live="polite">{{ active }}</p>
  </div>
</template>
