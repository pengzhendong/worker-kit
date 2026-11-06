import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: process.env.WORKERKIT_DEMO_BASE || '/',
  plugins: [react()],
  publicDir: '../nuxt-dashboard/public',
  define: { __DEMO_KIND__: JSON.stringify(process.env.WORKERKIT_DEMO_KIND || 'pro') },
  build: { outDir: `dist/${process.env.WORKERKIT_DEMO_KIND || 'pro'}` },
});
