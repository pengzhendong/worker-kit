import { test, expect, openDashboard, screenshot } from './fixtures';

const secret = 'wk_fixture-only-not-a-working-secret';
const key = { id: 'key-1', owner: 'admin', name: '订阅同步脚本', prefix: 'wk_fixture', permissions: ['resources:read'], createdAt: '2026-10-24T12:00:00Z', expiresAt: '2026-11-24T12:00:00Z', revokedAt: null as string | null, lastUsedAt: null };

test('API catalog searches documented endpoints and opens the matching Scalar operation', async ({ page }) => {
  await openDashboard(page, 'api');
  await expect(page.getByText('共 27 个接口', { exact: true })).toBeVisible();
  await screenshot(page, 'api-catalog.png');
  await page.getByRole('searchbox', { name: '搜索接口', exact: true }).fill('查询资源');
  await expect(page.getByText('共 1 个接口', { exact: true })).toBeVisible();
  await expect(page.getByText('resources:read', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '查看文档', exact: true }).click();
  const frame = page.frameLocator('iframe[title="交互式 API 文档"]');
  await expect(frame.getByRole('heading', { name: '查询资源', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/#\/?api$/);
  await expect(page.getByRole('heading', { name: 'API 中心', exact: true })).toBeVisible();
});

test('API tokens validate drafts, show the secret once and revoke with confirmation', async ({ page }) => {
  let issued = false; let revoked = false; let calls = 0;
  await page.route('**/api/admin/api-keys?*', (route) => route.fulfill({ json: { items: issued ? [{ ...key, revokedAt: revoked ? '2026-10-24T12:05:00Z' : null }] : [], total: issued ? 1 : 0, page: 1, pageSize: 10, grantablePermissions: ['resources:read'] } }));
  await page.route('**/api/admin/api-keys', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    calls++; expect(route.request().postDataJSON()).toEqual({ name: key.name, expiresInDays: 30, permissions: ['resources:read'] });
    issued = true; return route.fulfill({ status: 201, json: { token: secret, key } });
  });
  await page.route('**/api/admin/api-keys/key-1', (route) => { expect(route.request().method()).toBe('DELETE'); revoked = true; return route.fulfill({ status: 204 }); });
  await openDashboard(page, 'api'); await page.getByRole('tab', { name: '访问令牌', exact: true }).click();
  await page.getByRole('button', { name: '创建令牌', exact: true }).click();
  const modal = page.getByRole('dialog', { name: '创建访问令牌', exact: true });
  await modal.getByRole('button', { name: /^创\s*建$/ }).click();
  await expect(modal.getByText('请输入令牌名称', { exact: true })).toBeVisible(); expect(calls).toBe(0);
  await page.getByLabel('令牌名称', { exact: true }).fill(key.name);
  await page.getByLabel('业务权限', { exact: true }).click();
  await page.getByRole('option', { name: '资源管理 · 查看', exact: true }).click();
  await page.getByLabel('令牌名称', { exact: true }).click();
  await screenshot(page, 'api-token-form.png');
  await modal.getByRole('button', { name: /^创\s*建$/ }).click();
  await expect(page.getByRole('dialog', { name: '保存你的访问令牌', exact: true })).toBeVisible();
  await expect(page.getByText(secret, { exact: true })).toBeVisible(); expect(calls).toBe(1);
  await page.getByRole('button', { name: '已保存，关闭', exact: true }).click();
  await expect(page.getByText(secret, { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }))).not.toContain(secret);
  await expect(page.getByText(key.name, { exact: true })).toBeVisible();
  await screenshot(page, 'api-tokens.png');
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  expect(revoked).toBe(false);
  await page.getByRole('button', { name: '确认撤销', exact: true }).click();
  await expect(page.getByText('已撤销', { exact: true })).toBeVisible();
});

test('Scalar renders real schemas locally without external requests and keeps host navigation intact', async ({ page }) => {
  const external: string[] = []; page.on('request', (request) => { if (!request.url().startsWith('http://127.0.0.1:4174')) external.push(request.url()); });
  await openDashboard(page, 'api'); await page.getByRole('tab', { name: '接口文档', exact: true }).click();
  const frame = page.frameLocator('iframe[title="交互式 API 文档"]');
  await expect(frame.getByRole('heading', { name: 'WorkerKit API', exact: true })).toBeVisible();
  await expect(frame.getByRole('button', { name: '生成 SDK', exact: true })).toBeHidden();
  await frame.locator('body').evaluate(() => document.fonts.ready);
  await screenshot(page, 'api-documentation.png');
  await expect(page).toHaveURL(/#\/?api$/); expect(external).toEqual([]);
  await page.getByRole('tab', { name: '接口列表', exact: true }).click();
  await expect(page.locator('iframe')).toHaveCount(0);
});

test.describe('API permissions', () => {
  test.use({ grants: ['api:read'] });
  test('API documentation readers cannot manage or list tokens', async ({ page }) => {
    const requests: string[] = []; page.on('request', (request) => { if (new URL(request.url()).pathname === '/api/admin/api-keys') requests.push(request.url()); });
    await openDashboard(page, 'api');
    await expect(page.getByRole('tab', { name: '访问令牌', exact: true })).toHaveCount(0); expect(requests).toEqual([]);
  });
});

test('a document session expiry returns the host to login', async ({ page }) => {
  await page.route('**/api/admin/openapi.json', (route) => route.request().frame().url().includes('/reference') ? route.fulfill({ status: 401, json: { error: { code: 'unauthorized', message: 'expired' } } }) : route.fallback());
  await openDashboard(page, 'api'); await page.getByRole('tab', { name: '接口文档', exact: true }).click();
  await expect(page.getByLabel('用户名', { exact: true })).toBeVisible();
});

test('Scalar sends a same-origin read request through its real client', async ({ page }) => {
  await page.route('**/health', (route) => route.fulfill({ json: { ok: true, service: 'workerkit-ui-fixture' } }));
  await openDashboard(page, 'api');
  await page.getByRole('searchbox', { name: '搜索接口', exact: true }).fill('服务存活检查');
  await page.getByRole('button', { name: '查看文档', exact: true }).click();
  const frame = page.frameLocator('iframe[title="交互式 API 文档"]');
  await frame.getByRole('heading', { name: '运行', exact: true }).scrollIntoViewIfNeeded();
  await frame.getByRole('button', { name: /^GET \/health 服务存活检查/ }).click();
  await frame.getByRole('button', { name: /^测试请求 \(get \/health\)$/ }).click();
  const completed = page.waitForResponse((response) => new URL(response.url()).pathname === '/health');
  await frame.getByRole('button', { name: /^向 .*发送 get 请求$/ }).click();
  expect(await (await completed).json()).toEqual({ ok: true, service: 'workerkit-ui-fixture' });
  await expect(frame.getByRole('link', { name: '200 OK', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/#\/?api$/);
});
