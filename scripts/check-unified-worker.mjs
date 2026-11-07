import {
  frontendPreviewPath,
  officialDemos,
  previewCategory,
} from '../examples/ui-suite/catalog.js';
import { browserOptions } from './browser.mjs';
import { chromium, expect } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const base = process.env.PAYLOAD_PREVIEW_URL || 'http://kit.localhost:5184';
const env = Object.fromEntries(
  (
    await readFile(
      new URL('../examples/payload-dashboard/app/.env', import.meta.url),
      'utf8',
    )
  )
    .split('\n')
    .filter((line) => line.includes('='))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);
const output = new URL('../test-results/unified-worker/', import.meta.url)
  .pathname;
await mkdir(output, { recursive: true });
const browser = await chromium.launch(browserOptions);
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const failures = [],
  ports = new Set(),
  errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (request) => {
  const url = new URL(request.url());
  if (
    url.hostname.endsWith('.localhost') ||
    ['localhost', '127.0.0.1'].includes(url.hostname)
  )
    ports.add(url.port);
});
page.on('response', (response) => {
  if (response.url().startsWith(base) && response.status() >= 400)
    failures.push(`${response.status()} ${new URL(response.url()).pathname}`);
});
let recordId,
  stage = 'opening';
try {
  await page.goto(base + '/?view=payload&preload=off');
  await expect(page.getByRole('tab')).toHaveCount(8);
  await expect(
    page.getByRole('tab', { name: 'Payload', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  const frame = page.frameLocator('#preview');
  stage = 'login';
  await frame
    .locator('#field-username')
    .fill(env.PAYLOAD_DEMO_USERNAME || 'admin');
  await frame.locator('#field-password').fill(env.PAYLOAD_DEMO_PASSWORD);
  await frame.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(frame.getByText('依赖正常', { exact: true })).toBeVisible();
  await expect(page.locator('#open')).toHaveAttribute('href', base + '/admin/');
  const views = [
    ['Nuxt UI', 'nuxt'],
    ['Sakai', 'prime'],
    ['Vben Admin', 'vben'],
    ['Ant Design Pro', 'pro'],
    ['Refine', 'refine'],
    ['Tabler', 'tabler'],
    ['AdminLTE', 'adminlte'],
    ['VitePress', 'docs'],
  ];
  await page.locator('#preview-category').selectOption('components');
  for (const [name, view] of views) {
    stage = `frontend ${view}`;
    await page.locator('#preview-category').selectOption(previewCategory(view));
    await page.getByRole('tab', { name, exact: true }).click();
    await expect(page.locator('#open')).toHaveAttribute(
      'href',
      officialDemos[view],
    );
    await expect(page.locator('.stage')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('#preview')).toHaveAttribute(
      'src',
      base + frontendPreviewPath(view),
    );
    if (view !== 'docs') {
      await expect(
        frame.getByRole('heading', { name: '表格', exact: true }).last(),
      ).toBeVisible();
    }
  }
  await page.locator('#preview-category').selectOption('backend');
  const created = await context.request.post(base + '/api/workerkit/notes', {
    headers: { Origin: base },
    data: { title: '多前端共用后台验证', status: 'draft' },
  });
  expect(created.status()).toBe(201);
  recordId = (await created.json()).item.id;
  const notes = await (
    await context.request.get(base + '/api/workerkit/notes')
  ).json();
  expect(notes.items.some((note) => note.id === recordId)).toBe(true);
  stage = 'Payload switching';
  await page.getByRole('tab', { name: 'Payload', exact: true }).click();
  await expect(frame.getByText('依赖正常', { exact: true })).toBeVisible();
  await expect(
    frame.locator(`a[href="/admin/collections/notes/${recordId}"]`),
  ).toHaveText('多前端共用后台验证');
  await frame.getByRole('button', { name: '运行检查', exact: true }).click();
  await expect(frame.locator('.wk-run').first()).toContainText('成功');
  await page.screenshot({
    path: output + 'payload-desktop.png',
    animations: 'disabled',
  });
  await page.locator('#preview-category').selectOption('components');
  await page.getByRole('tab', { name: 'Nuxt UI', exact: true }).click();
  await expect(
    frame.getByRole('heading', { name: '表格', exact: true }).last(),
  ).toBeVisible();
  await page.screenshot({
    path: output + 'frontend-desktop.png',
    animations: 'disabled',
  });
  const headerBefore = await page.locator('header').first().boundingBox();
  await page.getByRole('button', { name: '手机', exact: true }).click();
  await expect(page.locator('#preview')).toHaveClass('mobile');
  stage = 'mobile switching';
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#preview-category').selectOption('backend');
  await page.getByRole('tab', { name: 'Payload', exact: true }).click();
  await expect(frame.getByText('依赖正常', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: output + 'payload-phone.png',
    animations: 'disabled',
  });
  await page.reload();
  await expect(
    page.getByRole('tab', { name: 'Payload', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.frameLocator('#preview').getByText('依赖正常', { exact: true }),
  ).toBeVisible();
  expect(
    (await context.request.get(`${base}/nuxt/assets/not-found.js`)).status(),
  ).toBe(404);
  expect(
    (await context.request.post(`${base}/nuxt/tasks`, { data: {} })).status(),
  ).toBe(405);
  expect(
    (await context.request.get(`${base}/api/workerkit/session`)).status(),
  ).toBe(200);
  const full = await context.request.get(`${base}/vben/media/clip.mp4`);
  const bytes = await full.body();
  const partial = await context.request.get(`${base}/vben/media/clip.mp4`, {
    headers: { Range: 'bytes=0-99' },
  });
  expect(partial.status()).toBe(206);
  expect(partial.headers()['content-range']).toBe(`bytes 0-99/${bytes.length}`);
  expect(Buffer.compare(await partial.body(), bytes.subarray(0, 100))).toBe(0);
  const tail = await context.request.get(`${base}/vben/media/clip.mp4`, {
    headers: { Range: 'bytes=-20' },
  });
  expect(tail.status()).toBe(206);
  expect(Buffer.compare(await tail.body(), bytes.subarray(-20))).toBe(0);
  expect(
    (
      await context.request.get(`${base}/vben/media/clip.mp4`, {
        headers: { Range: `bytes=${bytes.length + 1}-` },
      })
    ).status(),
  ).toBe(416);
  expect(
    (
      await context.request.get(`${base}/vben/media/clip.mp4`, {
        headers: { Range: 'bytes=0-99', 'If-Range': '"old-version"' },
      })
    ).status(),
  ).toBe(200);
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
  expect([...ports]).toEqual([new URL(base).port]);
  await writeFile(
    output + 'result.json',
    JSON.stringify(
      {
        oneOrigin: base,
        availableViews: 10,
        iframePayloadLogin: true,
        separatePublicFrontends: true,
        sharedD1WriteAndRead: true,
        realOperations: true,
        mobileSwitchAndRefresh: true,
        headerHeight: headerBefore.height,
        browserErrors: errors.length,
        otherLocalServers: 0,
      },
      null,
      2,
    ),
  );
  console.log(
    'Unified Worker passed: eight backend views, in-frame login, shared session/D1, real operations, mobile switching and no other local servers.',
  );
} catch (error) {
  console.error(
    `${stage}: ` +
      String(error.message).replaceAll(env.PAYLOAD_DEMO_PASSWORD, '[redacted]'),
  );
  process.exitCode = 1;
} finally {
  if (recordId)
    await context.request
      .delete(`${base}/api/notes/${recordId}`)
      .catch(() => {});
  await browser.close();
}
