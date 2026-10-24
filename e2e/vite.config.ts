import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Render the real consumer UI. Only Playwright intercepts API requests; no test
// routes, auth bypasses, Cloudflare bindings or seeded local databases are used.
export default defineConfig({
  root: fileURLToPath(new URL('../examples/dashboard', import.meta.url)),
  plugins: [react()],
  server: { host: '127.0.0.1', port: 4174, strictPort: true },
});
