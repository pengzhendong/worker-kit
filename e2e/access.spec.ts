import type { Page } from '@playwright/test';
import { test, expect, openDashboard, screenshot } from './fixtures';

async function openNavigation(page: Page) {
  const trigger = page.getByRole('button', { name: '打开导航', exact: true });
  if (await trigger.isVisible()) await trigger.click();
}

test.describe('read-only access', () => {
  test.use({ grants: ['resources:read', 'files:read', 'settings:read'] });
  test('declared grants control menus and resource, file and settings operations', async ({ page }) => {
    await openDashboard(page, 'resources');
    for (const name of ['＋ 新增资源', '导出 JSON', '编辑', '删除']) await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: '导出 JSON', exact: true })).toHaveCount(0);
    await expect(page.getByRole('checkbox')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '示例订阅源', exact: true })).toHaveCount(0);
    await screenshot(page, 'resources-read-only.png');
    await openNavigation(page);
    await expect(page.getByRole('menuitem', { name: '资源管理', exact: true })).toBeVisible();
    for (const name of ['工作台', '操作日志']) await expect(page.getByRole('menuitem', { name, exact: true })).toHaveCount(0);
    await page.getByRole('menuitem', { name: '文件管理', exact: true }).click();
    await expect(page).toHaveURL(/#\/files$/);
    await expect(page.getByText('使用说明.txt', { exact: true })).toBeVisible();
    await expect(page.locator('input[type=file]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: '下载', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '删除', exact: true })).toHaveCount(0);
    await page.goto('/#/settings');
    await expect(page.getByLabel('应用名称', { exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: '保存设置', exact: true })).toHaveCount(0);
    await openNavigation(page);
    await page.getByRole('button', { name: '用户菜单，admin', exact: true }).click();
    await expect(page.getByRole('menuitem', { name: '系统设置', exact: true })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'API 中心', exact: true })).toHaveCount(0);
  });
  test('direct unauthorized and unknown routes never render protected pages or fetch their data', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => { if (new URL(request.url()).pathname === '/api/admin/audit') requests.push(request.url()); });
    await page.goto('/#/audit');
    await expect(page.getByText('无权访问此页面', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: '操作日志', exact: true })).toHaveCount(0);
    await screenshot(page, 'module-forbidden.png');
    await page.goto('/#/unknown');
    await expect(page.getByText('页面不存在', { exact: true })).toBeVisible();
    expect(requests).toEqual([]);
  });
});

test('access loading failures fail closed and support retry without mounting business pages', async ({ page, grants }) => {
  let available = false; const business: string[] = [];
  await page.route('**/api/admin/access', (route) => !available
    ? route.fulfill({ status: 503, json: { error: { code: 'unavailable', message: '权限服务暂时不可用' } } })
    : route.fulfill({ json: { permissions: grants } }));
  page.on('request', (request) => { if (/\/api\/admin\/(resources|settings)$/.test(new URL(request.url()).pathname)) business.push(request.url()); });
  await page.goto('/#/resources');
  await expect(page.getByText('无法加载访问权限', { exact: true })).toBeVisible();
  await expect(page.locator('[data-workerkit-shell]')).toHaveCount(0);
  expect(business).toEqual([]);
  available = true;
  await page.getByRole('button', { name: /^重\s*试$/ }).click();
  await expect(page.getByRole('heading', { name: '资源管理', exact: true })).toBeVisible();
});

test('revoked grants are applied on reload before loading protected data', async ({ page }) => {
  await openDashboard(page, 'resources');
  await expect(page.getByRole('button', { name: '＋ 新增资源', exact: true })).toBeVisible();
  await page.route('**/api/admin/access', (route) => route.fulfill({ json: { permissions: [] } }));
  const requests: string[] = [];
  page.on('request', (request) => { if (new URL(request.url()).pathname === '/api/admin/resources') requests.push(request.url()); });
  await page.reload();
  await expect(page.getByText('无权访问此页面', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '＋ 新增资源', exact: true })).toHaveCount(0);
  await openNavigation(page);
  await expect(page.getByRole('menuitem', { name: '资源管理', exact: true })).toHaveCount(0);
  expect(requests).toEqual([]);
});
