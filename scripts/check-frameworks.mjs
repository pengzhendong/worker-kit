import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect, request } from '@playwright/test';
import { browserOptions } from './browser.mjs';
const base = process.env.FRAMEWORK_PREVIEW_URL || 'http://kit.localhost:5184';
assert(
  ['127.0.0.1', 'localhost', 'kit.localhost'].includes(
    new URL(base).hostname,
  ) || process.env.WORKERKIT_DEPLOYED === '1',
);
const browser = await chromium.launch(browserOptions),
  context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  }),
  page = await context.newPage(),
  guest = await request.newContext(),
  api = context.request,
  errors = [],
  results = [],
  restore = [];
page.on('pageerror', (e) => errors.push(e.message));
await mkdir('test-results/frameworks', { recursive: true });
const headers = { Origin: base };
try {
  assert.equal(
    (
      await api.post(base + '/standard/api/auth/login', {
        headers,
        data: { username: 'admin', password: 'password' },
      })
    ).status(),
    200,
  );
  for (const name of ['sveltekit', 'astro', 'react-router']) {
    console.log('Checking native framework ' + name);
    const endpoint = base + '/' + name + '/api/verification';
    assert.equal((await guest.get(endpoint)).status(), 401);
    const rendered = await api.get(base + '/' + name + '/');
    assert.equal(rendered.status(), 200);
    assert.match(await rendered.text(), /data-ssr-time/);
    assert.match(rendered.headers()['cache-control'], /no-store/);
    const initial = await api.get(endpoint);
    assert.equal(initial.status(), 200);
    const value = await initial.json();
    assert.equal(value.user, 'admin');
    restore.push({ endpoint, label: value.label });
    assert.equal(
      (
        await api.post(endpoint, {
          headers: { Origin: 'https://foreign.example' },
          data: { label: 'forbidden' },
        })
      ).status(),
      403,
    );
    assert.equal(
      (
        await api.post(endpoint, { headers, data: { label: 'a'.repeat(81) } })
      ).status(),
      400,
    );
    assert.equal(
      (
        await api.post(endpoint, {
          headers,
          data: { label: 'a'.repeat(17000) },
        })
      ).status(),
      413,
    );
    await page.goto(base + '/' + name + '/');
    await expect(
      page.getByText('当前身份：admin', { exact: false }),
    ).toBeVisible();
    await expect(page.locator('[data-ssr-time]')).toBeVisible();
    const label = 'QA-' + name + '-' + randomUUID().slice(0, 5);
    await expect(page.getByLabel('验证名称')).toBeEnabled({ timeout: 20000 });
    await page.getByLabel('验证名称').fill(label);
    await page.getByRole('button', { name: '保存 KV', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('已保存到 KV');
    await expect
      .poll(async () => (await (await api.get(endpoint)).json()).label, {
        timeout: 30000,
      })
      .toBe(label);
    await page.getByLabel('验证名称').fill('');
    await page.getByRole('button', { name: '读取 KV', exact: true }).click();
    await expect(page.getByLabel('验证名称')).toHaveValue(label);
    await page.screenshot({
      path: `test-results/frameworks/${name}-desktop.png`,
      animations: 'disabled',
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.screenshot({
      path: `test-results/frameworks/${name}-mobile.png`,
      animations: 'disabled',
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    results.push({
      name,
      ssr: true,
      hydration: true,
      nativeApi: true,
      session: true,
      originProtection: true,
      bodyLimit: true,
      kv: true,
      mobile: true,
    });
  }
  assert.deepEqual(errors, []);
  await writeFile(
    'test-results/frameworks/results.json',
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log(
    'PASS: three native full-stack frameworks, SSR, authenticated API, origin/body limits, KV and mobile',
  );
} catch (e) {
  console.error('Browser errors', errors);
  await page.screenshot({ path: 'test-results/frameworks/failure.png' });
  throw e;
} finally {
  for (const item of restore)
    await api
      .post(item.endpoint, { headers, data: { label: item.label } })
      .catch(() => {});
  await api
    .post(base + '/standard/api/auth/logout', { headers, data: {} })
    .catch(() => {});
  await guest.dispose();
  await browser.close();
}
