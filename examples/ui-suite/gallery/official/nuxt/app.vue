<script setup>
import { ref, computed } from 'vue';
import { en, zh_cn } from '@nuxt/ui/locale';
const locale = ref('zh');
const pack = computed(() => (locale.value === 'zh' ? zh_cn : en));
</script>

<template>
  <UApp :locale="pack">
    <div class="grid gap-3">
      <USelect
        v-model="locale"
        :items="[
          { label: '中文', value: 'zh' },
          { label: 'English', value: 'en' },
        ]"
        aria-label="语言"
      />
      <UPagination :total="40">
        <template #next
          ><UButton
            :aria-label="pack.messages.pagination.next"
            :label="pack.messages.pagination.next"
        /></template>
      </UPagination>
    </div>
  </UApp>
</template>
