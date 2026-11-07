<script setup>
import { Edit, Search, Share } from '@element-plus/icons-vue';
</script>
<template>
  <div class="gallery-row">
    <ElIcon :size="20"><Edit /></ElIcon>
    <ElIcon :size="25" color="var(--el-color-primary)"><Search /></ElIcon>
    <ElIcon :size="28"><Share /></ElIcon>
  </div>
</template>
