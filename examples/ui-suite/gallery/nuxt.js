import { createApp } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import ui from '@nuxt/ui/vue-plugin';
import Sample from './NuxtSample.vue';
import './nuxt.css';

export const available = [
  'accordion',
  'alert',
  'avatar',
  'badge',
  'button',
  'table',
  'fileUpload',
  'card',
  'checkbox',
  'calendar',
  'carousel',
  'inputMenu',
  'inputTags',
  'selectMenu',
  'checkboxGroup',
  'inputOtp',
  'color',
  'stepper',
  'avatarGroup',
  'kbd',
  'divider',
  'empty',
  'input',
  'number',
  'rating',
  'pagination',
  'progress',
  'radio',
  'select',
  'skeleton',
  'slider',
  'switch',
  'tabs',
  'textarea',
  'tooltip',
  'breadcrumb',
  'modal',
  'drawer',
  'collapsible',
  'slideover',
  'popover',
  'tree',
  'timeline',
];
export function mount(target, kind, official) {
  const app = createApp(Sample, { kind, official });
  if (official) {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
    });
    app.use(router);
    void router.replace('/');
  }
  app.use(ui);
  app.mount(target);
  return () => app.unmount();
}
