<script setup lang="ts">
import { h, ref, watch } from 'vue';
import { Activity, Blocks, Menu, Moon, Sun } from '@lucide/vue';
import {
  NAlert,
  NButton,
  NCard,
  NConfigProvider,
  NDataTable,
  NDrawer,
  NDrawerContent,
  NIcon,
  NLayout,
  NLayoutSider,
  NMenu,
  NModal,
  NSpace,
  NTag,
  darkTheme,
  zhCN,
  dateZhCN,
} from 'naive-ui';
import Workspace from './NaiveWorkspace.vue';
const logo = `${import.meta.env.BASE_URL}favicon.svg`;
const page = ref('workspace'),
  open = ref(false),
  dark = ref(false),
  example = ref(false);
const menu = [
  {
    key: 'workspace',
    label: '业务工作台',
    icon: () => h(NIcon, null, { default: () => h(Activity) }),
  },
  {
    key: 'components',
    label: '组件体验',
    icon: () => h(NIcon, null, { default: () => h(Blocks) }),
  },
];
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
  <NConfigProvider
    :theme="dark ? darkTheme : null"
    :locale="zhCN"
    :date-locale="dateZhCN"
    style="height: 100%"
  >
    <NLayout has-sider class="library-shell">
      <NLayoutSider :width="232" bordered class="library-desktop-sidebar"
        ><div class="library-brand"><img :src="logo" alt="" />WorkerKit</div>
        <NMenu :value="page" :options="menu" @update:value="select"
      /></NLayoutSider>
      <NLayout
        class="library-scroll"
        content-style="height:100%; display:flex; flex-direction:column; overflow:hidden"
      >
        <header class="library-header" data-library-header>
          <NButton
            class="library-mobile-toggle"
            aria-label="打开侧边栏"
            @click="open = true"
            ><Menu :size="18" /></NButton
          ><strong>{{
            page === 'workspace' ? '业务工作台' : '组件体验'
          }}</strong
          ><NTag>Naive UI</NTag
          ><NButton
            :aria-label="dark ? '切换浅色主题' : '切换深色主题'"
            @click="dark = !dark"
            ><Sun v-if="dark" :size="17" /><Moon v-else :size="17"
          /></NButton>
        </header>
        <main class="library-content" style="flex: 1" data-library-scroll>
          <Workspace v-if="page === 'workspace'" />
          <div v-else>
            <div class="workspace-toolbar">
              <div>
                <h1>组件体验</h1>
                <p>Naive UI 原生组件；此页为本地演示数据。</p>
              </div>
            </div>
            <NCard
              ><NSpace
                ><NButton type="primary" @click="example = true"
                  >打开原生弹窗</NButton
                ><NTag type="success">组件就绪</NTag></NSpace
              ><NDataTable
                style="margin-top: 20px"
                :columns="[
                  { title: '名称', key: 'name' },
                  { title: '状态', key: 'status' },
                ]"
                :data="[{ name: '演示任务', status: '已就绪' }]" /></NCard
            ><NModal
              v-model:show="example"
              preset="dialog"
              title="原生弹窗"
              content="通过 Naive UI Dialog 管理焦点、遮罩和键盘交互。"
              positive-text="关闭"
              @positive-click="example = false"
            />
          </div>
        </main>
      </NLayout>
      <NDrawer v-model:show="open" placement="left" :width="280"
        ><NDrawerContent title="WorkerKit"
          ><NMenu
            :value="page"
            :options="menu"
            @update:value="select" /></NDrawerContent
      ></NDrawer>
    </NLayout>
  </NConfigProvider>
</template>
