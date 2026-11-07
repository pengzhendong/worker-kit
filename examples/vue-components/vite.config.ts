import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
// Imported prop types need TypeScript's JS API. Keep this optional Vue build on
// its declared TS 6 compiler; the root's native TS 7 CLI does not expose it.
const require = createRequire(import.meta.url);
const compiler = require('@vue/compiler-sfc');
compiler.registerTS(() => require('typescript'));
const kind = process.env.WORKERKIT_DEMO_KIND || 'element';
if (!['element', 'naive', 'shadcn', 'vuetify', 'quasar'].includes(kind))
  throw Error('Unsupported Vue component library');
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: process.env.WORKERKIT_DEMO_BASE || `/${kind}/`,
  plugins: [vue({ compiler }), ...(kind === 'shadcn' ? [tailwindcss()] : [])],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  publicDir: '../nuxt-dashboard/public',
  define: { __UI_KIND__: JSON.stringify(kind) },
  build: { outDir: `dist/${kind}`, emptyOutDir: true, target: 'es2022' },
});
