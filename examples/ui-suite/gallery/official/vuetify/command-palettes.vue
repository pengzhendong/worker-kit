<script setup>
import { ref } from 'vue';
import { VCommandPalette } from 'vuetify/labs/components';
const open = ref(false);
const items = ['概览', '项目', '设置'].map((title, value) => ({ title, value }));
</script>
<template>
  <div>
    <v-btn @click="open = true">打开命令面板</v-btn>
    <VCommandPalette v-model="open" :items="items" />
  </div>
</template>
