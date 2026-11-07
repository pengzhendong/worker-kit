export const officialDemos = {
  nuxt: 'https://dashboard-template.nuxt.dev/',
  primevue: 'https://primevue.dev/datatable/',
  element: 'https://element-plus.org/zh-CN/component/table',
  naive: 'https://www.naiveui.com/',
  shadcn: 'https://shadcn-vue.com/blocks',
  vuetify: 'https://vuetifyjs.com/zh-Hans/components/data-tables/basics/',
  quasar: 'https://quasar.dev/vue-components/table/',
  mui: 'https://mui.com/material-ui/react-table/',
  mantine: 'https://mantine.dev/core/table/',
  prime: 'https://sakai.primevue.org/',
  pure: 'https://pure-admin.github.io/vue-pure-admin/',
  soybean: 'https://naive.soybeanjs.cn/',
  vben: 'https://ant.vben.pro/',
  pro: 'https://preview.pro.ant.design/',
  refine: 'https://example.crm.refine.dev/',
  tabler: 'https://preview.tabler.io/',
  adminlte: 'https://adminlte.io/themes/v4/',
  docs: 'https://vitepress.dev/zh/guide/what-is-vitepress',
};
export const frontendViews = Object.keys(officialDemos);
const templates = new Set([
  'prime',
  'pure',
  'soybean',
  'vben',
  'pro',
  'refine',
  'tabler',
  'adminlte',
]);
export function previewCategory(view) {
  if (view === 'docs') return 'docs';
  if (templates.has(view)) return 'templates';
  return Object.hasOwn(officialDemos, view) ? 'components' : 'backend';
}
export const frontendPreviewPath = (view) =>
  view === 'docs' ? '/docs/' : `/${view}/components/table`;
export const preloadLabels = {
  waiting: '等待预加载',
  loading: '正在准备界面',
  ready: '演示页面已载入',
  failed: '预加载未完成，点击后加载',
  disabled: '自动预加载已关闭，点击后加载',
  paused: '预加载已暂停，返回前台后继续',
};
