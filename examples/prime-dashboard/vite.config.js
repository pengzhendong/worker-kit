import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: process.env.WORKERKIT_DEMO_BASE || '/',
  plugins: [vue(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  publicDir: '../nuxt-dashboard/public',
  css: { preprocessorOptions: { scss: { silenceDeprecations: ['legacy-js-api'] } } },
});
