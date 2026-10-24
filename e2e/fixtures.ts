import { test as base, expect } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
import type { Resource, FileItem, AuditEvent, Settings } from '../examples/dashboard/web/data';

export type ConsoleOptions = { dark: boolean; scenario: 'populated' | 'empty' | 'error' | 'loading' | 'logged-out' };
const date = '2026-10-24T12:00:00.000Z';
export const resources: Resource[] = [
  { id: 'subscription', name: '示例订阅源', kind: '订阅源', status: 'enabled', address: 'https://example.com/feed', description: '用于展示配置清单', created_at: date, updated_at: date },
  { id: 'storage', name: '文档存储', kind: '存储', status: 'enabled', address: 'https://example.com/files', description: '私有文件与备份', created_at: date, updated_at: date },
  { id: 'task', name: '定时同步配置', kind: '任务', status: 'disabled', address: '', description: '仅配置记录，未启动任务', created_at: date, updated_at: date },
  { id: 'config', name: '应用配置', kind: '配置', status: 'enabled', address: '', description: '当前应用的通用参数', created_at: date, updated_at: date },
];
const files: FileItem[] = [
  { key: 'uploads/guide', name: '使用说明.txt', size: 1536, uploadedAt: date, contentType: 'text/plain' },
  { key: 'uploads/config', name: '应用配置.json', size: 4096, uploadedAt: date, contentType: 'application/json' },
];
const activity: AuditEvent[] = [
  { id: '1', actor: 'admin', action: 'resource.create', target: '示例订阅源', created_at: date },
  { id: '2', actor: 'admin', action: 'file.upload', target: '使用说明.txt', created_at: date },
];
const settings: Settings = { siteName: 'WorkerKit', description: '你的应用工作台', contactEmail: 'admin@example.com', pageSize: 20, showWelcome: true };

export const test = base.extend<ConsoleOptions>({
  dark: [false, { option: true }],
  scenario: ['populated', { option: true }],
  page: async ({ page, dark, scenario }, use) => {
    await page.clock.setFixedTime(new Date(date));
    await page.addInitScript((dark) => {
      if (!localStorage.getItem('workerkit.theme')) localStorage.setItem('workerkit.theme', dark ? 'dark' : 'light');
    }, dark);
    const pending: Route[] = [];
    const unexpected: string[] = [];
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.route('**/api/**', async (route) => {
      const { pathname } = new URL(route.request().url());
      const respond = (json: unknown, status = 200) => route.fulfill({ status, json });
      if (route.request().method() !== 'GET') {
        unexpected.push(`${route.request().method()} ${pathname}`);
        return respond({ error: { code: 'unmocked', message: '未声明的测试请求' } }, 500);
      }
      if (pathname === '/api/auth/session') {
        return scenario === 'logged-out'
          ? respond({ error: { code: 'unauthorized', message: '请先登录' } }, 401)
          : respond({ user: 'admin', expiresAt: Date.parse(date) / 1000 + 43200 });
      }
      if (pathname === '/api/admin/settings') return respond({ values: settings, updatedAt: date });
      if (pathname === '/api/admin/overview') return respond({
        user: 'admin', runtime: 'Cloudflare Workers', now: date, total: resources.length, enabled: 3,
        files: files.length, filesTruncated: false, bytes: 5632, recent: resources, activity,
        bindings: [{ name: 'D1 数据库', detail: '配置清单与操作日志', status: 'connected' }, { name: 'R2 文件存储', detail: '当前应用的私有文件', status: 'connected' }, { name: 'KV 设置', detail: '应用名称与显示偏好', status: 'connected' }],
      });
      if (pathname === '/api/admin/resources') {
        if (scenario === 'error') return respond({ error: { code: 'unavailable', message: '暂时无法加载资源，请重试' } }, 503);
        if (scenario === 'loading') { pending.push(route); return; }
        return respond({ items: scenario === 'empty' ? [] : resources, total: scenario === 'empty' ? 0 : resources.length });
      }
      if (pathname === '/api/admin/files') return respond({ items: files, cursor: null, maxBytes: 10 * 1024 * 1024 });
      if (pathname === '/api/admin/audit') return respond({ items: activity, total: activity.length });
      unexpected.push(`${route.request().method()} ${pathname}`);
      return respond({ error: { code: 'unmocked', message: '未声明的测试请求' } }, 500);
    });
    await use(page);
    await Promise.all(pending.map((route) => route.abort().catch(() => {})));
    expect(unexpected, 'All UI API requests must use declared fixtures').toEqual([]);
    expect(pageErrors, 'The application must not throw browser errors').toEqual([]);
  },
});
export { expect };

export async function openDashboard(page: Page, section = 'overview') {
  await page.goto(`/#${section}`);
  await expect(page.locator('[data-workerkit-shell]')).toBeVisible();
  await expect(page.getByRole('heading', { name: { overview: '工作台', resources: '资源管理', files: '文件管理', components: '组件与交互' }[section] ?? section, exact: true })).toBeVisible();
  await expect(page.locator('.ant-spin-spinning')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}

export async function screenshot(page: Page, name: string) {
  // Canonical baselines must never silently vary with the developer's OS/fonts.
  expect(process.platform, 'Use npm run test:ui (the pinned Linux container)').toBe('linux');
  expect(process.arch).toBe('x64');
  expect(process.env.WORKERKIT_VISUAL_ENV).toBe('playwright-linux-amd64');
  await expect(page).toHaveScreenshot(name);
}
