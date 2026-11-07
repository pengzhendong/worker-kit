import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { browserOptions } from './browser.mjs';
const base = process.env.LIBRARY_PREVIEW_URL || 'http://kit.localhost:5184';
assert(
  ['127.0.0.1', 'localhost', 'kit.localhost'].includes(
    new URL(base).hostname,
  ) || process.env.WORKERKIT_DEPLOYED === '1',
  'Remote writes require deployment authorization',
);
const browser = await chromium.launch(browserOptions),
  context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  }),
  page = await context.newPage();
page.setDefaultTimeout(20000);
const headers = { Origin: base },
  api = context.request,
  errors = [],
  keys = [],
  results = [];
page.on('pageerror', (e) => errors.push(e.message));
const endpoint = (path) => base + '/standard/api' + path;
let original;
await mkdir('test-results/component-libraries', { recursive: true });
try {
  assert.equal(
    (
      await api.post(endpoint('/auth/login'), {
        headers,
        data: { username: 'admin', password: 'password' },
      })
    ).status(),
    200,
  );
  original = (await (await api.get(endpoint('/settings'))).json()).values;
  for (const kind of ['element', 'naive', 'shadcn']) {
    console.log('Checking native library ' + kind);
    const tab = (name) =>
      kind === 'naive'
        ? page.locator('.n-tabs-tab').filter({ hasText: name })
        : page.getByRole('tab', { name, exact: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(base + '/' + kind + '/workspace?backend=standard');
    await expect(page.getByText('依赖正常', { exact: true })).toBeVisible();
    const marker = 'QA-' + kind + '-' + randomUUID().slice(0, 5);
    await tab('KV 设置').click();
    await page.getByLabel('站点名称', { exact: true }).fill(marker);
    await page.getByRole('button', { name: '保存设置', exact: true }).click();
    await expect
      .poll(
        async () =>
          (await (await api.get(endpoint('/settings'))).json()).values
            .siteTitle,
      )
      .toBe(marker);
    await tab('访问密钥').click();
    await page.getByLabel('名称', { exact: true }).fill(marker);
    const issuedResponse = page.waitForResponse(
      (r) => r.url() === endpoint('/keys') && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: '签发密钥', exact: true }).click();
    const issued = await (await issuedResponse).json();
    assert(issued.key?.id && issued.token);
    keys.push(issued.key.id);
    await expect(page.locator('[data-issued-token]')).toHaveText(issued.token);
    await page
      .getByRole('button', { name: '已保存，关闭', exact: true })
      .click();
    const row = page.getByRole('row').filter({ hasText: marker });
    await row.getByRole('button', { name: '撤销', exact: true }).click();
    await page.getByRole('button', { name: '确认撤销', exact: true }).click();
    await expect(row.getByText('已撤销', { exact: true })).toBeVisible();
    await tab('操作审计').click();
    await expect(
      page.getByText('key.revoke', { exact: true }).first(),
    ).toBeVisible();
    await tab('API 中心').click();
    const reference = page.frameLocator('iframe[title="交互式 API 文档"]');
    await expect(
      reference.getByText('OpenAPI document unavailable', { exact: false }),
    ).toHaveCount(0);
    await expect(reference.locator('body')).toContainText('WorkerKit', {
      timeout: 30000,
    });
    const content = page.locator('[data-library-scroll]'),
      header = page.locator('[data-library-header]');
    const before = await header.boundingBox();
    await content.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    assert(await content.evaluate((el) => el.scrollTop > 0));
    assert.equal(
      Math.round((await header.boundingBox()).y),
      Math.round(before.y),
    );
    await page.screenshot({
      path: `test-results/component-libraries/${kind}-desktop.png`,
      animations: 'disabled',
    });
    await page
      .getByRole('button', { name: '切换深色主题', exact: true })
      .click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.setViewportSize({ width: 390, height: 844 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      kind + ': document must not overflow',
    );
    await page.getByRole('button', { name: '打开侧边栏', exact: true }).click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await drawer.getByText('组件体验', { exact: true }).click();
    await expect(drawer).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: '组件体验', exact: true }),
    ).toBeVisible();
    await expect.poll(() => content.evaluate((el) => el.scrollTop)).toBe(0);
    await page
      .getByRole('button', { name: '打开原生弹窗', exact: true })
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.screenshot({
      path: `test-results/component-libraries/${kind}-mobile-dark.png`,
      animations: 'disabled',
    });
    results.push({
      kind,
      settings: true,
      issueAndRevoke: true,
      audit: true,
      reference: true,
      scroll: true,
      mobileDrawer: true,
      nativeDialog: true,
      dark: true,
    });
  }
  assert.deepEqual(errors, []);
  await writeFile(
    'test-results/component-libraries/results.json',
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log(
    'PASS: native Element Plus, Naive UI, shadcn-vue settings, keys, audit, API docs, fixed headers, mobile drawers, dialogs and dark themes',
  );
} finally {
  if (original)
    await api
      .put(endpoint('/settings'), { headers, data: { values: original } })
      .catch(() => {});
  for (const id of keys)
    await api.delete(endpoint('/keys/' + id), { headers }).catch(() => {});
  await api
    .post(endpoint('/auth/logout'), { headers, data: {} })
    .catch(() => {});
  await browser.close();
}
