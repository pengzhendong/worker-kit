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
);
const browser = await chromium.launch(browserOptions),
  context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  }),
  page = await context.newPage(),
  api = context.request;
page.setDefaultTimeout(15000);
const headers = { Origin: base },
  endpoint = (p) => base + '/standard/api' + p,
  errors = [],
  keys = [],
  results = [];
page.on('pageerror', (e) => errors.push(e.message));
let original;
await mkdir('test-results/expanded-libraries', { recursive: true });
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
  for (const kind of [
    'vuetify',
    'quasar',
    'mui',
    'mantine',
    'pure',
    'soybean',
  ]) {
    console.log('Checking ' + kind);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(base + '/' + kind + '/workspace?backend=standard');
    await expect(page.getByText('依赖正常', { exact: true })).toBeVisible();
    const tab = (name) =>
      kind === 'soybean'
        ? page.locator('.n-tabs-tab').filter({ hasText: name })
        : page.getByRole('tab', { name, exact: true });
    const hasTabs = ['pure', 'soybean'].includes(kind);
    if (hasTabs) await tab('KV 设置').click();
    const marker = 'QA-' + kind + '-' + randomUUID().slice(0, 5);
    await page.getByRole('textbox', { name: /^站点名称/ }).fill(marker);
    await page.getByRole('button', { name: '保存设置', exact: true }).click();
    await expect
      .poll(
        async () =>
          (await (await api.get(endpoint('/settings'))).json()).values
            .siteTitle,
        { timeout: 30000 },
      )
      .toBe(marker);
    if (hasTabs) await tab('访问密钥').click();
    await page.getByRole('textbox', { name: /^名称/ }).fill(marker);
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
    if (hasTabs) await tab('操作审计').click();
    await expect(
      page.getByText('key.revoke', { exact: false }).first(),
    ).toBeVisible();
    if (hasTabs) await tab('API 中心').click();
    await expect(
      page.frameLocator('iframe[title="交互式 API 文档"]').locator('body'),
    ).toContainText('WorkerKit', { timeout: 30000 });
    await page.screenshot({
      path: `test-results/expanded-libraries/${kind}-desktop.png`,
      animations: 'disabled',
    });
    console.log('desktop okay ' + kind);
    const metrics = await page.evaluate(() =>
      [...document.querySelectorAll('*')]
        .filter((el) => {
          const s = getComputedStyle(el);
          return (
            ['auto', 'scroll'].includes(s.overflowY) &&
            el.scrollHeight > el.clientHeight + 20
          );
        })
        .map((el) => ({
          tag: el.tagName,
          class: el.className,
          height: el.clientHeight,
          scroll: el.scrollHeight,
        })),
    );
    console.log('scroll containers', JSON.stringify(metrics));
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.screenshot({
      path: `test-results/expanded-libraries/${kind}-mobile.png`,
      animations: 'disabled',
    });
    results.push({
      kind,
      settings: true,
      keys: true,
      audit: true,
      reference: true,
      mobileNoOverflow: true,
    });
  }
  assert.deepEqual(errors, []);
  await writeFile(
    'test-results/expanded-libraries/results.json',
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log(
    'PASS: six additional native interfaces connect to real management APIs',
  );
} catch (error) {
  await page.screenshot({
    path: 'test-results/expanded-libraries/failure.png',
  });
  throw error;
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
