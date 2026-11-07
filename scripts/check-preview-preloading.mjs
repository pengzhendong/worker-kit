import {
  frontendPreviewPath,
  frontendViews,
  officialDemos,
  previewCategory,
} from '../examples/ui-suite/catalog.js';
import { browserOptions } from './browser.mjs';
import { chromium, expect } from '@playwright/test';

const base = process.env.PAYLOAD_PREVIEW_URL || 'http://kit.localhost:5184';
const browser = await chromium.launch(browserOptions);
const iconMenuSelectors = {
  pure: '.el-menu-item',
  soybean: '.n-menu-item-content',
  vben: '.vben-menu-item',
  mui: '.MuiListItemButton-root',
  mantine: '.mantine-NavLink-root',
};

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
  });
  await page.route(
    /^https?:\/\/(api\.iconify\.design|api\.simplesvg\.com|api\.unisvg\.com)\//,
    (route) => route.abort(),
  );
  const requests = [],
    documents = [],
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/api/') || /\/(standard|native|hub)\/api\//.test(path))
      requests.push(path);
    if (request.isNavigationRequest() && request.frame() !== page.mainFrame())
      documents.push(request.url());
  });
  await page.addInitScript(() => {
    if (window !== top) return;
    window.maxWarming = 0;
    new MutationObserver(() => {
      window.maxWarming = Math.max(
        window.maxWarming,
        document.querySelectorAll('iframe[data-preload-state="loading"]')
          .length,
      );
    }).observe(document, { childList: true, subtree: true, attributes: true });
  });
  await page.goto(base + '/?view=nuxt');
  const tab = (view) => page.locator(`[data-view="${view}"]`);
  const preview = page.frameLocator('#preview');
  const initial = base + frontendPreviewPath('nuxt');
  await expect
    .poll(() => page.locator('#ui-views [data-preload-status=ready]').count(), {
      timeout: 120000,
    })
    .toBe(frontendViews.length);
  expect(await page.locator('#preview').getAttribute('src')).toBe(initial);
  expect(await page.evaluate(() => window.maxWarming)).toBe(1);

  for (const view of frontendViews) {
    const before = documents.length;
    await page.locator('#preview-category').selectOption(previewCategory(view));
    await tab(view).click();
    await expect(page.locator('.stage')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('#open')).toHaveAttribute(
      'href',
      officialDemos[view],
    );
    await expect(page.locator('#preview')).toBeVisible();
    await expect(page.locator('#preview')).toHaveAttribute(
      'src',
      base + frontendPreviewPath(view),
    );
    if (view !== 'docs') {
      await expect(
        preview.getByRole('heading', { name: '表格', exact: true }).last(),
      ).toBeVisible();
      for (const name of [
        '运行概览',
        '任务调度',
        '运行日志',
        '业务工作台',
        '赞助商',
      ]) {
        await expect(preview.getByText(name, { exact: true })).toHaveCount(0);
      }
    }
    if (view === 'soybean') {
      const gap = await preview
        .getByText('原生组件演示，操作在当前浏览器内完成。', { exact: true })
        .evaluate((description) => {
          const card = description.parentElement.nextElementSibling;
          return (
            card.getBoundingClientRect().top -
            description.getBoundingClientRect().bottom
          );
        });
      expect(
        gap,
        'Soybean keeps the table below its description',
      ).toBeLessThanOrEqual(36);
    }
    const menuSelector = iconMenuSelectors[view];
    if (menuSelector) {
      const drawings = [];
      for (const label of ['表格', '表单', '弹窗', '文件', '布局', '主题']) {
        const icon = preview
          .locator(menuSelector)
          .filter({ hasText: new RegExp(`^${label}$`) })
          .locator('svg');
        await expect(icon).toBeVisible();
        drawings.push(await icon.innerHTML());
      }
      expect(drawings.every(Boolean), view + ' renders its local icons').toBe(
        true,
      );
      expect(new Set(drawings).size, view + ' uses distinct menu icons').toBe(
        6,
      );
    }
    expect(documents.length, view + ' reuses its warmed document').toBe(before);
  }
  expect(requests, 'UI previews must not request business APIs').toEqual([]);
  expect(
    documents.every((url) =>
      frontendViews.some((view) => url === base + frontendPreviewPath(view)),
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page.close();

  const lowData = await browser.newPage();
  await lowData.addInitScript(() =>
    Object.defineProperty(navigator, 'connection', {
      value: { saveData: true, effectiveType: '4g' },
    }),
  );
  await lowData.goto(base + '/?view=nuxt');
  await expect(
    lowData.locator('[data-view=naive]'),
  ).toHaveAccessibleDescription('自动预加载已关闭，点击后加载');
  await expect(lowData.locator('iframe')).toHaveCount(1);
  await lowData.close();

  console.log(
    `PASS: all ${frontendViews.length} local previews warm sequentially, reuse documents and make no backend requests.`,
  );
} finally {
  await browser.close();
}
