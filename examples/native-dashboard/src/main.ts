import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import ui from '@nuxt/ui/vue-plugin';
import App from './App.vue';
import './style.css';

// Keep bookmarks from the previous console (#runtime, #api, ...) working.
if (location.hash && !location.hash.startsWith('#/')) history.replaceState(null, '', '#/' + location.hash.slice(1));
const router = createRouter({ history: createWebHashHistory(), routes: [
  { path: '/', redirect: '/runtime' },
  { path: '/runtime', component: () => import('./pages/runtime.vue'), meta: { title: '运行状态' } },
  { path: '/configuration', component: () => import('./pages/configuration.vue'), meta: { title: '服务配置' } },
  { path: '/settings', component: () => import('./pages/settings.vue'), meta: { title: 'KV 设置' } },
  { path: '/keys', component: () => import('./pages/keys.vue'), meta: { title: '访问密钥' } },
  { path: '/audit', component: () => import('./pages/audit.vue'), meta: { title: '操作审计' } },
  { path: '/api', component: () => import('./pages/api.vue'), meta: { title: 'API 中心' } },
  { path: '/account', component: () => import('./pages/account.vue'), meta: { title: '当前账户' } },
  { path: '/:pathMatch(.*)*', redirect: '/runtime' },
] });
createApp(App).use(router).use(ui).mount('#root');
