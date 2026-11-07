<script setup>
import { ref } from 'vue';
import { VSplitBtn } from 'vuetify/labs/components';
const state = ref('');
</script>
<template>
  <div>
    <VSplitBtn text="保存" @click="state = '已保存'">
      <template #menu><v-list><v-list-item title="另存为" @click="state = '已另存'" /></v-list></template>
    </VSplitBtn>
    <p role="status">{{ state }}</p>
  </div>
</template>
