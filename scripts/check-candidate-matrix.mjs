import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { frontendViews } from '../examples/ui-suite/catalog.js';
import { browserOptions } from './browser.mjs';

const base = process.env.PAYLOAD_PREVIEW_URL || 'http://kit.localhost:5184';
const sonic =
  process.env.SONIC_PREVIEW_URL || 'http://sonic.kit.localhost:5184';
const browser = await chromium.launch(browserOptions);
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
const results = [],
  errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const credentials = { username: 'admin', password: 'password' };
try {
  assert.equal(
    (
      await context.request.post(base + '/api/users/login', {
        headers: { Origin: base },
        data: credentials,
      })
    ).status(),
    200,
  );
  assert.equal(
    (
      await context.request.post(base + '/standard/api/auth/login', {
        headers: { Origin: base },
        data: credentials,
      })
    ).status(),
    200,
  );
  await context.request.get(sonic + '/auth/login');
  const csrf =
    (await context.cookies(sonic)).find(
      (cookie) => cookie.name === 'csrf_token',
    )?.value || '';
  await context.request.post(sonic + '/auth/login/form', {
    headers: { Origin: sonic, 'X-CSRF-Token': csrf },
    form: { email: 'admin', password: 'password' },
  });
  for (const [backend, origin, apiRoot] of [
    ['payload', base, '/api/workerkit'],
    ['sonic', sonic, '/api/workerkit'],
    ['standard', base, '/standard/api'],
  ]) {
    const workspace = await context.request.get(
      origin + apiRoot + '/workspace',
    );
    assert.equal(workspace.status(), 200, backend + ' authentication');
    for (const view of frontendViews) {
      console.log('Checking ' + backend + ' / ' + view);
      const route =
        view === 'docs' ? '/docs/workspace.html' : `/${view}/workspace`;
      await page.goto(
        origin + route + (backend === 'standard' ? '?backend=standard' : ''),
      );
      await expect(page.locator('[data-workspace]')).toContainText('依赖正常', {
        timeout: 25000,
      });
      await expect(page.locator('body')).toHaveAttribute(
        'data-workerkit-backend',
        backend,
      );
      if (backend === 'standard')
        assert.equal(
          new URL(page.url()).searchParams.get('backend'),
          'standard',
          view + ' preserves selected backend',
        );
      results.push({ backend, view });
    }
  }
  await page.goto(base + '/?view=payload&preload=off');
  await page.getByLabel('选择后端').selectOption('standard');
  await expect(
    page.frameLocator('#preview').locator('[data-workspace]'),
  ).toContainText('依赖正常', { timeout: 25000 });
  assert.equal(new URL(page.url()).searchParams.get('backend'), 'standard');
  assert.deepEqual(errors, []);
  await mkdir('test-results/candidate-matrix', { recursive: true });
  await writeFile(
    'test-results/candidate-matrix/results.json',
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log(`PASS: ${results.length} real frontend and backend combinations`);
} finally {
  await context.request
    .post(base + '/standard/api/auth/logout', {
      headers: { Origin: base },
      data: {},
    })
    .catch(() => {});
  await browser.close();
}
