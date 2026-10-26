import { test, expect, openDashboard, screenshot } from './fixtures';

test('nested navigation follows deep links, preserves groups and works in the rail and drawer', async ({ page }, info) => {
  await page.route('**/Dashboard.tsx', async route => {
    const response = await route.fetch();
    const original = await response.text();
    const body = original.replace(/items: navigation\(["']sidebar["']\)/,
      'items: [{key:"library",label:"资源库",children:[{key:"files",label:"文件管理"},{key:"resources",label:"资源管理",extra:"4"}]},{key:"overview",label:"工作台"}]')
      .replace(/(\w*jsxDEV)\(AdminShell, \{/, '$1(AdminShell, { navigationLabel: false, pageTitleInHeader: true,');
    expect(body).not.toBe(original);
    await route.fulfill({ response, body });
  });
  await openDashboard(page, 'files');
  const mobile = info.project.name.startsWith('mobile');
  if (mobile) await page.getByRole('button', { name: '打开导航', exact: true }).click();
  const navigation = mobile ? page.getByRole('dialog') : page.locator('[data-workerkit-region="sidebar"]');
  await expect(page.getByText('应用管理', { exact: true })).toHaveCount(0);
  const group = navigation.getByRole('menuitem', { name: '资源库', exact: true });
  await expect(group).toHaveAttribute('aria-expanded', 'true');
  const files = navigation.getByRole('menuitem', { name: '文件管理', exact: true });
  await expect(files).toBeVisible();
  await expect(page.getByRole('heading', { name: '文件管理', exact: true })).toHaveCount(1);
  await group.click();
  await expect(files).toBeHidden();
  await expect(page).toHaveURL(/#\/?files$/);
  await group.press('Enter');
  await expect(files).toBeVisible();
  await navigation.getByRole('menuitem', { name: /资源管理/ }).click();
  await expect(page).toHaveURL(/#\/resources$/);
  await expect(page.getByRole('heading', { name: '资源管理', exact: true })).toHaveCount(1);
  if (mobile) {
    await expect(navigation).toBeHidden();
    await page.getByRole('button', { name: '打开导航', exact: true }).click();
    await expect(group).toHaveAttribute('aria-expanded', 'true');
    await expect(navigation.getByRole('menuitem', { name: /资源管理/ })).toHaveClass(/selected/);
    await navigation.getByRole('menuitem', { name: '文件管理', exact: true }).click();
    await expect(navigation).toBeHidden();
  } else {
    await page.getByRole('button', { name: '收起侧栏', exact: true }).click();
    await expect.poll(async () => (await navigation.boundingBox())?.width).toBe(72);
    await group.hover();
    await page.getByRole('menuitem', { name: '文件管理', exact: true }).click();
    await expect(page).toHaveURL(/#\/files$/);
    await page.getByRole('button', { name: '展开侧栏', exact: true }).click();
    await expect(files).toBeVisible();
    await expect(group).toHaveAttribute('aria-expanded', 'true');
  }
  if (mobile) await page.getByRole('button', { name: '打开导航', exact: true }).click();
  await page.mouse.move(1100, 780);
  if (mobile) await expect.poll(async () => (await navigation.boundingBox())?.x).toBe(0);
  else await expect.poll(async () => (await navigation.boundingBox())?.width).toBe(232);
  await expect(page.getByRole('tooltip')).toBeHidden();
  await screenshot(page, 'sidebar-nested.png');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width);
});

test('controlled three-level navigation opens one branch, previews its first leaf and keeps the mobile drawer open', async ({ page }, info) => {
  await page.route('**/Dashboard.tsx', async route => {
    const response = await route.fetch(), original = await response.text();
    const render = original.match(/(\w*jsxDEV)\(AdminShell,/)?.[1];
    expect(render).toBeTruthy();
    const body = original.replace(/(\w*jsxDEV)\(AdminShell,/, '$1(NavigationFixture,') + `
      function NavigationFixture(props) {
        const [keys, setKeys] = useState(['library','file-types']);
        const items = [
          {key:'library',label:'资源库',children:[
            {key:'file-types',label:'文件分类',children:[{key:'files',label:'文件管理'}]},
            {key:'resource-types',label:'资源分类',children:[{key:'resources',label:'资源管理'}]}
          ]},
          {key:'operations',label:'系统',children:[{key:'overview-types',label:'概览分类',children:[{key:'overview',label:'工作台'}]}]}
        ];
        function open(next) {
          const added = next.find(key => !keys.includes(key));
          if (!added) { setKeys(next); return; }
          if (added === 'operations' || added === 'overview-types') { setKeys(['operations','overview-types']); props.onNavigate('overview'); }
          else if (added === 'resource-types') { setKeys(['library','resource-types']); props.onNavigate('resources'); }
          else { setKeys(['library','file-types']); props.onNavigate('files'); }
        }
        return ${render}(AdminShell, {...props, items, navigationLabel:false, pageTitleInHeader:true,
          sidebarActions:${render}('input',{placeholder:'分类筛选'}), menuProps:{openKeys:keys,onOpenChange:open}});
      }`;
    await route.fulfill({ response, body });
  });
  await openDashboard(page, 'files');
  const mobile = info.project.name.startsWith('mobile');
  if (mobile) await page.getByRole('button', { name: '打开导航', exact: true }).click();
  const navigation = mobile ? page.getByRole('dialog') : page.locator('[data-workerkit-region="sidebar"]');
  await expect(navigation.getByPlaceholder('分类筛选')).toBeVisible();
  if (!mobile) {
    const actions = await navigation.locator('[data-workerkit-region="sidebar-actions"]').boundingBox();
    const header = await page.locator('[data-workerkit-region="header"]').boundingBox();
    expect(actions!.y).toBe(header!.y + header!.height);
  }
  const library = navigation.getByRole('menuitem', { name: '资源库', exact: true });
  await navigation.getByRole('menuitem', { name: '系统', exact: true }).click();
  await expect(page).toHaveURL(/#\/overview$/);
  await expect(library).toHaveAttribute('aria-expanded', 'false');
  await expect(navigation.getByRole('menuitem', { name: '工作台', exact: true })).toHaveClass(/selected/);
  await expect(navigation).toBeVisible();
  await library.click();
  await expect(page).toHaveURL(/#\/files$/);
  await expect(navigation.getByRole('menuitem', { name: '文件管理', exact: true })).toHaveClass(/selected/);
  await navigation.getByRole('menuitem', { name: '资源分类', exact: true }).click();
  await expect(page).toHaveURL(/#\/resources$/);
  await expect(navigation.getByRole('menuitem', { name: '文件分类', exact: true })).toHaveAttribute('aria-expanded', 'false');
  await expect(navigation.getByRole('menuitem', { name: '资源管理', exact: true })).toHaveClass(/selected/);
  await expect(navigation).toBeVisible();
  if (mobile) {
    await navigation.getByRole('menuitem', { name: '资源管理', exact: true }).click();
    await expect(navigation).toBeHidden();
  } else {
    await page.getByRole('button', { name: '收起侧栏', exact: true }).click();
    await expect(navigation.getByPlaceholder('分类筛选')).toBeHidden();
    await library.hover();
    await page.getByRole('menuitem', { name: '文件分类', exact: true }).hover();
    await page.getByRole('menuitem', { name: '文件管理', exact: true }).click();
    await expect(page).toHaveURL(/#\/files$/);
    await expect(navigation.getByPlaceholder('分类筛选')).toBeHidden();
  }
});
