import { test, expect, openDashboard, screenshot } from './fixtures';

const sidebar = '[data-workerkit-region="sidebar"]';

test('desktop rail keeps navigation and account actions and remembers its width', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('mobile'), 'Desktop rail contract');
  await openDashboard(page, 'files');
  await page.getByRole('button', { name: '收起侧栏', exact: true }).click();
  await expect.poll(async () => (await page.locator(sidebar).boundingBox())?.width).toBe(72);
  const toggle = page.getByRole('button', { name: '展开侧栏', exact: true });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  const item = page.locator(sidebar).getByRole('menuitem', { name: '资源管理', exact: true });
  const bounds = await item.locator('[data-workerkit-icon]').boundingBox();
  expect(bounds!.x + bounds!.width / 2).toBeCloseTo(35.5, 0);
  await item.hover();
  await expect(page.getByRole('tooltip', { name: '资源管理', exact: true })).toBeVisible();
  await page.mouse.move(1100, 780);
  await expect(page.getByRole('tooltip', { name: '资源管理', exact: true })).toBeHidden();
  await screenshot(page, 'sidebar-collapsed.png');
  await item.click();
  await expect(page).toHaveURL(/#\/resources$/);
  await expect(page.getByRole('button', { name: '示例订阅源', exact: true })).toBeVisible();
  await expect(page.locator('.ant-spin-spinning')).toHaveCount(0);
  await page.mouse.move(1100, 780);
  await expect(page.getByRole('tooltip', { name: '资源管理', exact: true })).toBeHidden();
  const account = page.locator(sidebar).getByRole('button', { name: '用户菜单，admin', exact: true });
  await account.focus();
  await account.press('Enter');
  await expect(page.getByRole('menuitem', { name: '当前账户', exact: true })).toBeVisible();
  await screenshot(page, 'sidebar-collapsed-account.png');
  await page.getByRole('menuitem', { name: '当前账户', exact: true }).click();
  await expect(page).toHaveURL(/#\/account$/);
  await page.reload();
  await expect.poll(async () => (await page.locator(sidebar).boundingBox())?.width).toBe(72);
  await page.getByRole('button', { name: '展开侧栏', exact: true }).click();
  await expect.poll(async () => (await page.locator(sidebar).boundingBox())?.width).toBe(232);
  await page.reload();
  await expect(page.getByRole('button', { name: '收起侧栏', exact: true })).toBeVisible();
});

test('desktop preference leaves mobile drawer expanded and survives resizing', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('mobile'), 'Starts at desktop breakpoint');
  await openDashboard(page);
  await page.getByRole('button', { name: '收起侧栏', exact: true }).click();
  const header = page.locator('[data-workerkit-region="header"]');
  const before = await header.boundingBox();
  const content = page.locator('[data-workerkit-region="content"]');
  await content.hover({ position: { x: 200, y: 200 } });
  await page.mouse.wheel(0, 900);
  await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBeGreaterThan(100);
  expect(await header.boundingBox()).toEqual(before);
  await page.setViewportSize({ width: 1280, height: 400 });
  const navigation = page.locator('[data-workerkit-region="sidebar-navigation"]');
  const account = page.locator('[data-workerkit-region="account"]');
  const accountBefore = await account.boundingBox();
  const contentBefore = await content.evaluate((element) => element.scrollTop);
  await navigation.hover({ position: { x: 30, y: 50 } });
  await page.mouse.wheel(0, 500);
  await expect.poll(() => navigation.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await account.boundingBox()).toEqual(accountBefore);
  expect(await content.evaluate((element) => element.scrollTop)).toBe(contentBefore);
  await info.attach('collapsed-scroll-positions', { body: JSON.stringify({ header: before, account: accountBefore, content: contentBefore, navigation: await navigation.evaluate((element) => element.scrollTop) }), contentType: 'application/json' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: /侧栏$/, exact: false })).toHaveCount(0);
  await page.getByRole('button', { name: '打开导航', exact: true }).click();
  const drawer = page.getByRole('dialog');
  await expect(drawer.getByRole('menuitem', { name: '文件管理', exact: true })).toBeVisible();
  await expect(drawer.getByText('admin', { exact: true })).toBeVisible();
  await drawer.getByRole('menuitem', { name: '文件管理', exact: true }).click();
  await expect(drawer).toBeHidden();
  await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBe(0);
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect.poll(async () => (await page.locator(sidebar).boundingBox())?.width).toBe(72);
});

test('rail still toggles when preference storage is blocked', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('mobile'), 'Desktop rail contract');
  await page.addInitScript(() => {
    const read = Storage.prototype.getItem, write = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key === 'workerkit.sidebar.collapsed') throw new DOMException('Storage blocked', 'SecurityError');
      return read.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === 'workerkit.sidebar.collapsed') throw new DOMException('Storage blocked', 'SecurityError');
      write.call(this, key, value);
    };
  });
  await openDashboard(page);
  await page.getByRole('button', { name: '收起侧栏', exact: true }).click();
  await expect.poll(async () => (await page.locator(sidebar).boundingBox())?.width).toBe(72);
  await page.getByRole('button', { name: '展开侧栏', exact: true }).click();
  await expect.poll(async () => (await page.locator(sidebar).boundingBox())?.width).toBe(232);
});
