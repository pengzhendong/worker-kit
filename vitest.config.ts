import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [cloudflareTest({
    wrangler: { configPath: './test/wrangler.jsonc' },
    miniflare: {
      bindings: {
        ADMIN_USERNAME: 'admin',
        ADMIN_PASSWORD: 'test-password-at-least-twelve',
        ADMIN_SESSION_SECRET: 'workerkit-test-secret-at-least-32-characters',
      },
    },
  })],
  test: { include: ['test/**/*.test.ts'] },
});
