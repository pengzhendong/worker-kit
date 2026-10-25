import { test, expect, openDashboard, screenshot } from './fixtures';

test('runtime shows icon-based checks, honest unavailable metrics and per-page history', async ({ page }) => {
  await openDashboard(page, 'runtime');
  await expect(page.getByText('应用与依赖响应正常', { exact: true })).toBeVisible();
  await expect(page.getByText('3 / 3 可连接', { exact: true })).toBeVisible();
  await expect(page.locator('.wk-runtime-symbol .anticon')).toHaveCount(3);
  await expect(page.getByText('尚未接入 Cloudflare 指标', { exact: false })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: '每 30 秒检查依赖' })).not.toBeChecked();
  const checkbox = page.locator('.wk-runtime .ant-checkbox-wrapper');
  const box = await checkbox.locator('.ant-checkbox').boundingBox();
  const label = await checkbox.locator('.ant-checkbox-label').boundingBox();
  const button = await page.getByRole('button', { name: '刷新状态', exact: true }).boundingBox();
  expect(box).not.toBeNull(); expect(label).not.toBeNull(); expect(button).not.toBeNull();
  expect(Math.abs(box!.y + box!.height / 2 - label!.y - label!.height / 2)).toBeLessThan(1);
  expect(Math.abs(box!.y + box!.height / 2 - button!.y - button!.height / 2)).toBeLessThan(1);
  await expect(page.locator('.wk-runtime-history [role=img]')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width);
  await screenshot(page, 'runtime-status.png');
  await page.getByRole('button', { name: '刷新状态', exact: true }).click();
  await expect(page.locator('.wk-runtime-history [role=img]')).toHaveCount(2);
  await page.goto('/#/resources'); await expect(page.getByRole('heading', { name: '资源管理', exact: true })).toBeVisible();
  await openDashboard(page, 'runtime'); await expect(page.locator('.wk-runtime-history [role=img]')).toHaveCount(1);
});

test('runtime keeps dependency failures and provider failures visible without replacing unknown metrics with zero', async ({ page }) => {
  await page.route('**/api/admin/runtime', (route) => route.fulfill({ json: {
    application: { name: 'WorkerKit Dashboard', version: '0.2.0' }, runtime: 'Cloudflare Workers', environment: 'local', checkedAt: '2026-10-24T12:00:00Z', ok: false,
    version: { id: null, tag: null, createdAt: null }, checks: [{ name: 'KV', kind: 'kv', description: '应用设置', status: 'timeout', durationMs: 1500 }],
  } }));
  await page.route('**/api/admin/runtime/metrics', (route) => route.fulfill({ json: { source: 'cloudflare', status: 'error', message: '无法读取平台指标', from: '2026-10-24T11:00:00Z', to: '2026-10-24T12:00:00Z', requests: null, errors: null, cpuMsP50: null, cpuMsP99: null, wallMsP50: null, wallMsP99: null, memoryBytesP50: null, memoryBytesP99: null } }));
  await openDashboard(page, 'runtime');
  await expect(page.getByText('部分依赖需要关注', { exact: true })).toBeVisible();
  await expect(page.getByText('检查超时', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('无法读取平台指标');
  await expect(page.locator('[aria-label="请求量"]')).toContainText('—');
});

test('Cloudflare metrics use documented units and distinguish zero traffic from missing data', async ({ page }) => {
  let empty = false;
  await page.route('**/api/admin/runtime/metrics', (route) => route.fulfill({ json: { source: 'cloudflare', status: 'ok', message: 'Cloudflare 过去一小时聚合数据，可能采样并延迟', from: '2026-10-24T11:00:00Z', to: '2026-10-24T12:00:00Z', requests: empty ? 0 : 250, errors: empty ? 0 : 5, cpuMsP50: empty ? null : 1.5, cpuMsP99: empty ? null : 6, wallMsP50: empty ? null : 20, wallMsP99: empty ? null : 80, memoryBytesP50: empty ? null : 10485760, memoryBytesP99: empty ? null : 20971520 } }));
  await openDashboard(page, 'runtime');
  await expect(page.locator('[aria-label="调用错误率"]')).toContainText('2%');
  await expect(page.locator('[aria-label="CPU 时间 P50"]')).toContainText('1.5 ms');
  await expect(page.locator('[aria-label="隔离环境内存 P50"]')).toContainText('10 MB');
  empty = true; await page.getByRole('button', { name: '刷新状态', exact: true }).click();
  await expect(page.getByText('暂无请求，错误率不可计算', { exact: true })).toBeVisible();
  await expect(page.locator('[aria-label="调用错误率"]')).toContainText('—');
});

test('automatic checks refresh only dependencies and stop when the page unmounts', async ({ page }) => {
  let checks = 0, metrics = 0;
  page.on('request', (request) => { const path = new URL(request.url()).pathname; if (path === '/api/admin/runtime') checks++; if (path === '/api/admin/runtime/metrics') metrics++; });
  await openDashboard(page, 'runtime');
  await page.clock.install();
  await page.getByRole('checkbox', { name: '每 30 秒检查依赖' }).check();
  await page.clock.fastForward(31_000);
  await expect.poll(() => checks).toBe(2); expect(metrics).toBe(1);
  await page.goto('/#/resources'); await expect(page.getByRole('heading', { name: '资源管理', exact: true })).toBeVisible();
  await page.clock.fastForward(61_000); expect(checks).toBe(2);
});

test('runtime access is enforced before either report is requested', async ({ page }) => {
  await page.route('**/api/admin/access', (route) => route.fulfill({ json: { permissions: ['overview:read'] } }));
  const requests: string[] = [];
  page.on('request', (request) => { if (new URL(request.url()).pathname.startsWith('/api/admin/runtime')) requests.push(request.url()); });
  await page.goto('/#/runtime');
  await expect(page.getByText('无权访问此页面', { exact: true })).toBeVisible();
  expect(requests).toEqual([]);
});
