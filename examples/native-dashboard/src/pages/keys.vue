<script setup lang="ts">
import { ref } from 'vue';
import { useToast } from '@nuxt/ui/composables';
import type { ApiKeyInfo } from '@pengzhendong/worker-kit/contracts';
import { api, path, useResource, isRequestCancelled, formatTime } from '../api';
const { data, busy, error, refresh } = useResource<{ items: ApiKeyInfo[] }>('/keys');
const name = ref(''), days = ref(30), token = ref(''), failure = ref(''), saving = ref(false), selected = ref<ApiKeyInfo>(), open = ref(false);
const toast = useToast();
async function issue() {
 saving.value = true; failure.value = ''; token.value = '';
 try { const result = await api<{ token: string }>(path('/keys'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.value, expiresInDays: Number(days.value), permissions: ['runtime:read'] }) }); token.value = result.token; name.value = ''; refresh(); }
 catch (error) { if (!isRequestCancelled(error)) failure.value = error instanceof Error ? error.message : '签发失败'; } finally { saving.value = false; }
}
async function revoke() {
 if (!selected.value) return; saving.value = true;
 try { await api(path('/keys/' + selected.value.id), { method: 'DELETE' }); open.value = false; toast.add({ title: '访问密钥已撤销', color: 'success' }); refresh(); }
 catch (error) { if (!isRequestCancelled(error)) failure.value = error instanceof Error ? error.message : '撤销失败'; } finally { saving.value = false; }
}
const columns = [{ accessorKey: 'name', header: '名称' }, { accessorKey: 'prefix', header: '前缀' }, { accessorKey: 'expiresAt', header: '有效期' }, { accessorKey: 'revokedAt', header: '状态' }, { id: 'actions', header: '操作' }];
</script>
<template><div class="page-heading"><div><h1>访问密钥</h1><p>仅授予运行状态读取权限；完整令牌只显示一次。</p></div><UButton :loading="busy" color="neutral" variant="outline" @click="refresh">刷新密钥</UButton></div><UAlert v-if="error || failure" color="error" :description="error || failure" class="mb-5" /><UCard class="mb-5"><form class="flex items-end flex-wrap gap-4" @submit.prevent="issue"><UFormField label="名称"><UInput v-model="name" required :maxlength="80" /></UFormField><UFormField label="有效期（天）"><UInput v-model="days" type="number" :min="1" :max="365" required /></UFormField><UButton type="submit" :loading="saving">签发密钥</UButton></form><UAlert v-if="token" title="请保存令牌，关闭后无法再次查看" class="mt-5"><template #description><code class="break-all" data-issued-token>{{ token }}</code><UButton class="mt-3" color="neutral" variant="outline" @click="token = ''">已保存，关闭</UButton></template></UAlert></UCard><UCard :ui="{ body: 'p-0 sm:p-0' }"><UTable :data="data?.items || []" :columns="columns" :loading="busy" empty="暂无访问密钥"><template #expiresAt-cell="{ row }">{{ formatTime(row.original.expiresAt) }}</template><template #revokedAt-cell="{ row }"><UBadge :color="row.original.revokedAt ? 'neutral' : Date.parse(row.original.expiresAt) <= Date.now() ? 'warning' : 'success'">{{ row.original.revokedAt ? '已撤销' : Date.parse(row.original.expiresAt) <= Date.now() ? '已过期' : '有效' }}</UBadge></template><template #actions-cell="{ row }"><UButton v-if="!row.original.revokedAt" color="error" variant="ghost" @click="selected = row.original; open = true">撤销</UButton></template></UTable></UCard><UModal v-model:open="open" title="撤销访问密钥？" description="撤销后客户端需要更换令牌。KV 的跨区域同步可能存在短暂延迟。"><template #footer><UButton color="neutral" variant="outline" @click="open = false">取消</UButton><UButton color="error" :loading="saving" @click="revoke">确认撤销</UButton></template></UModal></template>
