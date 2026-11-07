import { createApp } from 'vue';
import './style.css';
declare const __UI_KIND__: string;
if (__UI_KIND__ === 'element') {
  const [{ default: App }, { default: ElementPlus }, { default: zhCn }] =
    await Promise.all([
      import('./ElementApp.vue'),
      import('element-plus'),
      import('element-plus/es/locale/lang/zh-cn'),
      import('element-plus/dist/index.css'),
      import('element-plus/theme-chalk/dark/css-vars.css'),
    ]);
  createApp(App).use(ElementPlus, { locale: zhCn }).mount('#app');
} else if (__UI_KIND__ === 'naive') {
  const { default: App } = await import('./NaiveApp.vue');
  createApp(App).mount('#app');
} else if (__UI_KIND__ === 'vuetify') {
  const [
    { default: App },
    { createVuetify },
    components,
    directives,
    { aliases, mdi },
  ] = await Promise.all([
    import('./VuetifyApp.vue'),
    import('vuetify'),
    import('vuetify/components'),
    import('vuetify/directives'),
    import('vuetify/iconsets/mdi-svg'),
  ]);
  // Vuetify publishes a side-effect stylesheet declaration rather than a module.
  await import('vuetify/lib/styles/main.css');
  createApp(App)
    .use(
      createVuetify({
        components,
        directives,
        icons: { defaultSet: 'mdi', aliases, sets: { mdi } },
      }),
    )
    .mount('#app');
} else if (__UI_KIND__ === 'quasar') {
  const [
    { default: App },
    { Quasar },
    components,
    { default: iconSet },
    { default: lang },
    { default: demoPages },
    { default: demoComponent },
  ] = await Promise.all([
    import('./QuasarApp.vue'),
    import('quasar'),
    import('quasar'),
    import('quasar/icon-set/svg-mdi-v7'),
    import('quasar/lang/zh-CN'),
    import('../../ui-demo/component-pages.json'),
    import('./QuasarComponents.vue'),
    import('quasar/dist/quasar.css'),
  ]);
  createApp(App, { demoPages, demoComponent })
    .use(Quasar, {
      components: Object.fromEntries(
        Object.entries(components).filter(([name]) => /^Q[A-Z]/.test(name)),
      ),
      iconSet,
      lang,
    })
    .mount('#app');
} else {
  await import('./shadcn.css');
  const { default: App } = await import('./ShadcnApp.vue');
  createApp(App).mount('#app');
}
