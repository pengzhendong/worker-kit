import { defineConfig } from '@playwright/test';
import type { ConsoleOptions } from './e2e/fixtures';

export default defineConfig<ConsoleOptions>({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 2,
  timeout: 30_000,
  updateSnapshots: 'none',
  snapshotPathTemplate: '{testDir}/screenshots/{projectName}/{arg}{ext}',
  reporter: [['list'], ['html', { open: 'never' }]],
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', scale: 'css', maxDiffPixels: 0, threshold: 0.2 },
  },
  use: {
    baseURL: 'http://127.0.0.1:4174',
    browserName: 'chromium',
    headless: true,
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-light', use: { viewport: { width: 1280, height: 800 }, dark: false } },
    { name: 'desktop-dark', testIgnore: '**/states.spec.ts', use: { viewport: { width: 1280, height: 800 }, dark: true } },
    { name: 'mobile-light', testIgnore: '**/states.spec.ts', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, dark: false } },
  ],
  webServer: {
    command: 'npx vite --config e2e/vite.config.ts',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
