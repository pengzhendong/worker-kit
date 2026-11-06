<script setup>
import { ref, watch } from 'vue';
import { useLayout } from './layout/composables/layout';
const props = defineProps({ kind: String });
const open = ref(false); const confirm = ref(false); const result = ref('尚未执行操作'); const long = ref(false);
const { toggleDarkMode } = useLayout();
watch(() => props.kind, () => { open.value = false; confirm.value = false; long.value = false; result.value = '尚未执行操作'; });
</script>
<template>
  <template v-if="kind === 'dialogs'">
    <div class="card"><h2>弹窗与确认</h2><div class="flex flex-wrap gap-3 mt-5"><Button label="打开示例弹窗" @click="open = true" /><Button label="打开确认弹窗" severity="danger" outlined @click="confirm = true" /></div><p role="status" class="text-muted-color mt-5">{{ result }}</p></div>
    <Dialog v-model:visible="open" modal header="示例弹窗" :style="{ width: '520px', maxWidth: 'calc(100vw - 32px)' }"><p>这是 PrimeVue 原生 Dialog，可检查遮罩、动画、窄屏与 Escape 关闭。</p><template #footer><Button label="取消" severity="secondary" outlined @click="open = false" /><Button label="完成操作" @click="open = false; result = '已完成演示操作'" /></template></Dialog>
    <Dialog v-model:visible="confirm" modal header="确认演示操作" :style="{ width: '480px', maxWidth: 'calc(100vw - 32px)' }"><Message severity="warn">此操作只更新演示结果，取消会保留当前结果。</Message><template #footer><Button label="取消" severity="secondary" outlined @click="confirm = false" /><Button label="确认操作" severity="danger" @click="confirm = false; result = '已确认演示操作'" /></template></Dialog>
  </template>
  <template v-else-if="kind === 'layout'">
    <div class="card component-intro"><div class="flex gap-4 items-center flex-wrap"><Button :label="long ? '收起长内容' : '填充长内容'" severity="secondary" outlined @click="long = !long" /><span class="text-muted-color">调整窗口宽度，或使用顶部手机预览；原生侧栏支持导航与收起。</span></div></div>
    <div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4"><div v-for="i in (long ? 36 : 6)" :key="i" class="card"><h2>布局卡片 {{ i }}</h2><p class="text-muted-color mt-4">窄屏自动换列，长内容用于检查顶栏、侧栏与内容滚动。</p></div></div>
  </template>
  <template v-else>
    <div class="card component-intro"><div class="flex justify-between gap-4 items-center"><div><h2>原生明暗主题</h2><p class="text-muted-color mt-3">顶部调色板还可选择 Aura、Lara、Nora 和品牌色。</p></div><Button class="component-theme-toggle" label="切换示例主题" icon="pi pi-moon" severity="secondary" outlined @click="toggleDarkMode" /></div></div>
    <div class="grid lg:grid-cols-2 gap-6"><div class="card"><h2>按钮层级</h2><div class="flex flex-wrap gap-3 mt-5"><Button label="主要按钮" /><Button label="描边按钮" outlined /><Button label="柔和按钮" severity="secondary" /><Button label="文字按钮" text /><Button label="禁用按钮" disabled /></div></div><div class="card"><h2>状态与表面</h2><div class="flex gap-3 mt-5 mb-4"><Tag value="成功" severity="success" /><Tag value="警告" severity="warn" /><Tag value="错误" severity="danger" /><Tag value="中性" severity="secondary" /></div><Message severity="info">比较深浅背景下的文字、边框与状态色。</Message></div></div>
  </template>
</template>

<style scoped>
.component-theme-toggle { flex-shrink: 0; white-space: nowrap; }
.card.component-intro { margin-bottom: 24px !important; }
</style>
