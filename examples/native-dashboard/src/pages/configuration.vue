<script setup lang="ts">
import { useResource } from '../api';
const { data, error, busy, refresh } = useResource<{ storage: string; sessionHours: number; audit: string; permissions: string[] }>('/configuration');
</script>
<template><div class="page-heading"><div><h1>服务配置</h1><p>轻量 Worker 的存储、会话与授权边界。</p></div><UButton :loading="busy" @click="refresh">刷新配置</UButton></div><UAlert v-if="error" color="error" :description="error" /><UCard v-else-if="data"><dl class="details-list"><div><dt>存储</dt><dd>{{ data.storage }}</dd></div><div><dt>会话有效期</dt><dd>{{ data.sessionHours }} 小时，可注销；凭据变更会使已有会话失效。</dd></div><div><dt>审计记录</dt><dd>{{ data.audit }}</dd></div><div><dt>API Key 权限</dt><dd>{{ data.permissions.join('、') }}，不能用于管理员登录。</dd></div></dl></UCard></template>
