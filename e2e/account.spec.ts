import type { Page } from '@playwright/test';
import { test, expect, openDashboard, screenshot } from './fixtures';

async function userButton(page: Page) {
  const navigation = page.getByRole('button', { name: '打开导航' });
  if (await navigation.isVisible()) await navigation.click();
  return page.getByRole('button', { name: '用户菜单，admin', exact: true });
}

test('account stays at the bottom and opens an upward menu', async ({ page }, info) => {
  await openDashboard(page);
  await expect(page.getByText('当前应用工作空间', { exact: true })).toHaveCount(0);
  const trigger = await userButton(page);
  const bounds = await trigger.boundingBox();
  expect(bounds).not.toBeNull();
  expect(Math.abs(bounds!.y + bounds!.height - page.viewportSize()!.height + 12)).toBeLessThanOrEqual(1);
  const controls = await trigger.evaluate((node) => [...node.querySelectorAll('.ant-avatar, .ant-typography, svg')].map((element) => {
    const rect = element.getBoundingClientRect();
    return { center: rect.y + rect.height / 2, height: rect.height };
  }));
  for (const control of controls) expect(Math.abs(control.center - bounds!.y - bounds!.height / 2)).toBeLessThanOrEqual(1);
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const menu = page.getByRole('menu').filter({ has: page.getByRole('menuitem', { name: '退出登录', exact: true }) });
  await expect(menu).toBeVisible();
  for (const name of ['当前账户', '系统设置', '退出登录']) await expect(menu.getByRole('menuitem', { name, exact: true })).toBeVisible();
  const menuBounds = await menu.boundingBox();
  expect(menuBounds!.y + menuBounds!.height).toBeLessThan(bounds!.y);
  await info.attach('account-position', { body: JSON.stringify({ trigger: bounds, menu: menuBounds, controls }), contentType: 'application/json' });
  await screenshot(page, 'account-menu.png');
});

test('account menu navigates and closes the mobile drawer', async ({ page }) => {
  await openDashboard(page);
  await (await userButton(page)).click();
  await page.getByRole('menuitem', { name: '当前账户', exact: true }).click();
  await expect(page.getByRole('heading', { name: '当前账户', exact: true })).toBeVisible();
  await expect(page.locator('[data-workerkit-region="header"]')).toContainText('当前账户');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await (await userButton(page)).click();
  await page.getByRole('menuitem', { name: '系统设置', exact: true }).click();
  await expect(page.getByRole('heading', { name: '系统设置', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('menuitem', { name: '退出登录', exact: true })).not.toBeVisible();
});

test('account menu supports keyboard opening, Escape and outside dismissal', async ({ page }) => {
  await openDashboard(page);
  const trigger = await userButton(page);
  await trigger.press('Enter');
  const logout = page.getByRole('menuitem', { name: '退出登录', exact: true });
  await expect(logout).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(logout).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(logout).toBeVisible();
  await page.locator('[data-workerkit-region="sidebar-navigation"]').click({ position: { x: 20, y: 360 } });
  await expect(logout).not.toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('account menu logs out through the session API', async ({ page }) => {
  await openDashboard(page);
  await (await userButton(page)).click();
  const request = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/auth/logout');
  await page.getByRole('menuitem', { name: '退出登录', exact: true }).click();
  await request;
  await expect(page.locator('[data-workerkit-shell]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /登\s*录/ })).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-workerkit-shell]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /登\s*录/ })).toBeVisible();
});
