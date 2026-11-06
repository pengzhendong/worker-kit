<script setup>
import { useRoute } from 'vue-router';
const route = useRoute();
</script>
<template><div class="layout-footer flex-wrap gap-2"><span>WorkerKit · PrimeVue Sakai</span><span class="text-muted-color text-xs ml-auto">{{ route.path === '/workspace' ? '任务与诊断 · 服务端数据' : '演示数据 · 未连接生产服务' }}</span></div></template>
