import { test, expect, openDashboard, screenshot } from './fixtures';

test('tools describe native capabilities, commands and optional bindings', async ({ page }) => {
  await openDashboard(page, 'tools');
  await expect(page.getByText('当前是本地开发环境', { exact: true })).toBeVisible();
  const targets = {
    '打开 Local Explorer ↗': '/cdn-cgi/local/explorer/',
    '打开 D1 面板 ↗': '/cdn-cgi/local/explorer/d1/DB',
    '打开 KV 面板 ↗': '/cdn-cgi/local/explorer/kv/SETTINGS',
    '打开 R2 面板 ↗': '/cdn-cgi/local/explorer/r2/FILES',
    '查看请求追踪 ↗': '/cdn-cgi/local/explorer/observability',
    '查看事件与日志 ↗': '/cdn-cgi/local/explorer/observability/events',
    '打开 Worker 调试器 ↗': '/__debug',
    '查看 Explorer API ↗': '/cdn-cgi/local/explorer/api',
    '查看健康检查 ↗': '/health',
  };
  for (const [name, href] of Object.entries(targets)) {
    const link = page.getByRole('link', { name, exact: true });
    await expect(link).toHaveAttribute('href', href);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width);
  await screenshot(page, 'tools-local.png');
  await page.getByRole('tab', { name: '项目工具', exact: true }).click();
  for (const command of ['npm run check', 'npm run test:ui', 'npx playwright show-report', 'npm run types', 'npm run build', 'npm run deploy:dry-run']) {
    await expect(page.getByText(command, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: '打开组件与交互', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width);
  await screenshot(page, 'tools-project.png');
  await page.getByRole('tab', { name: '模块与权限', exact: true }).click();
  const resource = page.getByRole('region', { name: '资源管理模块声明', exact: true });
  await expect(resource.getByText('/resources', { exact: true })).toBeVisible();
  await expect(resource.getByText('resources:delete', { exact: true })).toBeVisible();
  await expect(resource.getByText('已授予', { exact: true })).toHaveCount(6);
  await expect(page.getByRole('region', { name: '开发工具模块声明', exact: true }).getByText('仅开发环境', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width);
  await screenshot(page, 'tools-modules.png');
  await page.getByRole('tab', { name: '按需扩展', exact: true }).click();
  await expect(page.getByText('当前未配置', { exact: true })).toHaveCount(5);
  await expect(page.getByRole('link', { name: '打开 Cloudflare 控制台 ↗', exact: true })).toHaveAttribute('href', 'https://dash.cloudflare.com/');
  await screenshot(page, 'tools-optional.png');
});

test('project tools navigate into working application pages', async ({ page }) => {
  await openDashboard(page, 'tools');
  await page.getByRole('tab', { name: '项目工具', exact: true }).click();
  await page.getByRole('button', { name: '打开组件与交互', exact: true }).click();
  await expect(page.getByRole('heading', { name: '组件与交互', exact: true })).toBeVisible();
  await expect.poll(() => page.locator('[data-workerkit-region="content"]').evaluate((node) => node.scrollTop)).toBe(0);
});
