import type { Locator } from '@playwright/test';
import { test, expect, openDashboard, screenshot } from './fixtures';

const region = (name: string) => `[data-workerkit-region="${name}"]`;
async function box(locator: Locator) {
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  return bounds!;
}
async function wheel(locator: Locator, amount: number) {
  await locator.hover({ position: { x: 80, y: 100 } });
  await locator.page().mouse.wheel(0, amount);
}

test('content scrolls while navigation stays in place', async ({ page }, info) => {
  await openDashboard(page);
  const content = page.locator(region('content'));
  const header = page.locator(region('header'));
  const sidebar = page.locator(region('sidebar'));
  const before = { header: await box(header), sidebar: await sidebar.count() ? await box(sidebar) : null };
  await expect.poll(() => content.evaluate((node) => node.scrollHeight - node.clientHeight)).toBeGreaterThan(100);
  await wheel(content, 1200);
  await expect.poll(() => content.evaluate((node) => node.scrollTop)).toBeGreaterThan(100);
  const after = { header: await box(header), sidebar: await sidebar.count() ? await box(sidebar) : null };
  expect(after).toEqual(before);
  expect(await page.evaluate(() => ({ top: document.scrollingElement?.scrollTop, height: document.documentElement.scrollHeight, viewport: innerHeight }))).toEqual({ top: 0, height: page.viewportSize()!.height, viewport: page.viewportSize()!.height });
  await info.attach('scroll-positions', { body: JSON.stringify({ before, after, contentScrollTop: await content.evaluate((node) => node.scrollTop) }, null, 2), contentType: 'application/json' });
});

test('short desktop lets the sidebar scroll independently', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('mobile'), 'Desktop sidebar contract');
  await page.setViewportSize({ width: 1280, height: 400 });
  await openDashboard(page);
  const content = page.locator(region('content'));
  const sidebar = page.locator(region('sidebar'));
  await wheel(content, 350);
  await expect.poll(() => content.evaluate((node) => node.scrollTop)).toBeGreaterThan(100);
  const before = await content.evaluate((node) => node.scrollTop);
  const header = await box(page.locator(region('header')));
  await wheel(sidebar, 700);
  await expect.poll(() => sidebar.evaluate((node) => node.scrollTop)).toBeGreaterThan(50);
  expect(await content.evaluate((node) => node.scrollTop)).toBe(before);
  expect(await box(page.locator(region('header')))).toEqual(header);
  await expect(sidebar.getByRole('menuitem', { name: '当前账户', exact: true })).toBeInViewport();
  await info.attach('independent-scroll-positions', { body: JSON.stringify({ content: before, sidebar: await sidebar.evaluate((node) => node.scrollTop), header }), contentType: 'application/json' });
});

test('navigation icons and labels share a center line', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('mobile'), 'Desktop menu alignment');
  await openDashboard(page);
  for (const item of await page.locator(region('sidebar')).getByRole('menuitem').all()) {
    const icon = await box(item.locator('[data-workerkit-icon]'));
    const label = await box(item.locator('.ant-menu-title-content'));
    expect(Math.abs(icon.y + icon.height / 2 - label.y - label.height / 2)).toBeLessThanOrEqual(1);
    expect(icon.width).toBe(20);
    expect(icon.height).toBe(20);
    expect(label.x - icon.x - icon.width).toBe(12);
  }
});

test('header controls share a center line in both themes', async ({ page }, info) => {
  await openDashboard(page);
  const header = page.locator(region('header'));
  const account = header.getByRole('group', { name: '账户操作', exact: true });
  const toggle = account.getByRole('button', { name: /切换到.*模式/ });
  const measurements = [];
  for (let pass = 0; pass < 2; pass++) {
    const headerBox = await box(header);
    const controls = {
      themeButton: await box(toggle),
      themeIcon: await box(toggle.locator('svg')),
      username: await box(account.getByText('admin', { exact: true })),
      logout: await box(account.getByRole('button', { name: /^退\s*出$/ })),
    };
    const centers = Object.values(controls).map((bounds) => bounds.y + bounds.height / 2);
    expect(Math.max(...centers) - Math.min(...centers)).toBeLessThanOrEqual(1);
    for (const center of centers) expect(Math.abs(center - headerBox.y - headerBox.height / 2)).toBeLessThanOrEqual(1);
    expect(controls.themeButton.height).toBe(32);
    expect(controls.logout.height).toBe(32);
    measurements.push({ header: headerBox, controls, centers });
    if (pass === 0) await toggle.click();
  }
  await info.attach('header-centers', { body: JSON.stringify(measurements, null, 2), contentType: 'application/json' });
});

test('upload stays compact and the file list is visible', async ({ page }) => {
  await openDashboard(page, 'files');
  await expect(page.getByText('使用说明.txt', { exact: true })).toBeVisible();
  const upload = await box(page.locator('.ant-upload-drag'));
  expect(upload.height).toBe(88);
  await expect(page.getByText('使用说明.txt', { exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width);
});

test('navigation returns content to the top', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('mobile'), 'Mobile navigation has its own drawer test');
  await openDashboard(page);
  const content = page.locator(region('content'));
  await wheel(content, 1200);
  await expect.poll(() => content.evaluate((node) => node.scrollTop)).toBeGreaterThan(100);
  await page.locator(region('sidebar')).getByRole('menuitem', { name: '资源管理', exact: true }).click();
  await expect(page.getByRole('heading', { name: '资源管理', exact: true })).toBeVisible();
  await expect.poll(() => content.evaluate((node) => node.scrollTop)).toBe(0);
});

test('mobile drawer works after scrolling and closes on navigation', async ({ page }, info) => {
  test.skip(!info.project.name.startsWith('mobile'), 'Mobile drawer contract');
  await openDashboard(page);
  await expect(page.locator(region('sidebar'))).toHaveCount(0);
  const content = page.locator(region('content'));
  await wheel(content, 1200);
  await expect.poll(() => content.evaluate((node) => node.scrollTop)).toBeGreaterThan(100);
  await page.getByRole('button', { name: '打开导航' }).click();
  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  await screenshot(page, 'navigation-drawer.png');
  await drawer.getByRole('menuitem', { name: '资源管理', exact: true }).click();
  await expect(drawer).not.toBeVisible();
  await expect(page.getByRole('heading', { name: '资源管理', exact: true })).toBeVisible();
  await expect.poll(() => content.evaluate((node) => node.scrollTop)).toBe(0);
  expect(await box(page.locator(region('header')))).toMatchObject({ y: 0, height: 64 });
});

test('theme toggle is an accessible icon and survives reload', async ({ page, dark }) => {
  await openDashboard(page, 'files');
  const toggle = page.getByRole('button', { name: dark ? '切换到浅色模式' : '切换到深色模式' });
  await expect(toggle.locator('svg')).toHaveCount(1);
  await expect(toggle).toHaveText('');
  await toggle.click();
  await page.reload();
  await expect(page.getByRole('button', { name: dark ? '切换到深色模式' : '切换到浅色模式' })).toHaveAttribute('aria-pressed', String(!dark));
});
