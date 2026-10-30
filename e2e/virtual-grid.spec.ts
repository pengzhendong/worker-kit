import {test, expect, openDashboard} from './fixtures';

test('virtual grid bounds rendered cards, adapts columns, and keeps shell fixed while scrolling', async ({page}, testInfo) => {
  await page.route('**/MediaExamples.tsx', async route => {
    const response = await route.fetch(), source = await response.text();
    const react = source.match(/from "([^"]*\/react\.js[^"]*)"/)![1];
    const web = source.match(/import \{ PageToolbar \} from "([^"]+)"/)![1];
    const virtual = web.replace(/\/index\.ts(?:\?.*)?$/, '/virtual-grid.tsx');
    await route.fulfill({response, body: `import React from ${JSON.stringify(react)};
      import {VirtualGrid} from ${JSON.stringify(virtual)};
      const {useState}=React;const items=Array.from({length:10000},(_,id)=>({id}));
      export function MediaExamples(){const[loading,setLoading]=useState(true);return React.createElement(React.Fragment,null,React.createElement('button',{onClick:()=>setLoading(false)},'结束加载'),React.createElement(VirtualGrid,{
        items:loading?[]:items,loading,renderPlaceholder:()=>React.createElement('div',{'data-placeholder':true},'加载占位'),itemHeight:160,minItemWidth:240,totalCount:10000,'aria-label':'大量卡片',
        getItemKey:item=>item.id,renderItem:item=>React.createElement('div',{
          style:{height:'100%',background:'var(--wk-color-surface)',padding:16,border:'1px solid var(--wk-color-border)',borderRadius:10}
        },'卡片 '+item.id)}))}`});
  });
  await openDashboard(page, 'components');
  await page.getByRole('tab', {name:'媒体预览', exact:true}).click();
  const grid = page.getByRole('list', {name:'大量卡片'});
  const content = page.locator('[data-workerkit-region=content]');
  await expect(grid).toHaveAttribute('aria-busy', 'true');
  await expect.poll(async () => {const rows = await grid.locator('.wk-virtual-grid-row').evaluateAll(rows => rows.map(row => row.childElementCount)); return rows.length === 2 && rows[0] === rows[1];}).toBe(true);
  const rows = await grid.locator('.wk-virtual-grid-row').evaluateAll(rows => rows.map(row => ({height:row.getBoundingClientRect().height,children:[...row.children].map(child=>child.getBoundingClientRect().height)})));
  for (const row of rows) for (const childHeight of row.children) expect(childHeight).toBeLessThanOrEqual(row.height);
  await page.getByRole('button', {name:'结束加载'}).click();
  await expect(grid.getByText('卡片 0', {exact:true})).toBeVisible();
  const fixedBefore = await page.getByRole('banner').boundingBox();
  await content.evaluate(el => {el.scrollTop = el.scrollHeight;});
  await expect(grid.getByText('卡片 9999', {exact:true})).toBeVisible();
  expect(await grid.getByRole('listitem').count()).toBeLessThan(80);
  expect(await page.getByRole('banner').boundingBox()).toEqual(fixedBefore);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await content.evaluate(el => {el.scrollTop = 0;});
  await expect(grid.getByText('卡片 0', {exact:true})).toBeVisible();
  if (testInfo.project.name.startsWith('desktop')) {
    const before = await grid.locator('.wk-virtual-grid-row').first().evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    await page.getByRole('button', {name:'收起侧栏', exact:true}).click();
    await expect.poll(() => grid.locator('.wk-virtual-grid-row').first().evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBeGreaterThanOrEqual(before);
  }
  await page.setViewportSize({width:390, height:844});
  await expect.poll(() => grid.locator('.wk-virtual-grid-row').first().evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await content.evaluate(el => {el.scrollTop = el.scrollHeight;});
  await expect(grid.getByText('卡片 9999', {exact:true})).toBeVisible();
  expect(await grid.getByRole('listitem').count()).toBeLessThan(10);
  await testInfo.attach('virtual-grid-mobile', {body:await page.screenshot(),contentType:'image/png'});
});
