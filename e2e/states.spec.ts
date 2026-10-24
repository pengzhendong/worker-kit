import { test, expect, screenshot } from './fixtures';

for (const scenario of ['empty', 'error', 'loading'] as const) {
  test.describe(scenario, () => {
    test.use({ scenario });
    test(`resources shows the ${scenario} state`, async ({ page }) => {
      await page.goto('/#resources');
      await expect(page.getByRole('heading', { name: '资源管理', exact: true })).toBeVisible();
      if (scenario === 'empty') await expect(page.locator('.ant-empty-description')).toHaveText('暂无数据');
      if (scenario === 'error') {
        await expect(page.getByRole('alert')).toContainText('暂时无法加载资源，请重试');
        await expect(page.getByText('资源未能加载，请重试', { exact: true })).toBeVisible();
        await expect(page.getByText('暂无数据', { exact: true })).toHaveCount(0);
      }
      if (scenario === 'loading') await expect(page.locator('.ant-spin-spinning')).toBeVisible();
      else await expect(page.locator('.ant-spin-spinning')).toHaveCount(0);
      await page.evaluate(() => document.fonts.ready);
      await screenshot(page, `resources-${scenario}.png`);
    });
  });
}

test.describe('login', () => {
  test.use({ scenario: 'logged-out' });
  test('login form is usable without horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /^登\s*录$/ })).toBeVisible();
    await expect(page.getByLabel('用户名')).toBeVisible();
    await expect(page.getByLabel('密码', { exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width);
    await screenshot(page, 'login.png');
  });
});
