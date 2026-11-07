import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
const kind = process.env.WORKERKIT_DEMO_KIND || 'mui';
if (!['mui', 'mantine'].includes(kind)) throw Error('Invalid library');
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: process.env.WORKERKIT_DEMO_BASE || `/${kind}/`,
  plugins: [react()],
  define: { __UI_KIND__: JSON.stringify(kind) },
  publicDir: '../nuxt-dashboard/public',
  build: { outDir: `dist/${kind}`, target: 'es2022' },
});
