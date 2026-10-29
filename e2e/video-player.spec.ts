import { test, expect, openDashboard } from './fixtures';

async function openPlayer(page: import('@playwright/test').Page) {
  await openDashboard(page, 'components');
  await page.getByRole('tab', { name: '媒体预览', exact: true }).click();
  await page.getByText('观看场景播放器', { exact: true }).click();
  const example = page.getByTestId('viewing-player-example');
  await example.scrollIntoViewIfNeeded();
  return example.locator('[data-workerkit-video-player]');
}
test('viewing player uses upstream menus, preserves media across sources and keeps overlays in fullscreen', async ({ page }) => {
  const player = await openPlayer(page);
  const audio = page.getByTestId('media-player-examples').locator('[data-workerkit-media=audio]').first();
  await audio.getByRole('button', { name:'播放', exact:true }).click();
  await player.getByRole('button', { name: '播放', exact: true }).click();
  await expect.poll(() => audio.locator('audio').evaluate(e => (e as HTMLAudioElement).paused)).toBe(true);
  await expect.poll(() => player.locator('video').evaluate(e => (e as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
  await player.getByRole('button', { name: '播放速度', exact: true }).click();
  await player.getByRole('menuitemradio', { name: '1.25×', exact: true }).click();
  await expect(player.getByRole('menu')).toBeHidden();
  await expect.poll(() => player.locator('video').evaluate(e => (e as HTMLVideoElement).playbackRate)).toBe(1.25);
  await player.getByRole('button', { name: '全屏', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement?.querySelector('[data-testid="viewing-overlay"]'))).toBe(true);
  await player.locator('video').evaluate(e => { (e as HTMLVideoElement).volume = .4; (window as any).oldViewingVideo = e; });
  await page.getByRole('button', { name: '切换测试视频' }).evaluate(e => (e as HTMLButtonElement).click());
  await expect.poll(() => player.locator('video').evaluate(e => (e as HTMLVideoElement).currentSrc)).toContain('episode=2');
  await expect.poll(() => player.locator('video').evaluate(e => (e as HTMLVideoElement).playbackRate)).toBe(1.25);
  expect(await player.locator('video').evaluate(e => e === (window as any).oldViewingVideo)).toBe(true);
  expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  expect(await player.locator('video').evaluate(e => (e as HTMLVideoElement).volume)).toBe(.4);
});
test('viewing player explicit hide persists until another click, keyboard remains usable', async ({ page }) => {
  const player = await openPlayer(page);
  await player.getByRole('button', { name: '播放', exact: true }).click();
  const video = player.locator('video');
  await video.click({ position: { x: 100, y: 40 } });
  await expect(player).toHaveAttribute('data-manual-controls', 'false');
  const rect = (await video.boundingBox())!;
  await page.mouse.move(rect.x + 80, rect.y + 60);
  await expect(player.locator('.wk-view-controls')).toHaveCSS('opacity', '0');
  expect(await video.evaluate(e => (e as HTMLVideoElement).paused)).toBe(false);
  await video.click({ position: { x: 100, y: 40 } });
  await expect(player).toHaveAttribute('data-manual-controls', 'true');
  await player.focus(); await page.keyboard.press('Space');
  await expect.poll(() => video.evaluate(e => (e as HTMLVideoElement).paused)).toBe(true);
  await player.getByRole('slider', { name: '定位', exact: true }).press('End');
  await expect.poll(() => video.evaluate(e => (e as HTMLVideoElement).currentTime)).toBeGreaterThan(7);
});
test('viewing player web fullscreen, hold rate, cancellation and unmount restore lifecycle', async ({ page }) => {
  const player = await openPlayer(page);
  await player.getByRole('button', { name: '播放', exact: true }).click();
  await player.getByRole('button', { name: '播放速度', exact: true }).click();
  await player.getByRole('menuitemradio', { name: '1.5×', exact: true }).click();
  await player.getByRole('button', { name: '网页全屏', exact: true }).click();
  await expect(player).toHaveAttribute('data-web-fullscreen', 'true');
  const box = (await player.boundingBox())!;
  expect(box.width).toBe(page.viewportSize()!.width); expect(box.height).toBe(page.viewportSize()!.height);
  const video = player.locator('video');
  await page.mouse.move(box.x + box.width * .8, box.y + box.height * .35); await page.mouse.down();
  await expect.poll(() => video.evaluate(e => (e as HTMLVideoElement).playbackRate)).toBe(2);
  await page.mouse.up(); await expect.poll(() => video.evaluate(e => (e as HTMLVideoElement).playbackRate)).toBe(1.5);
  await page.mouse.down(); await expect.poll(() => video.evaluate(e => (e as HTMLVideoElement).playbackRate)).toBe(2);
  // A source change ends the temporary gesture before the application snapshots the rate.
  await page.getByRole('button', { name: '切换测试视频' }).evaluate(e => (e as HTMLButtonElement).click());
  await page.mouse.up();
  await expect.poll(() => video.evaluate(e => (e as HTMLVideoElement).playbackRate)).toBe(1.5);
  await page.keyboard.press('Escape'); await expect(player).toHaveAttribute('data-web-fullscreen', 'false');
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  await video.evaluate(e => { (window as any).oldViewingVideo = e; });
  await page.getByRole('tab', { name: '状态与反馈', exact: true }).click();
  expect(await page.evaluate(() => ({paused:(window as any).oldViewingVideo.paused, src:(window as any).oldViewingVideo.getAttribute('src')}))).toEqual({paused:true,src:null});
});

test('viewing player touch hold and swipe coexist in fullscreen', async ({ page }) => {
  test.skip(!page.context().browser() || !test.info().project.use.hasTouch, 'Touch viewport only');
  const player = await openPlayer(page), video = player.locator('video');
  const session = await page.context().newCDPSession(page);
  const originalBox = (await video.boundingBox())!, content = page.locator('[data-workerkit-region="content"]');
  const beforeScroll = await content.evaluate(e => e.scrollTop);
  const scrollPoint = {x:originalBox.x + originalBox.width * .5,y:originalBox.y + 25};
  await session.send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[scrollPoint]});
  await session.send('Input.dispatchTouchEvent', {type:'touchMove',touchPoints:[{x:scrollPoint.x,y:scrollPoint.y+40}]});
  await session.send('Input.dispatchTouchEvent', {type:'touchMove',touchPoints:[{x:scrollPoint.x,y:scrollPoint.y+80}]});
  await session.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
  await expect.poll(() => content.evaluate(e => e.scrollTop)).toBeLessThan(beforeScroll);
  await player.getByRole('button', { name: '播放', exact: true }).tap();
  await expect.poll(() => video.evaluate(e => (e as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
  await player.getByRole('button', { name: '播放速度', exact: true }).tap();
  await player.getByRole('menuitemradio', { name: '1.5×', exact: true }).tap();
  await player.getByRole('button', { name: '网页全屏', exact: true }).tap();
  const box = (await video.boundingBox())!;
  const point = { x: box.x + box.width * .8, y: box.y + box.height * .4 };
  await session.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[point] });
  await expect.poll(() => video.evaluate(e => (e as HTMLVideoElement).playbackRate)).toBe(2);
  await session.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
  await expect.poll(() => video.evaluate(e => (e as HTMLVideoElement).playbackRate)).toBe(1.5);
  await video.evaluate(e => { (e as HTMLVideoElement).currentTime = 6; });
  await session.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[point] });
  await session.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{x:box.x+box.width*.4,y:point.y}] });
  await session.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
  await expect.poll(() => video.evaluate(e => (e as HTMLVideoElement).currentTime)).toBeLessThan(1);
  expect(await video.evaluate(e => (e as HTMLVideoElement).paused)).toBe(false);
});

test('viewing player appearance', async ({ page }) => {
  const player = await openPlayer(page);
  await expect(player.locator('video')).toHaveAttribute('poster', '/media/landscape.svg');
  await expect(player).toHaveScreenshot('viewing-player.png', { animations:'disabled' });
});
