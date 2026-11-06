import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Render the real consumer UI. Only Playwright intercepts API requests; no test
// routes, auth bypasses, Cloudflare bindings or seeded local databases are used.
export default defineConfig({
  root: fileURLToPath(new URL('../examples/dashboard', import.meta.url)),
  plugins: [react()],
  // Some tests replace actual dev modules to exercise optional shell props.
  // Prebundle all UI dependencies before concurrent pages visit lazy routes;
  // discovering one later can invalidate React chunks with a 504 response.
  optimizeDeps: {
    entries: ['index.html', 'web/**/*.{ts,tsx}', '../../src/web/**/*.{ts,tsx}'],
    include: [
      'react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime',
      'antd', 'antd/locale/zh_CN', '@ant-design/icons', '@ant-design/pro-components',
      'react-error-boundary', '@scalar/api-reference-react', '@tanstack/react-virtual',
      '@videojs/react', '@videojs/react/audio', '@videojs/react/video', '@videojs/react/i18n',
      'wavesurfer.js',
    ],
    holdUntilCrawlEnd: true,
  },
  server: { host: '127.0.0.1', port: 4174, strictPort: true },
});
