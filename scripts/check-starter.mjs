import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const base = process.env.WORKERKIT_STARTER_URL || 'http://localhost:8787';
const backend = process.env.WORKERKIT_STARTER_BACKEND || 'sonic';
const output = new URL('../test-results/starters/', import.meta.url).pathname;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await context.newPage(), errors = [];
page.on('pageerror', error => errors.push(error.message));
let stage = 'opening generated application', planId;
try {
  expect((await context.request.get(base + '/api/workerkit/workspace')).status()).toBe(401);
  await page.goto(base);
  await page.getByRole('link', { name: '登录后端', exact: true }).click();
  if (backend === 'sonic') {
    await page.locator('#email').fill('admin'); await page.locator('#password').fill('password');
    await page.locator('button[type=submit]').click();
  } else {
    await page.locator('#field-username').fill('admin'); await page.locator('#field-password').fill('password');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
  }
  await expect(page).toHaveURL(url => url.pathname === '/app/workspace');
  await expect(page.locator('[data-workspace]')).toContainText('依赖正常');
  stage = 'native UI persistent task';
  const inventory = async () => (await context.request.get(base + '/api/workerkit/workspace')).json();
  const before = await inventory(); expect(before.backend).toBe(backend);
  await page.getByRole('button', { name: '创建计划', exact: true }).click();
  await expect.poll(async () => (await inventory()).plans.length).toBe(before.plans.length + 1);
  planId = (await inventory()).plans.find(p => !before.plans.some(old => old.id === p.id)).id;
  await page.getByRole('button', { name: '运行', exact: true }).first().click();
  await expect.poll(async () => (await inventory()).runs.some(r => r.planId === planId && r.status === 'succeeded')).toBe(true);
  await page.reload();
  await expect(page.locator('[data-workspace]')).toContainText('D1: ok');
  await page.getByRole('button', { name: '暂停', exact: true }).first().click();
  await expect.poll(async () => (await inventory()).plans.find(p => p.id === planId).scheduleId).toBeUndefined();
  await page.screenshot({ path: output + backend + '-desktop.png' });
  stage = 'mobile native layout';
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('[data-workspace]')).toContainText('D1: ok');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: output + backend + '-mobile.png' });
  expect((await context.request.post(base + '/api/workerkit/managed-tasks/run', { headers: { Origin: 'https://untrusted.test' }, data: { id: planId } })).status()).toBe(403);
  expect((await context.request.get(base + '/app/missing-script.js')).status()).toBe(404);
  expect(errors).toEqual([]);
  console.log('Generated ' + backend + ' project passed: native login, UI task creation/run/persistence, mobile, origins and assets.');
} catch (error) { console.error(stage + ': ' + error.message); process.exitCode = 1; }
finally {
  if (planId) await context.request.post(base + '/api/workerkit/managed-tasks/pause', { headers: { Origin: base, 'X-CSRF-Token': (await context.cookies(base)).find(c => c.name === 'csrf_token')?.value || '' }, data: { id: planId } }).catch(() => {});
  await browser.close();
}
