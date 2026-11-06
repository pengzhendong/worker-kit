<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import pages from '../../../ui-demo/component-pages.json';
const route = useRoute();
const page = computed(() => pages.find(page => page.path === route.path)!);
const open = ref(false); const confirm = ref(false); const result = ref('尚未执行操作'); const long = ref(false);
watch(() => route.path, () => { open.value = false; confirm.value = false; long.value = false; result.value = '尚未执行操作'; });
</script>
<template>
  <div>
    <div class="page-heading"><div><h2>{{ page.title }}</h2><p>{{ page.description }}</p></div><UBadge color="neutral" variant="subtle">组件体验 · Nuxt UI</UBadge></div>
    <template v-if="page.key === 'dialogs'">
      <UCard><h3 class="section-title mb-4">弹窗与确认</h3><div class="flex gap-3 flex-wrap"><UButton @click="open = true">打开示例弹窗</UButton><UButton color="error" variant="outline" @click="confirm = true">打开确认弹窗</UButton></div><p role="status" class="mt-5 text-muted">{{ result }}</p></UCard>
      <UModal v-model:open="open" title="示例弹窗" description="这是 Nuxt UI 原生 Modal，可按 Escape 关闭。"><template #body><p>可以检查遮罩、圆角、动画、手机宽度与焦点恢复。</p></template><template #footer><UButton color="neutral" variant="outline" @click="open = false">取消</UButton><UButton @click="open = false; result = '已完成演示操作'">完成操作</UButton></template></UModal>
      <UModal v-model:open="confirm" title="确认演示操作" description="此操作只更新页面上的演示结果。"><template #body><UAlert color="warning" variant="subtle" title="请确认后继续" description="取消会保留当前结果。" /></template><template #footer><UButton color="neutral" variant="outline" @click="confirm = false">取消</UButton><UButton color="error" @click="confirm = false; result = '已确认演示操作'">确认操作</UButton></template></UModal>
    </template>
    <template v-else-if="page.key === 'layout'">
      <UCard class="mb-6"><div class="flex gap-4 items-center flex-wrap"><UButton color="neutral" variant="outline" @click="long = !long">{{ long ? '收起长内容' : '填充长内容' }}</UButton><span class="text-muted">拖动窗口宽度，或使用顶部手机预览；侧栏按钮由原生布局提供。</span></div></UCard>
      <div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4"><UCard v-for="i in (long ? 36 : 6)" :key="i"><h3 class="section-title">布局卡片 {{ i }}</h3><p class="mt-3 text-muted">窗口变窄时自动换列。展开长内容后，检查顶栏与侧栏的位置。</p></UCard></div>
    </template>
    <template v-else>
      <UCard class="mb-6"><div class="flex items-center justify-between gap-4"><div><h3 class="section-title">原生明暗主题</h3><p class="section-description">按钮与所有组件跟随主题变化。</p></div><UColorModeButton aria-label="切换示例主题" /></div></UCard>
      <div class="grid lg:grid-cols-2 gap-6"><UCard><h3 class="section-title mb-4">按钮层级</h3><div class="flex flex-wrap gap-3"><UButton>主要按钮</UButton><UButton variant="outline">描边按钮</UButton><UButton variant="soft">柔和按钮</UButton><UButton variant="ghost">文字按钮</UButton><UButton disabled>禁用按钮</UButton></div></UCard><UCard><h3 class="section-title mb-4">状态与表面</h3><div class="flex gap-3 mb-4"><UBadge color="success">成功</UBadge><UBadge color="warning">警告</UBadge><UBadge color="error">错误</UBadge><UBadge color="neutral">中性</UBadge></div><UAlert color="info" variant="subtle" title="信息提示" description="比较深浅背景下的文字、边框与状态色。" /></UCard></div>
    </template>
  </div>
</template>
