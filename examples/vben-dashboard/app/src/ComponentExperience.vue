<script setup>
import { ref, watch } from 'vue';
import { updatePreferences, usePreferences } from '@vben/preferences';
const props = defineProps({ kind: String });
const open = ref(false); const confirm = ref(false); const result = ref('尚未执行操作'); const long = ref(false);
const { isDark } = usePreferences();
watch(() => props.kind, () => { open.value = false; confirm.value = false; long.value = false; result.value = '尚未执行操作'; });
</script>
<template>
  <template v-if="kind === 'dialogs'">
    <ACard title="弹窗与确认"><ASpace wrap><AButton type="primary" @click="open = true">打开示例弹窗</AButton><AButton danger @click="confirm = true">打开确认弹窗</AButton></ASpace><p role="status" class="text-muted-foreground mt-5">{{ result }}</p></ACard>
    <AModal v-model:open="open" title="示例弹窗" :footer="null"><p class="my-6">这是 Ant Design Vue 原生 Modal，搭配 Vben 的布局与主题。</p><div class="flex justify-end gap-2"><AButton @click="open = false">取消</AButton><AButton type="primary" @click="open = false; result = '已完成演示操作'">完成操作</AButton></div></AModal>
    <AModal v-model:open="confirm" title="确认演示操作" :footer="null"><AAlert type="warning" message="此操作只更新演示结果，取消会保留当前结果。" class="my-6" /><div class="flex justify-end gap-2"><AButton @click="confirm = false">取消</AButton><AButton danger type="primary" @click="confirm = false; result = '已确认演示操作'">确认操作</AButton></div></AModal>
  </template>
  <template v-else-if="kind === 'layout'">
    <ACard class="mb-6"><ASpace wrap><AButton @click="long = !long">{{ long ? '收起长内容' : '填充长内容' }}</AButton><span class="text-muted-foreground">调整窗口宽度，检查多列卡片、固定导航和手机抽屉。顶部偏好设置可切换原生布局。</span></ASpace></ACard>
    <div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4"><ACard v-for="i in (long ? 36 : 6)" :key="i" :title="'布局卡片 ' + i"><p class="text-muted-foreground">窄屏自动换列，长内容用于检查顶栏、侧栏与内容滚动。</p></ACard></div>
  </template>
  <template v-else>
    <ACard class="mb-6"><div class="flex justify-between gap-4 items-center"><div><h2 class="demo-section-title">原生明暗主题</h2><p class="text-muted-foreground">Vben 原生偏好面板还能调整布局、主题和标签页。</p></div><AButton @click="updatePreferences({ theme: { mode: isDark ? 'light' : 'dark' } })">切换示例主题</AButton></div></ACard>
    <div class="grid lg:grid-cols-2 gap-6"><ACard title="按钮层级"><ASpace wrap><AButton type="primary">主要按钮</AButton><AButton>次要按钮</AButton><AButton type="dashed">虚线按钮</AButton><AButton type="text">文字按钮</AButton><AButton disabled>禁用按钮</AButton></ASpace></ACard><ACard title="状态与表面"><ASpace class="mb-5"><ATag color="success">成功</ATag><ATag color="warning">警告</ATag><ATag color="error">错误</ATag><ATag>中性</ATag></ASpace><AAlert type="info" message="比较深浅背景下的文字、边框与状态色。" show-icon /></ACard></div>
  </template>
</template>
