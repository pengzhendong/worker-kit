import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import ToastService from 'primevue/toastservice';
import StyleClass from 'primevue/styleclass';
import Ripple from 'primevue/ripple';
import Button from 'primevue/button';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import SelectButton from 'primevue/selectbutton';
import ToggleSwitch from 'primevue/toggleswitch';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import Avatar from 'primevue/avatar';
import Toast from 'primevue/toast';
import Message from 'primevue/message';
import Textarea from 'primevue/textarea';
import InputNumber from 'primevue/inputnumber';
import FileUpload from 'primevue/fileupload';
import Chart from 'primevue/chart';
import App from './App.vue';
import Demo from './Demo.vue';
import Workspace from './Workspace.vue';
import componentPages from '../../ui-demo/component-pages.json';
import './style.css';
const { default: AppLayout } = __PRIMEVUE_LIBRARY__
  ? await import('./PrimeVueLayout.vue')
  : await import('./layout/AppLayout.vue');
if (!__PRIMEVUE_LIBRARY__) await import('./assets/layout/layout.scss');
const paths = ['/', '/tasks', '/logs', '/settings', ...componentPages.map(page => page.path)];
const gallery = import.meta.env.BASE_URL === '/primevue/' ? [{
  path: '/components/gallery',
  component: () => import('../../ui-demo/ComponentGallery.vue'),
}] : [];
const router = createRouter({ history: createWebHistory(import.meta.env.BASE_URL), routes: [{ path: '/', component: AppLayout, children: [{ path: '/workspace', component: Workspace }, ...gallery, ...paths.map(path => ({ path, component: Demo }))] }, { path: '/:pathMatch(.*)*', redirect: '/' }] });
router.afterEach(() => { document.querySelector('.layout-main')?.scrollTo({ top: 0 }); });
const app = createApp(App).use(router).use(PrimeVue, { ripple: true, theme: { preset: Aura, options: { darkModeSelector: '.app-dark' } } }).use(ToastService);
for (const [name, component] of Object.entries({ Button, Card, DataTable, Column, InputText, Select, SelectButton, ToggleSwitch, Dialog, Tag, Avatar, Toast, Message, Textarea, InputNumber, FileUpload, Chart })) app.component(name, component);
app.directive('styleclass', StyleClass); app.directive('ripple', Ripple); app.mount('#app');
