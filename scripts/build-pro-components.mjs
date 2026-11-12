import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { build } from 'vite';

await build({
  configFile: false,
  root: fileURLToPath(new URL('../examples/dashboard/pro-components/', import.meta.url)),
  base: '/pro-components/',
  publicDir: false,
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL('../dist/ui-suite/pro-components/', import.meta.url)),
    emptyOutDir: true,
  },
});
