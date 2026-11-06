import { fileURLToPath } from 'node:url';
export default defineNuxtConfig({
 compatibilityDate: '2026-10-19', ssr: false, devtools: { enabled: false },
 app: { baseURL: '/hub/', head: { title: 'WorkerKit · NuxtHub', htmlAttrs: { lang: 'zh-CN' } } },
 modules: ['@nuxt/ui', '@nuxthub/core'], css: ['~/assets/css/main.css'],
 ui: { colorMode: true, fonts: false },
 icon: { serverBundle: false, clientBundle: { scan: true } },
 nitro: { preset: 'cloudflare_module', unenv: { inject: { console: [fileURLToPath(new URL('./platform/console.ts', import.meta.url)), 'console'] } }, cloudflare: { deployConfig: false, nodeCompat: true }, experimental: { asyncContext: true } },
 hub: { db: { dialect: 'sqlite', driver: 'd1', applyMigrationsDuringBuild: false }, kv: { driver: 'cloudflare-kv-binding', binding: 'KV' }, cache: { driver: 'cloudflare-kv-binding', binding: 'CACHE' }, blob: { driver: 'cloudflare-r2', binding: 'BLOB' } },
});
