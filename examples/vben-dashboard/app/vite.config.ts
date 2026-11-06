import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import jsx from '@vitejs/plugin-vue-jsx';
import tailwindcss from '@tailwindcss/vite';
import { viteTailwindReferencePlugin } from '../../internal/vite-config/src/plugins/tailwind-reference.ts';
export default defineConfig({
  base: process.env.WORKERKIT_DEMO_BASE || '/',
  plugins: [viteTailwindReferencePlugin(), vue(), jsx(), tailwindcss()],
  resolve: { dedupe: ['vue', 'vue-router'] },
  define: { 'import.meta.env.VITE_APP_STORE_SECURE_KEY': JSON.stringify('workerkit-local-ui-demo-no-credentials') },
});
