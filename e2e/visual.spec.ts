import { test, expect, openDashboard, screenshot } from './fixtures';

for (const section of ['overview', 'resources', 'files']) {
  test(`${section} keeps the approved appearance`, async ({ page }) => {
    await openDashboard(page, section);
    if (section === 'overview') await expect(page.getByText('示例订阅源', { exact: true }).first()).toBeVisible();
    if (section === 'resources') await expect(page.getByRole('button', { name: '示例订阅源', exact: true })).toBeVisible();
    if (section === 'files') await expect(page.getByText('使用说明.txt', { exact: true })).toBeVisible();
    await screenshot(page, `${section}.png`);
  });
}
