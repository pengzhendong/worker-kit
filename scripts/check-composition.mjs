import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const base = process.env.PAYLOAD_PREVIEW_URL || 'http://kit.localhost:5184';
const sonic = process.env.SONIC_PREVIEW_URL || 'http://sonic.kit.localhost:5184';
const settings = Object.fromEntries((await readFile(new URL('../examples/payload-dashboard/app/.env', import.meta.url), 'utf8')).split('\n').filter(x => x.includes('=')).map(x => { const i = x.indexOf('='); return [x.slice(0, i), x.slice(i + 1)]; }));
const output = new URL('../test-results/composition/', import.meta.url).pathname;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage(), errors = [];
page.on('pageerror', error => errors.push(error.message));
const plans = [], alarmPlans = [];
let stage = 'anonymous boundaries';
try {
  for (const origin of [base, sonic]) {
    expect((await context.request.get(origin + '/api/workerkit/workspace')).status()).toBe(401);
    expect((await context.request.post(origin + '/api/workerkit/managed-tasks', { data: {}, headers: { Origin: origin } })).status()).toBe(401);
  }
  stage = 'native authentication';
  expect((await context.request.post(base + '/api/users/login', { headers: { Origin: base }, data: { username: settings.PAYLOAD_DEMO_USERNAME, password: settings.PAYLOAD_DEMO_PASSWORD } })).status()).toBe(200);
  await context.request.get(sonic + '/auth/login');
  const csrf = () => context.cookies(sonic).then(cookies => cookies.find(c => c.name === 'csrf_token')?.value || '');
  await context.request.post(sonic + '/auth/login/form', { headers: { Origin: sonic, 'X-CSRF-Token': await csrf() }, form: { email: 'admin', password: settings.PAYLOAD_DEMO_PASSWORD } });
  const headers = async origin => ({ Origin: origin, ...(origin === sonic ? { 'X-CSRF-Token': await csrf() } : {}) });
  const inventory = async origin => {
    const response = await context.request.get(origin + '/api/workerkit/workspace');
    expect(response.status()).toBe(200);
    return response.json();
  };
  for (const [backend, origin] of [['payload', base], ['sonic', sonic]]) {
    stage = backend + ' persistent tasks';
    const before = await inventory(origin); expect(before.backend).toBe(backend);
    const created = await context.request.post(origin + '/api/workerkit/managed-tasks', { headers: await headers(origin), data: { task: 'check-bindings', inputs: {}, schedule: { kind: 'interval', minutes: 60 } } });
    expect(created.status()).toBe(201);
    const plan = await created.json(); plans.push({ origin, id: plan.id });
    const post = action => context.request.post(origin + '/api/workerkit/managed-tasks/' + action, { headers: { Origin: origin }, data: { id: plan.id } });
    // Native SonicJS CSRF applies to API writes in addition to WorkerKit's origin check.
    const mutate = async action => context.request.post(origin + '/api/workerkit/managed-tasks/' + action, { headers: await headers(origin), data: { id: plan.id } });
    expect((await mutate('run')).status()).toBe(200);
    let current = await inventory(origin);
    const run = current.runs.find(run => run.planId === plan.id);
    expect(run.status).toBe('succeeded'); expect(run.progress).toMatchObject({ completed: 2, total: 2 });
    expect(run.output.logs.join('\n')).toContain('D1: ok');
    expect(run.output.logs[0]).toBe('后端：' + (backend === 'sonic' ? 'SonicJS' : 'Payload'));
    expect((await mutate('pause')).status()).toBe(200);
    expect((await inventory(origin)).plans.find(p => p.id === plan.id).scheduleId).toBeUndefined();
    expect((await mutate('resume')).status()).toBe(200);
    expect((await inventory(origin)).plans.find(p => p.id === plan.id).scheduleId).toBeTruthy();
    expect((await context.request.post(origin + '/api/workerkit/managed-tasks/run', { headers: { Origin: 'https://untrusted.test' }, data: { id: plan.id } })).status()).toBe(403);
    const other = await inventory(origin === base ? sonic : base);
    expect(other.plans.some(p => p.id === plan.id)).toBe(false);
    const automatic = await context.request.post(origin + '/api/workerkit/managed-tasks', { headers: await headers(origin), data: { task: 'check-bindings', inputs: {}, schedule: { kind: 'interval', minutes: 1 } } });
    expect(automatic.status()).toBe(201);
    const alarm = { origin, id: (await automatic.json()).id }; plans.push(alarm); alarmPlans.push(alarm);
  }
  const views = [['Nuxt UI', 'nuxt'], ['PrimeVue / Sakai', 'prime'], ['Vben Admin', 'vben'], ['Ant Design Pro', 'pro'], ['Refine', 'refine'], ['Tabler', 'tabler'], ['AdminLTE', 'adminlte'], ['VitePress', 'docs']];
  for (const backend of ['payload', 'sonic']) {
    await page.goto(base + '/?view=nuxt&backend=' + backend);
    for (const [label, view] of views) {
      stage = backend + ' / ' + view;
      await page.getByRole('tab', { name: label, exact: true }).click();
      const frame = page.frameLocator('#preview');
      await expect(frame.locator('[data-workspace]')).toContainText('依赖正常', { timeout: 20000 });
      await expect(frame.locator('[data-workspace]')).toContainText('D1: ok');
      expect(await frame.locator('body').getAttribute('data-workerkit-backend')).toBe(backend);
      await expect(frame.getByRole('button', { name: '创建计划', exact: true })).toBeVisible();
    }
  }
  stage = 'native UI creation and execution';
  for (const [backend, origin] of [['payload', base], ['sonic', sonic]]) {
    await page.goto(base + '/?view=nuxt&backend=' + backend);
    const frame = page.frameLocator('#preview');
    const before = await inventory(origin);
    const minutes = Array.from({ length: 10021 }, (_, i) => i + 60).find(value => !before.plans.some(plan => plan.schedule.kind === 'interval' && plan.schedule.minutes === value));
    await frame.getByRole('spinbutton').fill(String(minutes));
    await frame.getByRole('button', { name: '创建计划', exact: true }).click();
    await expect.poll(async () => (await inventory(origin)).plans.length).toBe(before.plans.length + 1);
    const added = (await inventory(origin)).plans.find(p => !before.plans.some(old => old.id === p.id));
    plans.push({ origin, id: added.id });
    // Select the newly created schedule, not whichever historical plan happens to be first.
    const row = frame.getByText(new RegExp('^每 ' + minutes + ' 分钟')).locator('..').locator('..');
    await row.getByRole('button', { name: '运行', exact: true }).click();
    await expect.poll(async () => (await inventory(origin)).runs.some(r => r.planId === added.id && r.status === 'succeeded')).toBe(true);
  }
  await page.goto(base + '/?view=nuxt&backend=payload');
  const frame = page.frameLocator('#preview');
  await expect(frame.locator('[data-workspace]')).toContainText('依赖正常');
  await page.screenshot({ path: output + 'desktop.png' });
  stage = 'desktop content and sidebar scrolling';
  let child = page.frames().find(f => f.url().includes('/nuxt/workspace'));
  const position = async () => ({ navbar: await child.getByRole('button', { name: '切换明暗主题', exact: true }).boundingBox(), brand: await child.locator('.brand').boundingBox() });
  const desktopBefore = await position();
  expect(desktopBefore.navbar).not.toBeNull(); expect(desktopBefore.brand).not.toBeNull();
  await child.locator('[data-content-scroll]').evaluate(el => el.scrollTo({ top: el.scrollHeight }));
  await expect.poll(() => child.locator('[data-content-scroll]').evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  const desktopAfter = await position();
  expect(Math.abs(desktopBefore.navbar.y - desktopAfter.navbar.y)).toBeLessThan(1);
  expect(Math.abs(desktopBefore.brand.y - desktopAfter.brand.y)).toBeLessThan(1);
  await page.setViewportSize({ width: 1440, height: 420 });
  const shortBefore = await position();
  const sidebarScroll = await child.getByRole('link', { name: '主题', exact: true }).evaluate(el => {
    for (let parent = el.parentElement; parent; parent = parent.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight) { parent.scrollTo({ top: parent.scrollHeight }); return { top: parent.scrollTop, height: parent.clientHeight }; }
    }
    throw Error('Sidebar has no independent scroll container');
  });
  expect(sidebarScroll.top).toBeGreaterThan(0);
  const shortAfter = await position();
  expect(Math.abs(shortBefore.brand.y - shortAfter.brand.y)).toBeLessThan(1);
  stage = 'mobile switching and layout';
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(frame.locator('[data-workspace]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  child = page.frames().find(f => f.url().includes('/nuxt/workspace'));
  expect(await child.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const before = await child.getByRole('button', { name: '切换明暗主题', exact: true }).boundingBox();
  await child.locator('[data-content-scroll]').evaluate(el => el.scrollTo({ top: el.scrollHeight }));
  const after = await child.getByRole('button', { name: '切换明暗主题', exact: true }).boundingBox();
  expect(Math.abs(before.y - after.y)).toBeLessThan(1);
  await frame.locator('[data-slot="toggle"]').first().click();
  const overviewLink = frame.getByRole('link', { name: '运行概览', exact: true });
  await expect(overviewLink).toBeVisible(); await overviewLink.click();
  await expect(frame.getByRole('heading', { name: '运行概览', exact: true }).last()).toBeVisible();
  await expect(overviewLink).toBeHidden();
  await page.getByRole('tab', { name: 'Nuxt UI', exact: true }).click();
  // Re-selecting the active preview preserves its current route instead of reloading it.
  await expect(frame.getByRole('heading', { name: '运行概览', exact: true }).last()).toBeVisible();
  await frame.locator('[data-slot="toggle"]').first().click();
  await frame.getByRole('link', { name: '业务工作台', exact: true }).click();
  await expect(frame.locator('[data-workspace]')).toContainText('依赖正常');
  await page.getByLabel('选择后端').selectOption('sonic');
  await expect(frame.locator('[data-workspace]')).toContainText('依赖正常');
  await expect(frame.locator('body')).toHaveAttribute('data-workerkit-backend', 'sonic');
  await expect(frame.locator('[data-workspace]')).toContainText('依赖正常');
  await expect(frame.getByRole('button', { name: '刷新', exact: true })).toBeEnabled();
  await page.screenshot({ path: output + 'mobile.png' });
  stage = 'native scheduled alarms';
  for (const plan of alarmPlans) await expect.poll(async () => (await inventory(plan.origin)).runs.some(r => r.planId === plan.id && r.status === 'succeeded'), { timeout: 85000, intervals: [1000, 3000, 5000] }).toBe(true);
  expect(errors).toEqual([]);
  await writeFile(output + 'result.json', JSON.stringify({ combinations: 16, nativeSessions: true, persistedTasksAndLogs: true, separateBackendState: true, nativeUiCreation: true, mobileBackendSwitch: true, realScheduledAlarms: true, layoutPositions: { desktopBefore, desktopAfter, shortBefore, shortAfter, sidebarScroll, mobileBefore: before, mobileAfter: after }, browserErrors: errors }, null, 2));
  console.log('Composition passed: 8 frontends × 2 backends, native sessions, persistent task lifecycle/logs, isolation and mobile switching.');
} catch (error) { console.error(stage + ': ' + String(error.message).replaceAll(settings.PAYLOAD_DEMO_PASSWORD, '[redacted]')); process.exitCode = 1; }
finally {
  for (const plan of plans) await context.request.post(plan.origin + '/api/workerkit/managed-tasks/pause', { headers: { Origin: plan.origin, 'X-CSRF-Token': (await context.cookies(plan.origin)).find(c => c.name === 'csrf_token')?.value || '' }, data: { id: plan.id } }).catch(() => {});
  await browser.close();
}
