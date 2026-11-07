<script setup lang="ts">
import { ref } from 'vue';
import Workspace from './VuetifyWorkspace.vue';
import { Menu, Moon, Activity } from '@lucide/vue';
const drawer = ref(false),
  dark = ref(false);
</script>
<template>
  <VApp :theme="dark ? 'dark' : 'light'"
    ><VLayout class="native-full-layout"
      ><VNavigationDrawer
        v-model="drawer"
        :mobile-breakpoint="768"
        mobile
        temporary
        aria-label="导航"
        ><VList
          ><VListItem
            title="业务工作台"
            @click="drawer = false" /></VList></VNavigationDrawer
      ><VAppBar data-library-header flat border
        ><VAppBarNavIcon aria-label="打开侧边栏" @click="drawer = !drawer"
          ><Menu :size="20" /></VAppBarNavIcon
        ><VAppBarTitle>WorkerKit · Vuetify</VAppBarTitle
        ><VBtn icon aria-label="切换深色主题" @click="dark = !dark"
          ><Moon :size="20" /></VBtn></VAppBar
      ><VMain
        ><div class="native-library-content" data-library-scroll>
          <Workspace /></div></VMain></VLayout
  ></VApp>
</template>
