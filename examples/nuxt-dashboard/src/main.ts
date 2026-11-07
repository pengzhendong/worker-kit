import './style.css';
import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import ui from '@nuxt/ui/vue-plugin';
import App from './App.vue';
import componentPages from '../../ui-demo/component-pages.json';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/workspace', component: () => import('./pages/Workspace.vue'), meta: { title: '业务工作台' } },
    { path: '/', component: () => import('./pages/Overview.vue'), meta: { title: '运行概览' } },
    { path: '/tasks', component: () => import('./pages/Tasks.vue'), meta: { title: '任务调度' } },
    { path: '/logs', component: () => import('./pages/Logs.vue'), meta: { title: '运行日志' } },
    { path: '/settings', component: () => import('./pages/Settings.vue'), meta: { title: '应用设置' } },
    ...(import.meta.env.BASE_URL === '/nuxt/' ? [{
      path: '/components/gallery',
      component: () => import('../../ui-demo/ComponentGallery.vue'),
      meta: { title: '组件目录' },
    }] : []),
    ...componentPages.map(page => ({ path: page.path, component: page.key === 'table' ? () => import('./pages/Tasks.vue') : page.key === 'form' ? () => import('./pages/Settings.vue') : page.key === 'preview' ? () => import('./pages/Resources.vue') : () => import('./pages/Components.vue'), meta: { title: page.title, description: page.description } })),
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

createApp(App).use(router).use(ui).mount('#app');
