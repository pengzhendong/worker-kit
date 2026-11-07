<script setup>
import { computed, ref } from 'vue';
import { en, zh_cn } from '@nuxt/ui/locale';

const locales = [zh_cn, en];
const locale = ref(zh_cn.code);
const currentLocale = computed(() =>
  locales.find((pack) => pack.code === locale.value),
);
</script>

<template>
  <UApp :locale="currentLocale">
    <div class="grid gap-3 justify-items-start">
      <ULocaleSelect
        v-model="locale"
        :locales="locales"
        aria-label="选择语言"
      />
      <UPagination :total="40">
        <template #next
          ><UButton
            :aria-label="currentLocale.messages.pagination.next"
            :label="currentLocale.messages.pagination.next"
        /></template>
      </UPagination>
    </div>
  </UApp>
</template>
