import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => ({
  plugins: [cloudflareTest({
    wrangler: { configPath: './test/wrangler.jsonc' },
    miniflare: {
      bindings: {
        ADMIN_USERNAME: 'admin',
        ADMIN_PASSWORD: 'test-password-at-least-twelve',
        ADMIN_SESSION_SECRET: 'workerkit-test-secret-at-least-32-characters',
        TEST_MIGRATIONS: await readD1Migrations('./examples/dashboard/migrations'),
      },
    },
  })],
  test: { include: ['test/**/*.test.ts'], setupFiles: ['./test/setup.ts'] },
}));
