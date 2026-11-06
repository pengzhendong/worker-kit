import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const output = new URL('../test-results/ui-demos/', import.meta.url).pathname;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const port of [5180, 5181, 5182]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const nav = async name => {
      const target = port === 5182 ? page.getByRole('menuitem').filter({ hasText: name }).first() : page.getByRole('link', { name, exact: true }).first();
      await target.click();
    };
    await page.goto(`http://localhost:${port}/tasks`);
    await page.getByRole('textbox', { name: '搜索任务', exact: true }).fill('demo-api');
    await page.getByRole('button', { name: '运行定时数据同步', exact: true }).click();
    await nav('运行日志');
    await expect(page.getByText('演示任务「定时数据同步」执行完成', { exact: true })).toBeVisible();
    await nav('资源管理');
    await page.getByRole('button', { name: '预览周末片段.mp4', exact: true }).click();
    await page.locator('video').evaluate(v => v.play());
    await expect.poll(() => page.locator('video').evaluate(v => v.currentTime)).toBeGreaterThan(.2);
    await page.keyboard.press('Escape');
    await expect(page.locator('video')).toHaveCount(0);
    await nav('应用设置');
    await page.getByLabel('工作空间名称', { exact: true }).fill('通用示例工作空间');
    await page.getByRole('button', { name: '保存设置', exact: true }).click();
    await page.reload();
    await expect(page.getByLabel('工作空间名称', { exact: true })).toHaveValue('通用示例工作空间');
    await page.goto(`http://localhost:${port}`);
    await page.getByRole('heading', { name: '运行概览', exact: true }).last().waitFor();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${output}${port}-desktop.png` });
    const theme = port === 5182 ? page.getByRole('button', { name: 'dark', exact: true }) : page.getByRole('button', { name: '切换明暗主题', exact: true });
    await theme.click();
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark') || document.documentElement.classList.contains('app-dark'))).toBe(true);
    await page.screenshot({ path: `${output}${port}-dark.png` });
    expect(errors).toEqual([]);
    await page.close();
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
    await mobile.goto(`http://localhost:${port}`);
    await mobile.getByRole('heading', { name: '运行概览', exact: true }).last().waitFor();
    expect(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await mobile.screenshot({ path: `${output}${port}-mobile.png` });
    if (port === 5182) await mobile.locator('button:visible').first().click();
    else await mobile.getByRole('button', { name: port === 5180 ? '打开侧边栏' : '打开导航', exact: true }).click();
    if (port === 5182) await mobile.getByRole('menuitem').filter({ hasText: '任务调度' }).first().click();
    else await mobile.getByRole('link', { name: /任务调度/ }).first().click();
    await expect(mobile).toHaveURL(/\/tasks$/);
    await expect(mobile.getByRole('button', { name: /新建任务/ })).toBeVisible();
    await mobile.close();
    console.log(`${port}: task → logs, video, settings persistence, theme, mobile navigation passed`);
  }
} finally { await browser.close(); }
