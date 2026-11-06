import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.PAYLOAD_PREVIEW_URL || 'http://kit.localhost:5184';
const sonic = process.env.SONIC_PREVIEW_URL || 'http://sonic.kit.localhost:5184';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
page.setDefaultTimeout(30000);
page.setDefaultNavigationTimeout(45000);
const errors = [], documents = [], measurements = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (request.isNavigationRequest() && request.frame() !== page.mainFrame()) documents.push(request.url()); });
const workspace = () => page.frameLocator('#preview').locator('[data-workspace]');
const login = async () => expect((await context.request.post(base + '/api/users/login', { headers: { Origin: base }, data: { username: 'admin', password: 'password' } })).status()).toBe(200);
async function select(name, path, cached = false) {
  const before = documents.length, start = performance.now();
  const navigation = cached ? null : page.waitForEvent('framenavigated', { predicate: frame => frame !== page.mainFrame() && new URL(frame.url()).pathname === path });
  await page.getByRole('tab', { name, exact: true }).click();
  if (navigation) await navigation;
  await expect(page.locator('.stage')).toHaveAttribute('aria-busy', 'false', { timeout: 30000 });
  const shellMs = Math.round(performance.now() - start);
  await expect(workspace()).toContainText('依赖正常', { timeout: 30000 });
  if (cached) expect(documents.length - before).toBe(0);
  expect(await page.locator('iframe').count()).toBeLessThanOrEqual(8);
  const result = { name, cached, shellMs, ms: Math.round(performance.now() - start), documentLoads: documents.length - before };
  measurements.push(result);
  console.log(JSON.stringify(result));
}
try {
  await login();
  await page.goto(base + '/?view=nuxt&preload=off');
  await expect(workspace()).toContainText('依赖正常', { timeout: 45000 });
  const nativeFrame = await page.locator('#preview').elementHandle();
  await nativeFrame.contentFrame().then(frame => frame.evaluate(() => { window.__previewTest = 'kept'; }));
  await select('Vben Admin', '/vben/workspace');
  await select('Nuxt UI', '/nuxt/workspace', true);
  expect(await page.frameLocator('#preview').locator('body').evaluate(() => window.__previewTest)).toBe('kept');
  await select('Vben Admin', '/vben/workspace', true);
  await select('Vben Admin', '/vben/workspace', true);
  await select('PrimeVue / Sakai', '/prime/workspace');
  await select('Tabler', '/tabler/workspace');
  // Visiting a fourth frontend must not evict the first framework.
  await select('Nuxt UI', '/nuxt/workspace', true);
  for (const [name, path] of [['Ant Design Pro', '/pro/workspace'], ['Refine', '/refine/workspace'], ['AdminLTE', '/adminlte/workspace'], ['VitePress', '/docs/workspace.html']]) {
    await select(name, path);
    await select('Tabler', '/tabler/workspace', true);
  }
  await select('VitePress', '/docs/workspace.html', true);
  expect(await page.locator('iframe').count()).toBe(8);
  // Hold an old authenticated read: switching the shell must not wait for it,
  // and its late response must never restore private data after logout.
  const oldData = await (await context.request.get(base + '/api/workerkit/workspace')).json();
  let release, held = false;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/api/workerkit/workspace', async route => {
    if (!held && new URL(route.request().frame().url()).pathname === '/tabler/workspace') {
      held = true; await gate; await route.fulfill({ json: oldData });
    } else await route.continue();
  });
  const before = documents.length, switchStarted = performance.now();
  await page.getByRole('tab', { name: 'Tabler', exact: true }).click();
  await expect(page.locator('.stage')).toHaveAttribute('aria-busy', 'false', { timeout: 1000 });
  await expect(workspace()).toBeVisible();
  const heldShellMs = Math.round(performance.now() - switchStarted);
  await expect(workspace()).toContainText('正在更新工作台数据');
  await expect(workspace()).not.toContainText('依赖正常');
  expect(documents.length).toBe(before);
  await workspace().evaluate(element => {
    window.__privateFlash = false;
    new MutationObserver(() => { if (element.textContent.includes('admin')) window.__privateFlash = true; }).observe(element, { childList: true, subtree: true, characterData: true });
  });
  await select('VitePress', '/docs/workspace.html', true);
  await context.clearCookies();
  await page.getByRole('tab', { name: 'Tabler', exact: true }).click();
  await expect(page.locator('.stage')).toHaveAttribute('aria-busy', 'false', { timeout: 1000 });
  release();
  await expect(workspace()).toContainText('登录后端', { timeout: 45000 });
  expect(await workspace().evaluate(() => window.__privateFlash)).toBe(false);
  await page.unroute('**/api/workerkit/workspace');
  console.log(JSON.stringify({ heldShellMs, staleAuthenticatedResponseDiscarded: true }));
  await login();
  await select('Nuxt UI', '/nuxt/workspace', true);
  await select('Tabler', '/tabler/workspace', true);
  // Cache public component routes as well as Workspace, preserving their state.
  for (const [name, view] of [['Nuxt UI', 'nuxt'], ['PrimeVue / Sakai', 'prime'], ['Vben Admin', 'vben'], ['Ant Design Pro', 'pro'], ['Refine', 'refine'], ['Tabler', 'tabler'], ['AdminLTE', 'adminlte']]) {
    await page.getByRole('tab', { name, exact: true }).click();
    await expect(workspace()).toContainText('依赖正常', { timeout: 30000 });
    const child = page.frameLocator('#preview');
    const navigate = async label => {
      const link = child.getByRole('link', { name: new RegExp(label) }).first();
      const menu = child.getByRole('menuitem', { name: new RegExp('^' + label + '$') }).first();
      await link.or(menu).first().click();
    };
    await navigate('布局');
    await child.getByRole('button', { name: '填充长内容', exact: true }).click();
    await expect(child.getByRole('button', { name: '收起长内容', exact: true })).toBeVisible();
    await page.getByRole('tab', { name: 'VitePress', exact: true }).click();
    await expect(page.locator('.stage')).toHaveAttribute('aria-busy', 'false');
    const docsBefore = documents.length, start = performance.now();
    await page.getByRole('tab', { name, exact: true }).click();
    await expect(page.locator('.stage')).toHaveAttribute('aria-busy', 'false', { timeout: 1000 });
    await expect(child.getByRole('button', { name: '收起长内容', exact: true })).toBeVisible();
    expect(documents.length).toBe(docsBefore);
    console.log(JSON.stringify({ view, componentStateKept: true, shellMs: Math.round(performance.now() - start) }));
    await navigate('业务工作台');
    await expect(workspace()).toContainText('依赖正常', { timeout: 30000 });
  }
  // Rapid selections must not let a late load restore the wrong active view.
  await page.evaluate(() => { for (const view of ['nuxt', 'tabler', 'prime']) document.querySelector(`[data-view="${view}"]`).click(); });
  await expect(page.locator('#preview')).toHaveAttribute('src', base + '/prime/workspace');
  await expect(page.locator('.stage')).toHaveAttribute('aria-busy', 'false');
  await expect(workspace()).toContainText('依赖正常');
  await page.getByRole('button', { name: '手机', exact: true }).click();
  await select('Tabler', '/tabler/workspace', true);
  await expect(page.locator('#preview')).toHaveClass('mobile');
  // Switching native CMS or backend drops old app instances, including hidden ones.
  await page.getByRole('tab', { name: 'Payload', exact: true }).click();
  await expect(page.locator('iframe')).toHaveCount(1);
  await page.getByRole('tab', { name: 'Nuxt UI', exact: true }).click();
  await expect(workspace()).toContainText('依赖正常', { timeout: 30000 });
  await page.getByRole('combobox', { name: '选择后端' }).selectOption('sonic');
  await expect(page.locator('#preview')).toHaveAttribute('src', sonic + '/nuxt/workspace');
  await expect(page.locator('iframe')).toHaveCount(1);
  await expect(workspace()).toContainText('登录后端', { timeout: 45000 });
  await context.request.get(sonic + '/auth/login');
  const csrf = (await context.cookies(sonic)).find(cookie => cookie.name === 'csrf_token')?.value || '';
  await context.request.post(sonic + '/auth/login/form', { headers: { Origin: sonic, 'X-CSRF-Token': csrf }, form: { email: 'admin', password: 'password' } });
  expect((await context.request.get(sonic + '/api/workerkit/workspace')).status()).toBe(200);
  await select('Vben Admin', '/vben/workspace');
  await select('Nuxt UI', '/nuxt/workspace', true);
  expect(await page.frameLocator('#preview').locator('body').getAttribute('data-workerkit-backend')).toBe('sonic');
  await page.getByRole('combobox', { name: '选择后端' }).selectOption('payload');
  await expect(workspace()).toContainText('依赖正常', { timeout: 30000 });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await mkdir('test-results/preview-switching', { recursive: true });
  await writeFile('test-results/preview-switching/result.json', JSON.stringify({ base, measurements, errors }, null, 2));
  console.log(JSON.stringify({ base, measurements, errors }, null, 2));
} finally { await browser.close(); }
