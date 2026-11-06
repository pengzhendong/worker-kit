import { defineConfig } from 'vite';
export default defineConfig({
  base: process.env.WORKERKIT_DEMO_BASE || '/',
  publicDir: '../nuxt-dashboard/public',
  define: { __DEMO_KIND__: JSON.stringify(process.env.WORKERKIT_DEMO_KIND || 'tabler') },
  build: { outDir: `dist/${process.env.WORKERKIT_DEMO_KIND || 'tabler'}` },
});
