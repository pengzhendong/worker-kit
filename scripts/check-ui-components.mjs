import { expect } from '@playwright/test';

export async function checkComponents(browser, base, screenshots, views = ['nuxt', 'prime', 'primevue', 'vben', 'pro', 'refine', 'tabler', 'adminlte']) {
  for (const view of views) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/${view}/components/dialogs`);
    await expect(page.getByRole('heading', { name: '弹窗', exact: true }).last()).toBeVisible();
    const open = page.getByRole('button', { name: '打开示例弹窗', exact: true });
    await open.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect.poll(() => page.getByRole('dialog').evaluate(el => el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(open).toBeFocused();
    await open.click();
    await page.getByRole('button', { name: '完成操作', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: '已完成演示操作' })).toBeVisible();
    await page.getByRole('button', { name: '打开确认弹窗', exact: true }).click();
    await page.getByRole('button', { name: /^取\s*消$/ }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: '已完成演示操作' })).toBeVisible();
    await page.getByRole('button', { name: '打开确认弹窗', exact: true }).click();
    await page.getByRole('button', { name: '确认操作', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: '已确认演示操作' })).toBeVisible();
    for (const [route, title] of [['table', '表格'], ['form', '表单'], ['preview', '文件'], ['layout', '布局'], ['theme', '主题']]) {
      await page.goto(`${base}/${view}/components/${route}`);
      await expect(page.getByRole('heading', { name: title, exact: true }).last()).toBeVisible();
      if (route === 'table') {
        await page.getByRole('textbox', { name: '搜索任务', exact: true }).fill('demo-api');
        await expect(page.getByRole('button', { name: '运行定时数据同步', exact: true })).toBeVisible();
      } else if (route === 'form') {
        await page.getByLabel('工作空间名称', { exact: true }).fill('');
        await page.getByRole('button', { name: '保存设置', exact: true }).click();
        if (!['prime', 'primevue', 'tabler', 'adminlte'].includes(view)) await expect(page.getByText('请输入工作空间名称', { exact: true })).toBeVisible();
        else expect(await page.getByLabel('工作空间名称', { exact: true }).evaluate(el => el.validity.valueMissing)).toBe(true);
      } else if (route === 'preview') {
        await page.getByRole('button', { name: '预览周末片段.mp4', exact: true }).click();
        await page.locator('video').evaluate(video => video.play());
        await expect.poll(() => page.locator('video').evaluate(video => video.currentTime)).toBeGreaterThan(.2);
        await page.keyboard.press('Escape');
      } else if (route === 'layout') {
        await page.getByRole('button', { name: '填充长内容', exact: true }).click();
        await page.getByText('布局卡片 36', { exact: true }).scrollIntoViewIfNeeded();
        await expect(page.getByText('布局卡片 36', { exact: true })).toBeInViewport();
        expect(await page.evaluate(() => [...document.querySelectorAll('*')].some(el => el.scrollHeight > el.clientHeight + 100 && /auto|scroll/.test(getComputedStyle(el).overflowY)) || document.documentElement.scrollHeight > innerHeight + 100)).toBe(true);
        await page.getByRole('button', { name: '收起长内容', exact: true }).click();
        await expect(page.getByText('布局卡片 36', { exact: true })).not.toBeAttached();
      } else {
        const themeState = () => page.evaluate(() => document.documentElement.className + document.documentElement.dataset.bsTheme + !!document.querySelector('.demo-dark'));
        const before = await themeState();
        await page.getByRole('button', { name: '切换示例主题', exact: true }).click();
        await expect.poll(themeState).not.toBe(before);
        await expect(page.getByRole('button', { name: '禁用按钮', exact: true })).toBeDisabled();
        await page.evaluate(async () => { await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))); });
        await page.screenshot({ path: `${screenshots}${view}-components-theme.png` });
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/${view}/components/layout`);
    await expect(page.getByRole('heading', { name: '布局', exact: true }).last()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `${screenshots}${view}-components-mobile.png` });
    await page.setViewportSize({ width: 390, height: 640 });
    const toggle = view === 'vben' ? page.getByRole('button').first() : page.getByRole('button', { name: view === 'nuxt' ? '打开侧边栏' : '打开导航', exact: true }).first();
    await toggle.click();
    await page.getByRole('link', { name: '主题', exact: true }).or(page.getByRole('menuitem').filter({ hasText: /^主题$/ })).first().click();
    await expect(page.getByRole('heading', { name: '主题', exact: true }).last()).toBeVisible();
    await page.getByRole('button', { name: '切换示例主题', exact: true }).click();
    await page.evaluate(async () => { await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))); });
    await page.screenshot({ path: `${screenshots}${view}-component-navigation-phone.png` });
    expect(errors).toEqual([]);
    await page.close();
    console.log(`${view}: six component pages, dialogs, validation, media, layout and theme passed`);
  }
}
