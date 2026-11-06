import { fileURLToPath } from 'node:url';
export default defineNuxtConfig({
  compatibilityDate: '2026-10-19',
  ssr: false,
  devtools: { enabled: false },
  app: {
    baseURL: '/hub/',
    head: { title: 'WorkerKit · NuxtHub', htmlAttrs: { lang: 'zh-CN' } },
  },
  hooks: {
    // Compose the Nitro application through our own Worker entry and task DO.
    // NuxtHub enables deploy redirection earlier during its module setup.
    'nitro:config'(config) {
      config.cloudflare = { ...config.cloudflare, deployConfig: false };
    },
  },
  modules: ['@nuxt/ui', '@nuxthub/core'],
  css: ['~/assets/css/main.css'],
  ui: { colorMode: true, fonts: false },
  icon: { serverBundle: false, clientBundle: { scan: true } },
  nitro: {
    preset: 'cloudflare_module',
    unenv: {
      inject: {
        console: [
          fileURLToPath(new URL('./platform/console.ts', import.meta.url)),
          'console',
        ],
      },
    },
    cloudflare: { deployConfig: false, nodeCompat: true },
    experimental: { asyncContext: true },
  },
  hub: {
    db: { dialect: 'sqlite', driver: 'd1', applyMigrationsDuringBuild: false },
    kv: { driver: 'cloudflare-kv-binding', binding: 'KV' },
    cache: { driver: 'cloudflare-kv-binding', binding: 'CACHE' },
    blob: { driver: 'cloudflare-r2', binding: 'BLOB' },
  },
});
