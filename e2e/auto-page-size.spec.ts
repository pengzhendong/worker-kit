import { test, expect, openDashboard } from './fixtures';

for (const layout of ['list', 'grid'] as const) test(`automatic ${layout} pagination fits real available height, reacts to resizing and ignores content scroll`, async ({ page }) => {
  // Render an isolated consumer through Vite's actual resolved imports, without production test switches.
  await page.route('**/MediaExamples.tsx', async route => {
    const response = await route.fetch(), original = await response.text();
    const resolve = (pattern: RegExp) => { const match = original.match(pattern); expect(match).not.toBeNull(); return match![1]; };
    const react = resolve(/from "([^"]*\/react\.js[^"]*)"/);
    const antd = resolve(/from "([^"]*\/antd\.js[^"]*)"/);
    const web = resolve(/import \{ PageToolbar \} from "([^"]+)"/);
    const media = resolve(/import \{ ImageViewer[^\n]+from "([^"]+)"/);
    const css = resolve(/import "([^"]*\/media\.css[^"]*)"/);
    await route.fulfill({ response, body: `
      import React from ${JSON.stringify(react)};
      import { Pagination } from ${JSON.stringify(antd)};
      import { PageToolbar, useAutoPageSize } from ${JSON.stringify(web)};
      import { MediaList, MediaRow } from ${JSON.stringify(media)};
      import ${JSON.stringify(css)};
      const h = React.createElement;
      export function MediaExamples() {
        const { pageSize, listRef, paginationRef } = useAutoPageSize({ max: 48 });
        return h('section', { 'data-testid': 'auto-page-demo' },
          h(PageToolbar, { title: '自适应分页', meta: h('output', { 'data-testid': 'capacity' }, pageSize || 0) }),
          h(MediaList, { ref: listRef, layout: '${layout}' }, Array.from({ length: pageSize || 1 }, (_, index) => h(MediaRow, {
            key: index, kind: 'image', src: '/media/landscape.svg', title: '资源 ' + (index + 1), description: '示例作者', onOpen() {}
          }))),
          h('div', { ref: paginationRef, 'data-testid': 'pagination', style: { marginTop: 24 } },
            h(Pagination, { pageSize: pageSize || 1, total: 10000, showSizeChanger: false, showTotal: total => '共 ' + total + ' 项 · 每页 ' + (pageSize || 1) + ' 项' })));
      }
    ` });
  });
  await openDashboard(page, 'components');
  await page.getByRole('tab', { name: '媒体预览', exact: true }).click();
  const demo = page.getByTestId('auto-page-demo');
  const capacity = async () => Number(await demo.getByTestId('capacity').textContent());
  await expect.poll(capacity).toBeGreaterThan(1);
  const initial = await capacity(), viewport = page.viewportSize()!;
  const assertFit = async () => {
    await expect.poll(async () => demo.locator('.wk-media-list').getByRole('listitem').count()).toBe(await capacity());
    const footerBottom = await demo.getByTestId('pagination').evaluate(element => element.getBoundingClientRect().top + Math.max(element.getBoundingClientRect().height, element.scrollHeight));
    expect(footerBottom).toBeLessThanOrEqual(page.viewportSize()!.height - 16);
    const overflow = await page.locator('[data-workerkit-region="content"]').evaluate(element => element.scrollHeight > element.clientHeight);
    expect(overflow).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width);
  };
  await assertFit();
  await page.setViewportSize({ width: viewport.width, height: 1100 });
  await expect.poll(capacity).toBeGreaterThan(initial);
  await assertFit();
  const tall = await capacity();
  await page.setViewportSize({ width: viewport.width, height: 600 });
  await expect.poll(capacity).toBeLessThan(tall);
  await assertFit();
  await page.setViewportSize({ width: viewport.width, height: 8000 });
  await expect.poll(capacity).toBe(48);
  await page.setViewportSize({ width: viewport.width, height: 320 });
  const columns = () => demo.locator('.wk-media-list').evaluate(e => getComputedStyle(e).display === 'grid' ? getComputedStyle(e).gridTemplateColumns.split(' ').length : 1);
  await expect.poll(capacity).toBe(await columns());
  await page.locator('[data-workerkit-region="content"]').evaluate(element => { element.scrollTop = 100; });
  expect(await page.locator('[data-workerkit-region="content"]').evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await page.setViewportSize({ width: viewport.width - 1, height: 320 });
  await expect.poll(capacity).toBe(await columns());
  if (layout === 'grid') {
    await page.setViewportSize({ width: 1920, height: 900 });
    await expect.poll(columns).toBeGreaterThan(1);
    await assertFit();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(columns).toBe(1);
    await assertFit();
  }
  await page.setViewportSize(viewport);
  await page.getByRole('tab', { name: '状态与反馈', exact: true }).click();
  await expect(demo).toHaveCount(0);
});
