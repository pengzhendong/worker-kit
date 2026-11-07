import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const library = process.env.WORKERKIT_DEMO_KIND === 'primevue';

export default defineConfig({
  define: { __PRIMEVUE_LIBRARY__: library },
  build: { outDir: library ? 'dist-primevue' : 'dist' },
  base: process.env.WORKERKIT_DEMO_BASE || '/',
  plugins: [vue(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  publicDir: '../nuxt-dashboard/public',
  css: { preprocessorOptions: { scss: { silenceDeprecations: ['legacy-js-api'] } } },
});
