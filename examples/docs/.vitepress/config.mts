import { defineConfig } from 'vitepress';
export default defineConfig({
  lang: 'zh-CN', title: 'WorkerKit', description: '后台基础能力与界面方案预览',
  base: process.env.WORKERKIT_DEMO_BASE || '/',
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: (process.env.WORKERKIT_DEMO_BASE || '/') + 'favicon.svg' }]],
  themeConfig: {
    logo: '/favicon.svg',
    nav: [{ text: '技术地图', link: '/architecture' }, { text: '业务工作台', link: '/workspace' }, { text: '指南', link: '/guide' }, { text: '升级维护', link: '/upgrades' }, { text: '预览中心', link: '../?view=nuxt', target: '_top' }],
    sidebar: [{ text: 'WorkerKit', items: [{ text: '技术地图与选型', link: '/architecture' }, { text: '现有 Worker 接入', link: '/migration' }, { text: '业务工作台', link: '/workspace' }, { text: '快速了解', link: '/guide' }, { text: '界面与功能', link: '/features' }, { text: '组件体验', link: '/components' }, { text: '升级维护', link: '/upgrades' }, { text: '高 star 项目与接入结论', link: '/alternatives' }, { text: '全栈框架验证', link: '/frameworks' }] }],
    outline: { label: '本页内容' }, search: { provider: 'local' },
    footer: { message: 'WorkerKit · 开发与界面示例' },
  },
});
