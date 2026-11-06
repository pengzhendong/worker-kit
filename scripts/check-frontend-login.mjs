import { chromium, expect } from '@playwright/test';

const origins = {
  payload: process.env.PAYLOAD_PREVIEW_URL || 'http://kit.localhost:5184',
  sonic: process.env.SONIC_PREVIEW_URL || 'http://sonic.kit.localhost:5184',
};
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let stage = '';
try {
  for (const [backend, origin] of Object.entries(origins)) {
    for (const frontend of ['nuxt', 'prime', 'vben', 'pro', 'refine', 'tabler', 'adminlte', 'docs']) {
      stage = backend + ' / ' + frontend;
      const context = await browser.newContext();
      try {
        const page = await context.newPage();
        const path = frontend === 'docs' ? '/docs/workspace.html' : `/${frontend}/workspace`;
        await page.goto(origin + path);
        const login = page.getByRole('link', { name: '登录后端', exact: true });
        await expect(login).toBeVisible();
        await login.click();
        await expect.poll(() => {
          const url = new URL(page.url());
          return url.origin === origin && url.pathname === (backend === 'sonic' ? '/auth/login' : '/admin/login');
        }, { timeout: 15000 }).toBe(true);
        expect(new URL(page.url()).searchParams.get('redirect')).toBe(path);
        await expect(page.locator(backend === 'sonic' ? '#password' : '#field-password')).toBeVisible({ timeout: 15000 });
      } finally { await context.close(); }
    }
  }
  console.log('All sixteen frontend/backend login links reach native authentication and preserve the return path.');
} catch (error) { console.error(stage + ': ' + error.message); process.exitCode = 1; }
finally { await browser.close(); }
