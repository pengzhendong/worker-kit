import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { test, expect, openDashboard, screenshot } from './fixtures';

async function navigate(page: Page, name: string) {
  const trigger = page.getByRole('button', { name: '打开导航', exact: true });
  if (await trigger.isVisible()) await trigger.click();
  await page.getByRole('menuitem', { name, exact: true }).click();
}
const date = '2026-10-24T12:00:00.000Z';
const session = { user: 'admin', expiresAt: Date.parse(date) / 1000 + 43200 };

test.describe('login handling', () => {
  test.use({ scenario: 'logged-out' });
  test('login distinguishes credentials, throttling and network errors and blocks duplicate submission', async ({ page }) => {
    let calls = 0; let release!: () => void; const pending = new Promise<void>((resolve) => { release = resolve; });
    await page.route('**/api/auth/login', async (route) => {
      calls++;
      if (calls === 1) { await pending; return route.fulfill({ status: 401, json: { error: { code: 'invalid_credentials', message: 'bad' } } }); }
      if (calls === 2) return route.fulfill({ status: 429, headers: { 'Retry-After': '2' }, json: { error: { code: 'login_limited' } } });
      if (calls === 3) return route.abort('failed');
      return route.fulfill({ json: session });
    });
    await page.goto('/#/resources');
    await page.getByLabel('用户名', { exact: true }).fill('admin'); await page.getByLabel('密码', { exact: true }).fill('wrong');
    await page.getByLabel('密码', { exact: true }).press('Enter'); await expect.poll(() => calls).toBe(1);
    await page.getByLabel('密码', { exact: true }).press('Enter'); expect(calls).toBe(1); release();
    await expect(page.getByText('用户名或密码错误', { exact: true })).toBeVisible();
    await expect(page.getByLabel('用户名', { exact: true })).toHaveValue('admin');
    await page.getByRole('button', { name: /^登\s*录$/ }).click();
    await expect(page.getByRole('button', { name: /秒后重试/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: /^登\s*录$/ })).toBeEnabled();
    await expect(page.getByRole('button', { name: /^登\s*录$/ })).toHaveAttribute('aria-busy', 'false');
    await page.getByRole('button', { name: /^登\s*录$/ }).click();
    await expect(page.getByText('网络连接失败，请检查连接后重试', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /^登\s*录$/ }).click();
    await expect(page.getByRole('heading', { name: '资源管理', exact: true })).toBeVisible(); expect(calls).toBe(4);
  });
});

test('401 ends the old session once, clears drafts and reloads permissions on login while preserving theme', async ({ page }) => {
  let expired = false; let relogged = false;
  await page.route('**/api/admin/access', (route) => route.fulfill({ json: { permissions: relogged ? ['resources:read'] : ['resources:read', 'resources:create', 'settings:read'] } }));
  await page.route('**/api/auth/login', (route) => { relogged = true; expired = false; return route.fulfill({ json: session }); });
  await page.route('**/api/admin/resources?*', (route) => expired
    ? route.fulfill({ status: 401, json: { error: { code: 'unauthorized', message: 'expired' } } }) : route.fallback());
  await openDashboard(page, 'resources');
  const theme = await page.evaluate(() => localStorage.getItem('workerkit.theme'));
  await page.getByRole('button', { name: '＋ 新增资源', exact: true }).click(); await page.getByLabel('名称', { exact: true }).fill('旧会话草稿');
  await page.getByRole('dialog').getByRole('button', { name: /^取\s*消$/ }).click();
  expired = true; await page.getByRole('button', { name: /^刷\s*新$/ }).click();
  await expect(page.getByLabel('用户名', { exact: true })).toBeVisible();
  await expect(page.getByText('登录已过期，请重新登录', { exact: true })).toHaveCount(1);
  await page.getByLabel('用户名', { exact: true }).fill('admin'); await page.getByLabel('密码', { exact: true }).fill('password');
  await page.getByRole('button', { name: /^登\s*录$/ }).click();
  await expect(page.getByRole('heading', { name: '资源管理', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '＋ 新增资源', exact: true })).toHaveCount(0);
  await expect(page.getByText('旧会话草稿', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('workerkit.theme'))).toBe(theme);
});

test('leaving a loading page cancels its request before it can update another page', async ({ page }) => {
  let began!: () => void; const started = new Promise<void>((resolve) => { began = resolve; });
  let aborted = false;
  page.on('requestfailed', (request) => { if (new URL(request.url()).pathname === '/api/admin/resources') aborted = true; });
  await page.route('**/api/admin/resources?*', async () => { began(); });
  await page.goto('/#/resources'); await started;
  await expect(page.getByRole('heading', { name: '资源管理', exact: true })).toBeVisible();
  await navigate(page, '文件管理'); await expect(page.getByText('使用说明.txt', { exact: true })).toBeVisible();
  await expect.poll(() => aborted).toBe(true);
  await expect(page.getByText('请求已取消', { exact: true })).toHaveCount(0);
});

test('403, service failures and network errors keep the current identity and allow retry', async ({ page }) => {
  let status: 'ok' | 'forbidden' | 'unavailable' | 'offline' = 'ok';
  await page.route('**/api/admin/resources?*', (route) => status === 'ok' ? route.fallback() : status === 'offline' ? route.abort('failed') : route.fulfill({ status: status === 'forbidden' ? 403 : 503, json: { error: { code: status, message: status === 'forbidden' ? '没有资源读取权限' : '资源服务暂时不可用' } } }));
  await openDashboard(page, 'resources');
  for (const [next, message] of [['forbidden', '没有资源读取权限'], ['unavailable', '资源服务暂时不可用'], ['offline', '网络连接失败，请稍后重试']] as const) {
    status = next; await page.getByRole('button', { name: /^刷\s*新$/ }).click(); await expect(page.getByText(message, { exact: true })).toBeVisible();
    await expect(page.getByLabel('用户名', { exact: true })).toHaveCount(0);
    await expect(page.getByText('示例订阅源', { exact: true })).toBeVisible();
  }
  status = 'ok'; await page.getByRole('button', { name: /^重\s*试$/ }).click(); await expect(page.getByRole('alert')).toHaveCount(0);
});

test('page rendering failures show a boundary while navigation continues working', async ({ page }) => {
  await page.route('**/web/OverviewPage.tsx*', (route) => route.fulfill({ contentType: 'application/javascript', body: 'export function OverviewPage(){ throw new Error("deliberate page render failure"); }' }));
  await page.goto('/#/overview'); await expect(page.getByRole('alert', { name: '页面错误', exact: true })).toBeVisible();
  await expect(page.getByText('deliberate page render failure', { exact: true })).toHaveCount(0);
  await screenshot(page, 'page-error-boundary.png');
  await navigate(page, '资源管理'); await expect(page.getByRole('heading', { name: '资源管理', exact: true })).toBeVisible();
  await expect(page.getByRole('alert', { name: '页面错误', exact: true })).toHaveCount(0);
});

test('application failures also have a safe fallback outside the application provider', async ({ page }) => {
  await page.route('**/web/Dashboard.tsx*', (route) => route.fulfill({ contentType: 'application/javascript', body: 'export default function Dashboard(){ throw new Error("deliberate application render failure"); }' }));
  await page.goto('/#/resources');
  await expect(page.getByRole('alert', { name: '应用错误', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '重新加载应用', exact: true })).toBeVisible();
});

test('runtime tools report real endpoints, disabled retention and recover an intentional rendering failure', async ({ page }) => {
  await openDashboard(page, 'tools'); await page.getByRole('tab', { name: '运行与恢复', exact: true }).click();
  await expect(page.getByText('尚未检查。结果仅代表本次检查时的连接情况。', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '检查依赖连接', exact: true }).click(); await expect(page.getByText('D1 · 可连接 · 3 ms', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '查看保留策略', exact: true }).click(); await expect(page.getByText('保留策略尚未启用，现有日志保持保留。', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '清理过期操作日志', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '触发演示页面错误', exact: true }).click();
  await expect(page.getByRole('alert', { name: '页面错误', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '重试当前页面', exact: true }).click();
  await expect(page.getByText('演示页面正常。触发错误后，外层导航仍可使用。', { exact: true })).toBeVisible();
  await page.locator('[data-workerkit-region="content"]').evaluate((node) => node.scrollTo(0, 0));
  await screenshot(page, 'tools-runtime.png');
});

test('file downloads pass through the session client and produce the expected file', async ({ page }) => {
  await page.route('**/api/admin/files/download?*', (route) => route.fulfill({ contentType: 'text/plain', body: 'session-scoped download' }));
  await openDashboard(page, 'files');
  const received = page.waitForEvent('download'); await page.getByRole('link', { name: '下载', exact: true }).first().click();
  const file = await received; expect(file.suggestedFilename()).toBe('使用说明.txt'); expect(await readFile((await file.path())!, 'utf8')).toBe('session-scoped download');
});

test('resource export uses the session client and downloads JSON while keeping the application open', async ({ page }) => {
  await page.route('**/api/admin/resources/export?*', (route) => route.fulfill({ contentType: 'application/json', body: '[{"id":"exported"}]' }));
  await openDashboard(page, 'resources');
  const received = page.waitForEvent('download'); await page.getByRole('link', { name: '导出 JSON', exact: true }).click();
  const file = await received; expect(file.suggestedFilename()).toBe('resources.json'); expect(JSON.parse(await readFile((await file.path())!, 'utf8'))).toEqual([{ id: 'exported' }]);
  await expect(page.getByRole('heading', { name: '资源管理', exact: true })).toBeVisible();
});

test('an expired resource export returns to login without navigating to an error document', async ({ page }) => {
  await page.route('**/api/admin/resources/export?*', (route) => route.fulfill({ status: 401, json: { error: { code: 'unauthorized', message: 'expired' } } }));
  await openDashboard(page, 'resources'); await page.getByRole('link', { name: '导出 JSON', exact: true }).click();
  await expect(page.getByLabel('用户名', { exact: true })).toBeVisible();
  await expect(page.getByText('登录已过期，请重新登录', { exact: true })).toHaveCount(1);
  await expect(page).toHaveURL(/#\/?resources$/);
});
