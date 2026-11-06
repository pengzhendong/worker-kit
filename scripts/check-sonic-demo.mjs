import { browserOptions } from './browser.mjs';
import { chromium, expect } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const base = process.env.PAYLOAD_PREVIEW_URL || 'http://kit.localhost:5184';
const sonic =
  process.env.SONIC_PREVIEW_URL || 'http://sonic.kit.localhost:5184';
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
const output = new URL('../test-results/sonic/', import.meta.url).pathname;
await mkdir(output, { recursive: true });
const browser = await chromium.launch(browserOptions);
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [],
  localPorts = new Set();
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (request) => {
  const url = new URL(request.url());
  if (
    url.hostname.endsWith('.localhost') ||
    ['localhost', '127.0.0.1'].includes(url.hostname)
  )
    localPorts.add(url.port);
});
let stage = 'opening',
  editPath,
  mediaId;
const title = `SonicJS 本地验证 ${Date.now()}`;
const csrfHeaders = async () => ({
  Origin: sonic,
  'X-CSRF-Token':
    (await context.cookies(sonic)).find(
      (cookie) => cookie.name === 'csrf_token',
    )?.value ?? '',
});
try {
  const denied = await context.request.get(sonic + '/admin/content', {
    maxRedirects: 0,
    headers: { Accept: 'text/html' },
  });
  expect(denied.status()).toBe(302);
  expect(denied.headers().location).toContain('/auth/login');
  expect(
    (
      await context.request.post(sonic + '/api/media/upload', {
        headers: { Origin: sonic },
      })
    ).status(),
  ).toBe(401);
  const wrong = await context.request.post(sonic + '/auth/login/form', {
    headers: { Origin: sonic },
    form: { email: 'admin', password: 'incorrect-demo-value' },
  });
  expect(await wrong.text()).toContain('Invalid email or password');
  expect(
    (
      await context.request.get(sonic + '/admin/content', {
        maxRedirects: 0,
        headers: { Accept: 'text/html' },
      })
    ).status(),
  ).toBe(302);
  await page.goto(base + '/?view=sonic');
  await expect(page.getByRole('tab')).toHaveCount(10);
  await expect(
    page.getByRole('tab', { name: 'SonicJS', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  const frame = page.frameLocator('#preview');
  await frame.locator('#email').fill(env.PAYLOAD_DEMO_USERNAME || 'admin');
  await frame.locator('#password').fill(env.PAYLOAD_DEMO_PASSWORD);
  await frame.locator('button[type=submit]').click();
  await expect(
    frame.getByRole('heading', { name: 'Content Management', exact: true }),
  ).toBeVisible({ timeout: 15000 });
  // SonicJS auth does not grant a Payload session, even within the same Worker.
  expect(
    (await context.request.get(base + '/api/workerkit/session')).status(),
  ).toBe(401);
  stage = 'create content';
  await frame.getByRole('button', { name: 'New Content', exact: true }).click();
  await frame.getByRole('link', { name: '演示记录', exact: true }).click();
  await frame.locator('#field-title').fill(title);
  await frame.locator('#field-body').fill('由 SonicJS 原生表单写入独立 D1。');
  const createSaved = page.waitForResponse(
    (response) =>
      new URL(response.url()).origin === sonic &&
      new URL(response.url()).pathname === '/admin/content' &&
      response.request().method() === 'POST',
  );
  await frame.getByRole('button', { name: 'Save', exact: true }).click();
  expect((await createSaved).status()).toBe(302);
  const child = page.frames().find((f) => new URL(f.url()).origin === sonic);
  await expect
    .poll(() => new URL(child.url()).pathname)
    .toMatch(/^\/admin\/content\/[^/]+\/edit$/);
  editPath = new URL(child.url()).pathname;
  await expect(frame.locator('#field-title')).toHaveValue(title);
  await expect(frame.locator('#field-body')).toHaveValue(
    '由 SonicJS 原生表单写入独立 D1。',
  );
  stage = 'update content';
  await frame.locator('#field-title').fill(title + ' · 已编辑');
  await frame.locator('#status').selectOption('published');
  const updateSaved = page.waitForResponse(
    (response) =>
      new URL(response.url()).origin === sonic &&
      new URL(response.url()).pathname.startsWith('/admin/content/') &&
      ['PUT', 'POST'].includes(response.request().method()),
  );
  await frame.getByRole('button', { name: 'Save', exact: true }).click();
  expect((await updateSaved).status()).toBeLessThan(400);
  await child.goto(sonic + editPath);
  await expect(frame.locator('#field-title')).toHaveValue(title + ' · 已编辑');
  await expect(frame.locator('#status')).toHaveValue('published');
  stage = 'R2 upload';
  const png = await readFile(
    new URL(
      '../examples/payload-dashboard/fixtures/sample.png',
      import.meta.url,
    ),
  );
  const upload = await context.request.post(sonic + '/api/media/upload', {
    headers: await csrfHeaders(),
    multipart: {
      file: {
        name: `workerkit-sonic-${Date.now()}.png`,
        mimeType: 'image/png',
        buffer: png,
      },
    },
  });
  expect(upload.status()).toBe(200);
  const file = (await upload.json()).file;
  mediaId = file.id;
  const download = await context.request.get(sonic + '/files/' + file.r2_key);
  expect(download.status()).toBe(200);
  expect(Buffer.compare(await download.body(), png)).toBe(0);
  expect(
    (
      await context.request.post(sonic + '/api/media/upload', {
        headers: { Origin: 'https://invalid.example' },
      })
    ).status(),
  ).toBe(403);
  stage = 'Payload session';
  await page.getByRole('tab', { name: 'Payload', exact: true }).click();
  await frame
    .locator('#field-username')
    .fill(env.PAYLOAD_DEMO_USERNAME || 'admin');
  await frame.locator('#field-password').fill(env.PAYLOAD_DEMO_PASSWORD);
  await frame.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(frame.getByText('依赖正常', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'SonicJS', exact: true }).click();
  await expect(frame.locator('body')).toContainText(env.PAYLOAD_DEMO_EMAIL);
  await frame
    .getByRole('link', { name: 'Content', exact: true })
    .first()
    .click();
  await expect(
    frame.getByRole('heading', { name: 'Content Management', exact: true }),
  ).toBeVisible();
  await expect(
    frame.getByRole('row').filter({ hasText: title + ' · 已编辑' }),
  ).toBeVisible();
  await page.screenshot({
    path: output + 'sonic-desktop.png',
    animations: 'disabled',
  });
  stage = 'media interface';
  await frame.getByRole('link', { name: 'Media', exact: true }).first().click();
  await expect(
    frame.getByRole('heading', { name: /Media/ }).first(),
  ).toBeVisible();
  await expect(
    frame.getByText(file.originalName, { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: output + 'media-desktop.png',
    animations: 'disabled',
  });
  stage = 'mobile';
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/?view=sonic');
  await expect(frame.locator('body')).toContainText(env.PAYLOAD_DEMO_EMAIL);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: output + 'sonic-phone.png',
    animations: 'disabled',
  });
  await page.reload();
  await expect(frame.locator('body')).toContainText(env.PAYLOAD_DEMO_EMAIL);
  await page.getByRole('tab', { name: 'Payload', exact: true }).click();
  await expect(frame.getByText('依赖正常', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  expect([...localPorts]).toEqual([new URL(base).port]);
  await writeFile(
    output + 'result.json',
    JSON.stringify(
      {
        runtime: 'one workerd process',
        sonicVersion: '3.0.0',
        views: 10,
        inFrameLogin: true,
        nativeContentCreateUpdatePublishReload: true,
        r2RoundTripBytes: png.length,
        independentPayloadAndSonicSessions: true,
        switchingAndMobile: true,
        browserErrors: errors.length,
        localPorts: [...localPorts],
      },
      null,
      2,
    ),
  );
  console.log(
    'SonicJS comparison passed: native login/CRUD/publish, D1 persistence, R2 bytes, independent sessions and desktop/mobile switching on one Worker.',
  );
} catch (error) {
  console.error(
    `${stage}: ` +
      String(error.message).replaceAll(env.PAYLOAD_DEMO_PASSWORD, '[redacted]'),
  );
  process.exitCode = 1;
} finally {
  const headers = await csrfHeaders();
  if (mediaId)
    await context.request
      .delete(sonic + '/api/media/' + mediaId, { headers })
      .catch(() => {});
  if (editPath) {
    const id = editPath.match(/^\/admin\/content\/([^/]+)\/edit$/)?.[1];
    if (id)
      await context.request
        .delete(sonic + '/admin/content/' + id, { headers })
        .catch(() => {});
  }
  await browser.close();
}
