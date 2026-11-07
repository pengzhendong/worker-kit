<script setup lang="ts">
import { ref, watch } from 'vue';
import { Activity, Blocks, Menu, Moon, Sun } from '@lucide/vue';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from './components/ui/sheet';
import Workspace from './ShadcnWorkspace.vue';
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
  <div class="library-shell flex">
    <aside class="shadcn-sidebar library-desktop-sidebar">
      <div class="library-brand"><img :src="logo" alt="" />WorkerKit</div>
      <nav>
        <Button
          :variant="page === 'workspace' ? 'secondary' : 'ghost'"
          class="justify-start"
          @click="select('workspace')"
          ><Activity />业务工作台</Button
        ><Button
          :variant="page === 'components' ? 'secondary' : 'ghost'"
          class="justify-start"
          @click="select('components')"
          ><Blocks />组件体验</Button
        >
      </nav>
    </aside>
    <div class="library-scroll flex-1">
      <header class="library-header" data-library-header>
        <Button
          variant="outline"
          class="library-mobile-toggle"
          aria-label="打开侧边栏"
          @click="open = true"
          ><Menu /></Button
        ><strong>{{ page === 'workspace' ? '业务工作台' : '组件体验' }}</strong
        ><Badge variant="secondary">shadcn-vue</Badge
        ><Button
          variant="outline"
          size="icon"
          :aria-label="dark ? '切换浅色主题' : '切换深色主题'"
          @click="dark = !dark"
          ><Sun v-if="dark" /><Moon v-else
        /></Button>
      </header>
      <main class="library-content flex-1" data-library-scroll>
        <Workspace v-if="page === 'workspace'" />
        <div v-else>
          <div class="workspace-toolbar">
            <div>
              <h1>组件体验</h1>
              <p>上游 registry 源码组件；此页为本地演示数据。</p>
            </div>
          </div>
          <Card
            ><CardHeader><CardTitle>原生组件</CardTitle></CardHeader
            ><CardContent
              ><Button @click="example = true"
                >打开原生弹窗</Button
              ></CardContent
            ></Card
          ><Dialog v-model:open="example"
            ><DialogContent
              ><DialogHeader
                ><DialogTitle>原生弹窗</DialogTitle
                ><DialogDescription
                  >shadcn-vue 组件使用 Reka UI
                  处理焦点、键盘和遮罩。</DialogDescription
                ></DialogHeader
              ><DialogFooter
                ><Button @click="example = false">关闭</Button></DialogFooter
              ></DialogContent
            ></Dialog
          >
        </div>
      </main>
    </div>
    <Sheet v-model:open="open"
      ><SheetContent side="left"
        ><SheetHeader><SheetTitle>WorkerKit</SheetTitle></SheetHeader>
        <nav class="grid gap-3 px-4">
          <Button variant="ghost" @click="select('workspace')"
            ><Activity />业务工作台</Button
          ><Button variant="ghost" @click="select('components')"
            ><Blocks />组件体验</Button
          >
        </nav></SheetContent
      ></Sheet
    >
  </div>
</template>
