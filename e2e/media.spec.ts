import { test, expect, openDashboard, screenshot } from './fixtures';

async function openMedia(page: import('@playwright/test').Page) {
  await openDashboard(page, 'components');
  await page.getByRole('tab', { name: '媒体预览', exact: true }).click();
  await expect(page.locator('[data-workerkit-media]')).toHaveCount(5);
  await expect(page.getByRole('button', { name: '加载波形', exact: true }).first()).toBeEnabled();
}

test('media loads on demand, decodes a real waveform, seeks and pauses other players', async ({ page }) => {
  const audioRequests: string[] = [];
  page.on('request', r => { if (r.url().endsWith('/media/tone.wav')) audioRequests.push(r.url()); });
  await openMedia(page);
  expect(audioRequests).toEqual([]);
  const audio = page.locator('[data-workerkit-media=audio]').first();
  await audio.getByRole('button', { name: '加载波形', exact: true }).click();
  await expect(audio.getByText('点击或拖动波形定位，键盘定位可使用下方进度条')).toBeVisible();
  await expect(audio.locator('.wk-waveform').locator('canvas').first()).toBeVisible();
  expect(audioRequests.length).toBeGreaterThan(0);
  await audio.getByRole('button', { name: '播放', exact: true }).click();
  await expect.poll(() => audio.locator('audio').evaluate(e => (e as HTMLMediaElement).paused)).toBe(false);
  await audio.getByRole('slider', { name: '定位', exact: true }).press('ArrowRight');
  await expect.poll(() => audio.locator('audio').evaluate(e => (e as HTMLMediaElement).currentTime)).toBeGreaterThan(0);
  const video = page.locator('[data-workerkit-media=video]').first();
  await video.getByRole('button', { name: '播放', exact: true }).click();
  await expect.poll(() => video.locator('video').evaluate(e => (e as HTMLMediaElement).paused)).toBe(false);
  await expect.poll(() => video.locator('video').evaluate(e => (e as HTMLMediaElement).currentTime)).toBeGreaterThan(0);
  await expect.poll(() => audio.locator('audio').evaluate(e => (e as HTMLMediaElement).paused)).toBe(true);
  await page.getByRole('tab', { name: '状态与反馈', exact: true }).click();
  await expect(page.locator('audio,video')).toHaveCount(0);
});

test('media handles unavailable files and large audio without decoding', async ({ page }) => {
  await page.route('**/media/unavailable.mp4', route => route.fulfill({ status: 404, body: 'Not found' }));
  await openMedia(page);
  const large = page.locator('[data-workerkit-media=audio]').last();
  await expect(large.getByRole('button', { name: '加载波形' })).toBeDisabled();
  await expect(large.getByText('大音频或时长未知，使用流式试听')).toBeVisible();
  const missing = page.locator('[data-workerkit-media=video]').nth(1);
  await missing.getByRole('button', { name: '播放', exact: true }).click();
  await expect(missing.getByText('暂时无法播放', { exact: true })).toBeVisible();
  await expect(missing.getByRole('button', { name: '重试播放' })).toBeVisible();
  await page.getByRole('img', { name: '山间日落', exact: true }).click();
  await expect(page.locator('.ant-image-preview')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.ant-image-preview')).not.toBeVisible();
});

test('media keeps the approved appearance', async ({ page }) => {
  await openMedia(page);
  await expect(page.getByRole('img', { name: '山间日落', exact: true })).toBeVisible();
  await screenshot(page, 'components-media.png');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width);
});

test('compact audio fits narrow cards, shows known duration without fetching, and supports keyboard seeking', async ({ page }) => {
  const audioRequests: string[] = [];
  page.on('request', r => { if (r.url().endsWith('/media/tone.wav')) audioRequests.push(r.url()); });
  await openMedia(page);
  const compact = page.locator('.wk-audio-compact');
  await expect(compact.getByText('0:08', { exact: true })).toBeVisible();
  await expect(compact.getByRole('button')).toHaveCount(1);
  expect(audioRequests).toEqual([]);
  const assertFit = async () => {
    const bounds = await compact.evaluate(element => {
      const outer = element.getBoundingClientRect();
      const parts = ['.wk-audio-play', '.wk-audio-seek', '.wk-audio-time'].map(selector => {
        const r = element.querySelector(selector)!.getBoundingClientRect();
        return { left: r.left, right: r.right, width: r.width };
      });
      return { outer: { left: outer.left, right: outer.right, width: outer.width }, parts };
    });
    expect(bounds.outer.width).toBeLessThanOrEqual(240);
    expect(bounds.parts[0].left).toBeGreaterThanOrEqual(bounds.outer.left);
    expect(bounds.parts[0].right).toBeLessThan(bounds.parts[1].left);
    expect(bounds.parts[1].width).toBeGreaterThan(60);
    expect(bounds.parts[1].right).toBeLessThan(bounds.parts[2].left);
    expect(bounds.parts[2].right).toBeLessThanOrEqual(bounds.outer.right);
  };
  await assertFit();
  await compact.getByRole('button', { name: '播放', exact: true }).click();
  await expect.poll(() => compact.locator('audio').evaluate(e => (e as HTMLMediaElement).currentTime)).toBeGreaterThan(0);
  await compact.getByRole('button', { name: '暂停', exact: true }).click();
  await compact.getByRole('slider', { name: '定位', exact: true }).press('End');
  await expect.poll(() => compact.locator('audio').evaluate(e => (e as HTMLMediaElement).currentTime)).toBeGreaterThan(7);
  await assertFit();
  await screenshot(page, 'components-media-compact.png');
});

test('compact browser spacing and shared media cards align titles, metadata and controls', async ({ page }) => {
  await page.route('**/Dashboard.tsx', async route => {
    const response = await route.fetch(), original = await response.text();
    const body = original.replace(/(\w*jsxDEV)\(AdminShell, \{/, '$1(AdminShell, { compactContent: true, pageTitleInHeader: true,');
    expect(body).not.toBe(original);
    await route.fulfill({ response, body });
  });
  await openMedia(page);
  const demo = page.getByTestId('media-card-demo');
  const cards = demo.getByRole('article');
  await expect(cards).toHaveCount(2);
  const search = demo.getByPlaceholder('搜索卡片示例');
  await search.fill('不存在');
  await expect(cards).toHaveCount(0);
  await search.fill('');
  await expect(cards).toHaveCount(2);
  await search.click();
  const toolbar = await demo.locator('[data-workerkit-page-toolbar]').boundingBox();
  const grid = await demo.locator('.wk-media-grid').boundingBox();
  const content = await page.locator('[data-workerkit-region="content"]').boundingBox();
  expect(grid!.y - toolbar!.y - toolbar!.height).toBeCloseTo(16, 0);
  expect(grid!.x - content!.x).toBeCloseTo(16, 0);
  expect((await search.boundingBox())!.height).toBeCloseTo(32, 0);
  const relativeMetadata = [];
  for (const card of await cards.all()) {
    const box = await card.boundingBox(), meta = await card.locator('.wk-media-card-meta').boundingBox();
    expect((await card.locator('.wk-media-card-title').boundingBox())!.height).toBeGreaterThan(20);
    relativeMetadata.push(box!.y + box!.height - meta!.y - meta!.height);
  }
  expect(relativeMetadata[0]).toBeCloseTo(relativeMetadata[1], 0);
  await demo.getByRole('button', { name: '短标题', exact: true }).press('Enter');
  const dialog = page.getByRole('dialog', { name: '资源详情', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: '知道了', exact: true }).click();
  await expect(dialog).toBeHidden();
  await screenshot(page, 'media-card-browser.png');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width);
});
