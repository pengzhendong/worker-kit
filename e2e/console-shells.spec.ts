import { test, expect } from './fixtures';

for (const shell of [
  { name: 'ProLayout', path: '/', navigationRole: 'link', account: '账户菜单', brand: '.ant-pro-sider-logo img' },
  { name: 'AdminShell', path: '/compat/', navigationRole: 'menuitem', account: '用户菜单，admin', brand: '[data-workerkit-region=sidebar] img' },
] as const) {
  test(`${shell.name} navigates with the desktop rail and keyboard account menu`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(shell.path);
    const account = page.getByRole('button', { name: shell.account, exact: true });
    const brand = page.locator(shell.brand).first();
    await expect(brand).toBeVisible();
    const before = await brand.boundingBox();
    await page.getByRole('button', { name: '收起侧栏' }).click();
    await expect.poll(async () => Math.abs((await brand.boundingBox())!.x - before!.x)).toBeLessThanOrEqual(1);
    const expand = page.getByRole('button', { name: '展开侧栏' });
    await expect(expand).toHaveAttribute('aria-expanded', 'false');
    await page.getByRole(shell.navigationRole, { name: '文件管理', exact: true }).click();
    await expect(page).toHaveURL(/#\/files$/);
    await expect(expand).toBeVisible();
    await expand.click();
    await account.press('Enter');
    const settings = page.getByRole('menuitem', { name: '系统设置', exact: true });
    await expect(settings).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(settings).toBeHidden();
    await expect(account).toBeFocused();
    const theme = page.getByRole('button', { name: /^(切换到)?(深色|浅色)模式$/ });
    const previousThemeLabel = await theme.getAttribute('aria-label');
    await theme.click();
    await expect(theme).not.toHaveAttribute('aria-label', previousThemeLabel!);
  });
}

for (const path of ['/', '/compat/']) {
  test(`${path} opens the mobile drawer and closes it on navigation`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await page.getByRole('button', { name: '打开导航', exact: true }).click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await drawer.getByText('文件管理', { exact: true }).click();
    await expect(drawer).toBeHidden();
    await expect(page).toHaveURL(/#\/files$/);
  });
}
