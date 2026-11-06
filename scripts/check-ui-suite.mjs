import { checkComponents } from './check-ui-components.mjs';
import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const isolated = process.argv.includes('--start');
const base = isolated ? 'http://127.0.0.1:5191' : process.env.WORKERKIT_SUITE_URL || 'http://localhost:5190';
let server;
if (isolated) {
  server = spawn(process.execPath, [new URL('./preview-suite.mjs', import.meta.url).pathname, '--no-build'], { env: { ...process.env, WORKERKIT_SUITE_PORT: '5191' }, stdio: 'inherit' });
  server.on('error', error => { console.error(error.message); });
  try { await expect.poll(async () => { try { return (await fetch(base)).status; } catch { return 0; } }).toBe(200); }
  catch (error) { server.kill(); throw error; }
}
const screenshots = new URL('../test-results/ui-suite/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const badResponses = [];
  page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`); });
  await page.goto(base);
  for (const [name, view] of [['Nuxt UI', 'nuxt'], ['PrimeVue / Sakai', 'prime'], ['Vben Admin', 'vben'], ['Ant Design Pro', 'pro'], ['Refine', 'refine'], ['Tabler', 'tabler'], ['AdminLTE', 'adminlte'], ['VitePress', 'docs']]) {
    await page.getByRole('tab', { name, exact: true }).click();
    const frame = page.frameLocator('#preview');
    if (view === 'docs') {
      await expect(frame.getByRole('link', { name: '阅读指南', exact: true })).toBeVisible();
      await frame.getByRole('link', { name: '阅读指南', exact: true }).click();
      await expect(frame.getByRole('heading', { name: /快速了解/ })).toBeVisible();
    } else {
      await expect(frame.getByRole('heading', { name: '运行概览', exact: true }).last()).toBeVisible();
      const nav = async label => {
        const link = frame.getByRole('link', { name: new RegExp(label) }).first();
        if (await link.count()) await link.click();
        else await frame.getByRole('menuitem').filter({ hasText: label }).first().click();
      };
      await nav('任务调度');
      await frame.getByRole('textbox', { name: '搜索任务', exact: true }).fill('demo-api');
      await frame.getByRole('button', { name: '运行定时数据同步', exact: true }).click();
      await nav('运行日志');
      await expect(frame.getByText('演示任务「定时数据同步」执行完成', { exact: true })).toBeVisible();
      await nav('资源管理');
      await frame.getByRole('button', { name: '预览周末片段.mp4', exact: true }).click();
      await frame.locator('video').evaluate(video => video.play());
      await expect.poll(() => frame.locator('video').evaluate(video => video.currentTime)).toBeGreaterThan(.2);
      await page.keyboard.press('Escape');
    }
    await page.screenshot({ path: `${screenshots}${view}-desktop.png` });
    await page.getByRole('button', { name: '手机', exact: true }).click();
    await expect(page.locator('#preview')).toHaveClass('mobile');
    await page.screenshot({ path: `${screenshots}${view}-phone.png` });
    await page.getByRole('button', { name: '桌面', exact: true }).click();
    console.log(`${view}: mounted and interactive in unified preview`);
  }
  expect(errors).toEqual([]);
  expect(badResponses).toEqual([]);
  for (const view of ['pro', 'refine', 'tabler', 'adminlte']) {
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
    const mobileErrors = [];
    mobile.on('pageerror', error => mobileErrors.push(error.message));
    await mobile.goto(`${base}/${view}/`);
    await expect(mobile.getByRole('heading', { name: '运行概览', exact: true }).last()).toBeVisible();
    expect(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await mobile.getByRole('button', { name: '打开导航', exact: true }).first().click();
    await mobile.getByRole('link', { name: /任务调度/ }).first().click();
    await expect(mobile.getByRole('heading', { name: '任务调度', exact: true }).last()).toBeVisible();
    await mobile.goto(`${base}/${view}/settings`);
    await mobile.getByLabel('工作空间名称', { exact: true }).fill('通用界面验证');
    await mobile.getByRole('button', { name: '保存设置', exact: true }).click();
    if (['tabler', 'adminlte'].includes(view)) {
      const toast = mobile.locator('#feedback .toast');
      await expect(toast).toContainText('演示设置已保存到当前浏览器');
      await toast.getByRole('button', { name: '关闭提示', exact: true }).click();
      await expect(toast).toHaveCount(0);
      await mobile.getByRole('button', { name: '保存设置', exact: true }).click();
      await expect(toast).toBeVisible();
      await expect(toast).toHaveCount(0, { timeout: 6000 });
    }
    await mobile.reload();
    await expect(mobile.getByLabel('工作空间名称', { exact: true })).toHaveValue('通用界面验证');
    await mobile.goto(`${base}/${view}/`);
    await mobile.getByRole('button', { name: '切换明暗主题', exact: true }).click();
    await expect.poll(() => mobile.evaluate(() => document.documentElement.dataset.bsTheme === 'dark' || !!document.querySelector('.demo-dark'))).toBe(true);
    await mobile.screenshot({ path: `${screenshots}${view}-mobile-dark.png` });
    expect(mobileErrors).toEqual([]);
    await mobile.close();
    console.log(`${view}: mobile navigation, settings persistence and theme passed`);
  }
  await checkComponents(browser, base, screenshots);
  // Direct links and browser refresh must work under each deployment base.
  for (const path of ['/nuxt/tasks', '/prime/tasks', '/vben/tasks', '/pro/tasks', '/refine/tasks', '/tabler/tasks', '/adminlte/tasks', '/docs/guide']) {
    await page.goto(base + path);
    await expect(page.getByRole('heading', { name: path.startsWith('/docs') ? /快速了解/ : '任务调度', exact: !path.startsWith('/docs') }).last()).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: path.startsWith('/docs') ? /快速了解/ : '任务调度', exact: !path.startsWith('/docs') }).last()).toBeVisible();
  }
  expect((await page.request.get(`${base}/nuxt/assets/missing.js`)).status()).toBe(404);
  expect((await page.request.get(`${base}/vben/media/clip.mp4`, { headers: { Range: 'bytes=0-99' } })).status()).toBe(206);
  await page.close();
  console.log('Suite passed: eight views, navigation, tasks, media, responsive frame, deep-link refresh and asset errors.');
} finally { await browser?.close(); server?.kill(); }
