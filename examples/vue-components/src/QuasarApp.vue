<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { Menu, Moon } from '@lucide/vue';
import Workspace from './QuasarWorkspace.vue';
const drawer = ref(false),
  q = useQuasar();
</script>
<template>
  <QLayout view="hHh Lpr fFf" container class="native-full-layout"
    ><QHeader
      bordered
      data-library-header
      :class="
        q.dark.isActive ? 'bg-grey-10 text-white' : 'bg-white text-grey-9'
      "
      ><QToolbar
        ><QBtn flat round aria-label="打开侧边栏" @click="drawer = !drawer"
          ><Menu :size="20" /></QBtn
        ><QToolbarTitle>WorkerKit · Quasar</QToolbarTitle
        ><QBtn flat round aria-label="切换深色主题" @click="q.dark.toggle()"
          ><Moon :size="20" /></QBtn></QToolbar></QHeader
    ><QDrawer v-model="drawer" overlay bordered :width="240" aria-label="导航"
      ><QList
        ><QItem clickable @click="drawer = false"
          ><QItemSection>业务工作台</QItemSection></QItem
        ></QList
      ></QDrawer
    ><QPageContainer
      ><QPage class="native-library-content" data-library-scroll
        ><Workspace /></QPage></QPageContainer
  ></QLayout>
</template>
