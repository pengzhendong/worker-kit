import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.PAYLOAD_PREVIEW_URL || 'http://kit.localhost:5184';
const sonic = process.env.SONIC_PREVIEW_URL || 'http://sonic.kit.localhost:5184';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext();
const page = await context.newPage();
page.setDefaultTimeout(30000);
const errors = [], results = [];
page.on('pageerror', error => errors.push(error.message));
const output = 'test-results/workspace-layout';
try {
  expect((await context.request.post(base + '/api/users/login', { headers: { Origin: base }, data: { username: 'admin', password: 'password' } })).status()).toBe(200);
  await context.request.get(sonic + '/auth/login');
  const csrf = (await context.cookies(sonic)).find(cookie => cookie.name === 'csrf_token')?.value || '';
  await context.request.post(sonic + '/auth/login/form', { headers: { Origin: sonic, 'X-CSRF-Token': csrf }, form: { email: 'admin', password: 'password' } });
  await mkdir(output, { recursive: true });
  for (const [backend, origin] of [['payload', base], ['sonic', sonic]]) for (const width of [1440, 390]) for (const view of ['nuxt', 'prime', 'vben', 'pro', 'refine', 'tabler', 'adminlte', 'docs']) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
    await page.goto(origin + (view === 'docs' ? '/docs/workspace.html' : `/${view}/workspace`));
    await expect(page.locator('[data-workspace]')).toContainText('依赖正常', { timeout: 45000 });
    await page.locator('[data-workspace]').evaluate(element => Promise.all(element.getAnimations({ subtree: true }).filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {}))));
    const layout = await page.evaluate(() => {
      const titles = [...document.querySelectorAll('h1,h2')].filter(element => element.textContent.replace(/\u200b/g, '').trim() === '业务工作台' && parseFloat(getComputedStyle(element).fontSize) >= 20);
      return {
        titles: titles.map(element => { const rect = element.getBoundingClientRect(); return { x: rect.x, right: rect.right, top: rect.top, font: getComputedStyle(element).fontSize }; }),
        overflow: document.documentElement.scrollWidth > innerWidth,
        misleading: /所有操作仅影响本地演示|未连接生产服务|操作仅保存在当前浏览器/.test(document.body.innerText),
      };
    });
    expect(layout.titles, `${backend}/${view}/${width}: one prominent page title`).toHaveLength(1);
    expect(layout.titles[0].x, `${view}: title not clipped`).toBeGreaterThanOrEqual(12);
    expect(layout.titles[0].right).toBeLessThanOrEqual(width);
    expect(layout.overflow, `${view}: document must not overflow`).toBe(false);
    expect(layout.misleading, `${view}: workspace copy must reflect its backend`).toBe(false);
    await expect(page.locator('[data-workspace]').getByRole('button', { name: /刷\s*新/ })).toHaveCount(1);
    if (backend === 'payload') await page.screenshot({ path: `${output}/${view}-${width}.png` });
    results.push({ backend, view, width, ...layout });
    console.log(`${backend}/${view}/${width}: title, copy, controls and width passed`);
  }
  expect(errors).toEqual([]);
  await writeFile(`${output}/result.json`, JSON.stringify({ results, errors }, null, 2));
} finally { await browser.close(); }
