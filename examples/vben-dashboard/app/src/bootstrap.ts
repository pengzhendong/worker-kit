import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { setupI18n } from '@vben/locales';
import { initStores, useAccessStore, useUserStore } from '@vben/stores';
import '@vben/styles';
import '@vben/styles/antd';
import Antd from 'ant-design-vue';
import App from './App.vue';
import Layout from './Layout.vue';
import componentPages from './component-pages.json';
import './style.css';
export async function bootstrap() {
  const pages = [
    { path: '/workspace', name: 'Workspace', title: '业务工作台', icon: 'lucide:activity' },
    { path: '/', name: 'Overview', title: '运行概览', icon: 'lucide:layout-dashboard' },
    { path: '/tasks', name: 'Tasks', title: '任务调度', icon: 'lucide:workflow' },
    { path: '/resources', name: 'Resources', title: '资源管理', icon: 'lucide:folder-open' },
    { path: '/logs', name: 'Logs', title: '运行日志', icon: 'lucide:scroll-text' },
    { path: '/settings', name: 'Settings', title: '应用设置', icon: 'lucide:settings-2' },
    ...componentPages.map(page => ({ path: page.path, name: 'Component_' + page.key, title: page.title, icon: 'lucide:' + page.icon })),
  ];
  const router = createRouter({ history: createWebHistory(import.meta.env.BASE_URL), routes: [{ path: '/', component: Layout, children: pages.map(p => ({ path: p.path, name: p.name, component: p.path === '/workspace' ? () => import('./Workspace.vue') : () => import('./Demo.vue'), meta: { title: p.title, icon: p.icon, affixTab: p.path === '/' } })) }, { path: '/:pathMatch(.*)*', redirect: '/' }] });
  const app = createApp(App);
  await setupI18n(app, { defaultLocale: 'zh-CN' });
  await initStores(app, { namespace: 'workerkit-vben-demo' });
  useAccessStore().setAccessMenus(pages.map(p => ({ path: p.path, name: p.title, icon: p.icon })));
  useUserStore().setUserInfo({ userId: 'demo', username: 'Demo User', realName: 'Demo User', avatar: import.meta.env.BASE_URL + 'favicon.svg', roles: [], homePath: '/' });
  app.use(Antd); app.use(router); app.mount('#app');
}
