<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Activity, Blocks, Menu, Moon, Sun } from '@lucide/vue';
import Workspace from './ElementWorkspace.vue';
const logo = `${import.meta.env.BASE_URL}favicon.svg`;
const page = ref('workspace'),
  open = ref(false),
  dark = ref(false),
  example = ref(false);
const select = (key: string) => {
  page.value = key;
  open.value = false;
  document.querySelector('[data-library-scroll]')?.scrollTo({ top: 0 });
};
watch(dark, (value) =>
  document.documentElement.classList.toggle('dark', value),
);
</script>
<template>
  <ElContainer class="library-shell">
    <ElAside width="232px" class="library-sidebar library-desktop-sidebar">
      <div class="library-brand"><img :src="logo" alt="" />WorkerKit</div>
      <ElMenu :default-active="page" @select="select"
        ><ElMenuItem index="workspace"
          ><ElIcon><Activity /></ElIcon><span>业务工作台</span></ElMenuItem
        ><ElMenuItem index="components"
          ><ElIcon><Blocks /></ElIcon><span>组件体验</span></ElMenuItem
        ></ElMenu
      >
    </ElAside>
    <ElContainer class="library-scroll">
      <ElHeader class="library-header" data-library-header
        ><ElButton
          class="library-mobile-toggle"
          aria-label="打开侧边栏"
          @click="open = true"
          ><Menu :size="18" /></ElButton
        ><strong>{{ page === 'workspace' ? '业务工作台' : '组件体验' }}</strong
        ><ElTag>Element Plus</ElTag
        ><ElButton
          :aria-label="dark ? '切换浅色主题' : '切换深色主题'"
          @click="dark = !dark"
          ><Sun v-if="dark" :size="17" /><Moon v-else :size="17" /></ElButton
      ></ElHeader>
      <ElMain class="library-content" data-library-scroll
        ><Workspace v-if="page === 'workspace'" />
        <div v-else>
          <div class="workspace-toolbar">
            <div>
              <h1>组件体验</h1>
              <p>Element Plus 原生组件；此页为本地演示数据。</p>
            </div>
          </div>
          <ElCard
            ><ElSpace wrap
              ><ElButton type="primary" @click="example = true"
                >打开原生弹窗</ElButton
              ><ElButton @click="ElMessage.success('Element Plus 原生通知')"
                >显示通知</ElButton
              ><ElSwitch v-model="dark" active-text="深色主题" /></ElSpace
            ><ElTable
              :data="[{ name: '演示任务', status: '已就绪' }]"
              style="margin-top: 20px"
              ><ElTableColumn prop="name" label="名称" /><ElTableColumn
                prop="status"
                label="状态" /></ElTable></ElCard
          ><ElDialog
            v-model="example"
            title="原生弹窗"
            width="min(480px, calc(100vw - 32px))"
            align-center
            ><p>通过 Element Plus Dialog 管理焦点、遮罩和键盘交互。</p>
            <template #footer
              ><ElButton @click="example = false">关闭</ElButton></template
            ></ElDialog
          >
        </div></ElMain
      >
    </ElContainer>
    <ElDrawer v-model="open" title="WorkerKit" direction="ltr" size="280px"
      ><ElMenu :default-active="page" @select="select"
        ><ElMenuItem index="workspace">业务工作台</ElMenuItem
        ><ElMenuItem index="components">组件体验</ElMenuItem></ElMenu
      ></ElDrawer
    >
  </ElContainer>
</template>
