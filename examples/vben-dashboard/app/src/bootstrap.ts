import { createApp, markRaw, type Component } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import {
  Activity,
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
  LayoutPanelLeft,
  Palette,
  PanelsTopLeft,
  ScanEye,
  Settings2,
  Table2,
  TextCursorInput,
} from '@lucide/vue';
import { setupI18n } from '@vben/locales';
import { initStores, useAccessStore, useUserStore } from '@vben/stores';
import '@vben/styles';
import '@vben/styles/antd';
import Antd from 'ant-design-vue';
import App from './App.vue';
import Layout from './Layout.vue';
import componentPages from './component-pages.json';
import workspacePages from './workspace-pages.json';
import './style.css';

const menuIcons: Record<string, Component> = {
  activity: Activity,
  'calendar-clock': CalendarClock,
  'clipboard-list': ClipboardList,
  'layout-dashboard': LayoutDashboard,
  'layout-panel-left': LayoutPanelLeft,
  palette: Palette,
  'panels-top-left': PanelsTopLeft,
  'scan-eye': ScanEye,
  'settings-2': Settings2,
  'table-2': Table2,
  'text-cursor-input': TextCursorInput,
};

export async function bootstrap() {
  const componentPreview = componentPages.some((page) =>
    location.pathname.endsWith(page.path),
  );
  const homePath = componentPreview ? '/components/table' : '/';
  const pages = [
    ...workspacePages
      .filter(
        (page) =>
          page.id !== 'workspace' || location.pathname.endsWith('/workspace'),
      )
      .map((page) => ({
        path: page.path,
        name: page.id,
        title: page.label,
        icon: markRaw(menuIcons[page.icon]),
      })),
    ...componentPages.map((page) => ({
      path: page.path,
      name: 'Component_' + page.key,
      title: page.title,
      icon: markRaw(menuIcons[page.icon]),
    })),
  ];
  const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
      {
        path: '/',
        component: Layout,
        children: pages.map((p) => ({
          path: p.path,
          name: p.name,
          component:
            p.path === '/workspace'
              ? () => import('./Workspace.vue')
              : () => import('./Demo.vue'),
          meta: { title: p.title, icon: p.icon, affixTab: p.path === homePath },
        })),
      },
      { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
  });
  const app = createApp(App);
  await setupI18n(app, { defaultLocale: 'zh-CN' });
  await initStores(app, { namespace: 'workerkit-vben-demo' });
  useAccessStore().setAccessMenus(
    pages
      .filter(
        (page) => !componentPreview || page.path.startsWith('/components/'),
      )
      .map((p) => ({ path: p.path, name: p.title, icon: p.icon })),
  );
  useUserStore().setUserInfo({
    userId: 'demo',
    username: 'Demo User',
    realName: 'Demo User',
    avatar: import.meta.env.BASE_URL + 'favicon.svg',
    roles: [],
    homePath,
  });
  app.use(Antd);
  app.use(router);
  app.mount('#app');
}
