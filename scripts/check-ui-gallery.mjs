import { expect } from '@playwright/test';
import {
  frontendViews,
  previewCategory,
} from '../examples/ui-suite/catalog.js';

export async function checkGallery(browser, base) {
  const views = frontendViews.filter(
    (view) => previewCategory(view) === 'components',
  );
  for (const view of views) {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    try {
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${base}/${view}/components/table`);
      const openNav = page.getByRole('button', {
        name: /^(打开侧边栏|打开导航|Open sidebar)$/,
      });
      const galleryFrame = page.locator('iframe[title="组件目录"]');
      await openNav.click();
      await page
        .getByText('组件目录', { exact: true })
        .filter({ visible: true })
        .last()
        .click();
      await expect(galleryFrame).toBeVisible();
      const bounds = await galleryFrame.boundingBox();
      expect(bounds?.x).toBe(12);
      expect(bounds?.width).toBe(366);
      expect(bounds?.height).toBeGreaterThan(750);
      const gallery = galleryFrame.contentFrame();
      await expect(gallery.locator('.site-header')).toBeHidden();
      await expect(gallery.locator('#entries small')).toHaveCount(0);
      const demo = gallery.locator('#demo');
      await demo.getByRole('button', { name: '执行', exact: true }).click();
      await expect(demo.getByRole('status')).toHaveText('已点击 1 次');

      const search = gallery.getByRole('searchbox', { name: '搜索组件' });
      await search.fill('标签页');
      await demo.getByText('健康检查', { exact: true }).click();
      await expect(demo.getByText('查看健康检查的记录。')).toBeVisible();

      await search.fill('表格');
      await expect(demo.getByText('苹果', { exact: true })).toBeVisible();
      await expect(demo.locator('iframe')).toHaveCount(0);
      if (view === 'vuetify') {
        const variants = gallery.getByRole('combobox', { name: '示例' });
        await variants.selectOption({ label: '服务端分页' });
        await expect(demo.getByText('Ford Mustang')).toBeVisible();
        await demo.getByRole('button', { name: /next page/i }).click();
        await expect(demo.getByText('Porsche 911')).toBeVisible();
        await variants.selectOption({ label: '虚拟滚动' });
        await expect(
          demo.getByText('Speedster #0', { exact: true }),
        ).toBeVisible();
        await expect(
          gallery.locator('#entries button[data-path^="data-tables/"]'),
        ).toHaveCount(1);
      }
      if (view === 'primevue') {
        await search.fill('TreeTable');
        const tree = demo.getByRole('treegrid');
        await expect(tree.getByText('运维任务')).toBeVisible();
        await tree.getByRole('button').click();
        await expect(tree.getByText('数据同步')).toBeVisible();
        await expect(demo.locator('iframe')).toHaveCount(0);

        await search.fill('FileUpload');
        await demo.locator('input[type="file"]').setInputFiles({
          name: 'sample.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('demo'),
        });
        await expect(
          demo.getByText('sample.txt', { exact: true }),
        ).toBeVisible();

        await search.fill('Knob');
        await expect(
          gallery.getByRole('button', { name: 'Knob' }),
        ).toBeVisible();
        const knob = demo.getByRole('slider');
        await expect(knob).toHaveAttribute('aria-valuenow', '35');
        await knob.press('ArrowUp');
        await expect(knob).toHaveAttribute('aria-valuenow', '36');

        await search.fill('Listbox');
        const city = demo.getByRole('option', { name: 'Rome' });
        await city.click();
        await expect(city).toHaveAttribute('aria-selected', 'true');
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await openNav.click();
      await page
        .getByText('表格', { exact: true })
        .filter({ visible: true })
        .last()
        .click();
      await expect(galleryFrame).toHaveCount(0);
      expect(errors).toEqual([]);
    } finally {
      await page.close();
    }
  }
  console.log(
    `Verified component gallery interactions for ${views.length} libraries.`,
  );
}
