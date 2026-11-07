<script setup>
import { ref } from 'vue';
const value = ref('<h2>Hello World</h2><p>这段内容可以直接编辑。</p>');
</script>
<template>
  <UEditor v-model="value" content-type="html" class="min-h-32 rounded-lg border border-default" />
</template>
