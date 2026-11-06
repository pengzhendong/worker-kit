<script setup lang="ts">
import { ref } from 'vue';
import { useResource, formatTime } from '../api';
const cursors = ref<(string|undefined)[]>([undefined]);
const { data, busy, error, refresh } = useResource<{ items: { id:string; at:string; actor:string; action:string; target:string }[]; cursor:string|null }>(() => '/audit' + (cursors.value.at(-1) ? '?cursor=' + encodeURIComponent(cursors.value.at(-1)!) : ''));
const columns = [{ accessorKey: 'at', header: '时间' }, { accessorKey: 'actor', header: '操作人' }, { accessorKey: 'action', header: '操作' }, { accessorKey: 'target', header: '对象' }];
function next() { if(data.value?.cursor) cursors.value.push(data.value.cursor); }
</script>
<template><div class="page-heading"><div><h1>操作审计</h1><p>最近 30 天的安全操作元数据，尽力写入，不包含密码、令牌或配置值。</p></div><UButton :loading="busy" @click="refresh">刷新记录</UButton></div><UAlert v-if="error" color="error" :description="error" /><UCard :ui="{ body: 'overflow-auto' }"><UTable :data="data?.items || []" :columns="columns" :loading="busy" empty="暂无操作记录"><template #at-cell="{ row }">{{ formatTime(row.original.at) }}</template></UTable><div class="flex justify-end gap-3 mt-5"><UButton :disabled="cursors.length === 1 || busy" @click="cursors.pop()">上一页</UButton><UButton :disabled="!data?.cursor || busy" @click="next">下一页</UButton></div></UCard></template>
