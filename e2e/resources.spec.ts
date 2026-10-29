import { test, expect, openDashboard, screenshot, resources } from './fixtures';

test('upstream table controls change density, hide columns and refresh the scoped query', async ({ page }) => {
  await openDashboard(page, 'resources');
  const row = page.getByRole('row').filter({ has: page.getByRole('button', { name: '示例订阅源', exact: true }) });
  const before = (await row.boundingBox())!.height;
  await page.getByRole('button', { name: '表格密度', exact: true }).press('Enter');
  await page.getByRole('menuitem', { name: '紧凑', exact: true }).click();
  await expect.poll(async () => (await row.boundingBox())!.height).toBeLessThan(before);
  await page.getByRole('button', { name: '列设置', exact: true }).press('Enter');
  const settings = page.locator('.ant-popover').filter({ hasText: '列展示' });
  await expect(settings).toBeVisible();
  await settings.getByRole('checkbox', { name: '类型', exact: true }).uncheck();
  await expect(page.getByRole('columnheader', { name: '类型', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('heading', { name: '资源管理', exact: true }).click();
  const refreshed = page.waitForRequest(request => new URL(request.url()).pathname === '/api/admin/resources');
  await page.getByRole('button', { name: '刷新资源', exact: true }).press('Enter');
  await refreshed;
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width);
});

test('upstream modal form prevents duplicate submission while keeping the draft on a server error', async ({ page }) => {
  let saves = 0;
  let release: () => void = () => {};
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/admin/resources', async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    saves++;
    expect(route.request().postDataJSON()).toEqual({ name: '异步提交示例', kind: '配置', status: 'enabled', address: '', description: '' });
    await pending;
    return route.fulfill({ status: 503, json: { error: { code: 'unavailable', message: '暂时无法保存，请重试' } } });
  });
  try {
    await openDashboard(page, 'resources');
    await page.getByRole('button', { name: '＋ 新增资源', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('名称', { exact: true }).fill('异步提交示例');
    const save = dialog.getByRole('button', { name: /^保\s*存$/ });
    await save.click();
    await expect(save).toHaveClass(/ant-btn-loading/);
    await save.press('Enter');
    expect(saves).toBe(1);
    release();
    await expect(page.getByText('暂时无法保存，请重试', { exact: true })).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('名称', { exact: true })).toHaveValue('异步提交示例');
    await expect(save).not.toHaveClass(/ant-btn-loading/);
  } finally { release(); }
});

test('resource sorting sends a declared server-side query', async ({ page }) => {
  await openDashboard(page, 'resources');
  const response = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname === '/api/admin/resources' && url.searchParams.get('sort') === 'name' && url.searchParams.get('order') === 'asc';
  });
  await page.getByRole('columnheader', { name: /名称 \/ 描述/ }).click();
  const request = await response;
  expect(new URL(request.url()).searchParams.get('page')).toBe('1');
});

test('server field errors retain the draft and clear after a successful retry', async ({ page }) => {
  let saves = 0;
  const bodies: unknown[] = [];
  await page.route('**/api/admin/resources', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    saves++; bodies.push(route.request().postDataJSON());
    if (saves === 1) return route.fulfill({ status: 422, json: { error: { code: 'validation_failed', message: '请检查表单内容', fields: [{ path: ['name'], message: '这个名称已被占用，请换一个' }] }, requestId: 'form-test' } });
    return route.fulfill({ status: 201, json: { id: 'new-resource', ...route.request().postDataJSON() } });
  });
  await openDashboard(page, 'resources');
  await page.getByRole('button', { name: '＋ 新增资源', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('名称', { exact: true }).fill('主订阅');
  await dialog.getByLabel('描述', { exact: true }).fill('保留这段草稿');
  await dialog.getByRole('button', { name: /^保\s*存$/ }).click();
  await expect(dialog.getByText('这个名称已被占用，请换一个', { exact: true })).toBeVisible();
  await expect(dialog.getByLabel('名称', { exact: true })).toHaveValue('主订阅');
  await expect(dialog.getByLabel('描述', { exact: true })).toHaveValue('保留这段草稿');
  await expect.poll(() => dialog.evaluate((node) => node.getAnimations({ subtree: true })
    .filter((animation) => animation.playState === 'running' && animation.effect?.getComputedTiming().iterations !== Infinity).length)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width);
  const bounds = (await dialog.boundingBox())!;
  for (const field of await dialog.locator('input, textarea, .ant-select').filter({ visible: true }).all()) {
    const control = (await field.boundingBox())!;
    expect(control.x).toBeGreaterThanOrEqual(bounds.x - 1);
    expect(control.x + control.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
  }
  await screenshot(page, 'resource-field-errors.png');
  await dialog.getByLabel('名称', { exact: true }).fill('备用订阅');
  await dialog.getByRole('button', { name: /^保\s*存$/ }).click();
  await expect(dialog).not.toBeVisible();
  expect(bodies).toEqual([
    { name: '主订阅', kind: '配置', status: 'enabled', address: '', description: '保留这段草稿' },
    { name: '备用订阅', kind: '配置', status: 'enabled', address: '', description: '保留这段草稿' },
  ]);
});

test('partial batch results retain only failed selections and explain the result', async ({ page }) => {
  await page.route('**/api/admin/resources/batch', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ ids: [resources[0]!.id, resources[1]!.id], status: 'disabled' });
    return route.fulfill({ json: { succeeded: [resources[0]!.id], failed: [{ id: resources[1]!.id, code: 'resource_not_found', message: '资源不存在或已被删除' }], updated: 1 } });
  });
  await openDashboard(page, 'resources');
  await page.getByRole('checkbox', { name: 'Select row 1', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Select row 2', exact: true }).check();
  await page.getByRole('button', { name: '批量停用', exact: true }).click();
  await expect(page.getByText('已更新 1 项，1 项失败：资源不存在或已被删除', { exact: true })).toBeVisible();
  await expect(page.getByText('已选 1 项', { exact: true })).toBeVisible();
  await expect(page.getByText('文档存储：资源不存在或已被删除', { exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Select row 1', exact: true })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Row 2 selected', exact: true })).toBeChecked();
});
