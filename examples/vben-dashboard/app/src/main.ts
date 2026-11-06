import { initPreferences } from '@vben/preferences';
await initPreferences({ namespace: 'workerkit-vben-demo-v1', overrides: {
  app: { name: 'WorkerKit', defaultHomePath: '/', enableCheckUpdates: false, locale: 'zh-CN', contentPadding: 24 },
  logo: { source: import.meta.env.BASE_URL + 'favicon.svg' },
  copyright: { enable: false },
  theme: { mode: 'light', semiDarkSidebar: false },
  widget: { lockScreen: false, languageToggle: false, notification: false },
} });
const { bootstrap } = await import('./bootstrap');
await bootstrap();
