import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Render the real consumer UI. Only Playwright intercepts API requests; no test
// routes, auth bypasses, Cloudflare bindings or seeded local databases are used.
export default defineConfig({
  root: fileURLToPath(new URL('../examples/dashboard', import.meta.url)),
  plugins: [react()],
  // Serve compiled demo assets. Concurrent pages can otherwise receive
  // Vite's 504 Outdated Optimize Dep while lazy routes discover dependencies.
  // Keep the demo-only media/tools routes which this suite explicitly tests.
  define: { 'import.meta.env.DEV': 'true' },
  build: { outDir: fileURLToPath(new URL('../.wrangler/visual-app', import.meta.url)), emptyOutDir: true },
  preview: { host: '127.0.0.1', port: 4174, strictPort: true },
});
