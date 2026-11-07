<script setup>
import { ref } from 'vue';
const rtl = ref(false);
</script>
<template>
  <div>
    <v-switch v-model="rtl" label="从右到左布局" hide-details />
    <v-locale-provider :rtl="rtl">
      <v-text-field label="名称" prepend-icon="$info" />
    </v-locale-provider>
  </div>
</template>
