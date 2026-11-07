import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { chromium, expect, request } from '@playwright/test';
import { browserOptions } from './browser.mjs';
const origin = process.env.STANDARD_PREVIEW_URL || 'http://kit.localhost:5184';
assert(
  ['127.0.0.1', 'localhost', 'kit.localhost'].includes(
    new URL(origin).hostname,
  ) || process.env.WORKERKIT_DEPLOYED === '1',
  'Remote writes require deployment authorization',
);
const browser = await chromium.launch(browserOptions),
  context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  }),
  page = await context.newPage(),
  guest = await request.newContext();
const headers = { Origin: origin },
  endpoint = (suffix) => origin + '/standard/api' + suffix;
const errors = [],
  plans = [];
page.on('pageerror', (error) => errors.push(error.message));
await mkdir('test-results/standard', { recursive: true });
let original;
try {
  assert.equal((await guest.get(endpoint('/workspace'))).status(), 401);
  assert.equal(
    (
      await guest.post(endpoint('/auth/login'), {
        data: { username: 'admin', password: 'password' },
      })
    ).status(),
    403,
  );
  const wrong = await guest.post(endpoint('/auth/login'), {
    headers,
    data: { username: 'admin', password: 'incorrect-test-password' },
  });
  assert.equal(wrong.status(), 401);
  const signup = await guest.post(origin + '/standard/auth/sign-up/email', {
    headers,
    data: {
      email: 'uninvited@example.invalid',
      password: 'password',
      name: 'Uninvited',
    },
  });
  assert(signup.status() >= 400, 'Public registration must remain disabled');
  await page.goto(origin + '/standard/');
  await page.getByLabel('用户名', { exact: true }).fill('admin');
  await page.getByLabel('密码', { exact: true }).fill('password');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByText('依赖正常', { exact: true })).toBeVisible();
  const api = context.request;
  const workspace = await (await api.get(endpoint('/workspace'))).json();
  assert.equal(workspace.backend, 'standard');
  assert.equal(workspace.user.name, 'admin');
  assert(workspace.management.capabilities.settings.manage);
  original = workspace.management.settings.values;
  const values = { ...original, siteTitle: 'QA-' + randomUUID().slice(0, 8) };
  assert.equal(
    (
      await api.put(endpoint('/settings'), { headers, data: { values } })
    ).status(),
    200,
  );
  const settings = await (await api.get(endpoint('/settings'))).json();
  assert.equal(settings.values.siteTitle, values.siteTitle);
  const issued = await api.post(endpoint('/keys'), {
    headers,
    data: {
      name: 'QA standard auth',
      expiresInDays: 1,
      permissions: ['runtime:read'],
    },
  });
  assert.equal(issued.status(), 201);
  const key = await issued.json();
  assert(key.token && key.key.id, 'Key is displayed only at issuance');
  const keyHeaders = { Authorization: 'Bearer ' + key.token };
  assert.equal(
    (
      await guest.get(endpoint('/service-status'), { headers: keyHeaders })
    ).status(),
    200,
  );
  assert.equal(
    (await guest.get(endpoint('/settings'), { headers: keyHeaders })).status(),
    401,
  );
  assert.equal(
    (await api.delete(endpoint('/keys/' + key.key.id), { headers })).status(),
    200,
  );
  assert.equal(
    (
      await guest.get(endpoint('/service-status'), { headers: keyHeaders })
    ).status(),
    401,
  );
  const created = await api.post(endpoint('/managed-tasks'), {
    headers,
    data: {
      task: 'check-bindings',
      inputs: {},
      schedule: { kind: 'interval', minutes: 60 },
    },
  });
  assert.equal(created.status(), 201);
  const plan = await created.json();
  plans.push(plan.id);
  assert.equal(
    (
      await api.post(endpoint('/managed-tasks/run'), {
        headers,
        data: { id: plan.id },
      })
    ).status(),
    200,
  );
  await expect
    .poll(
      async () => {
        const d = await (await api.get(endpoint('/workspace'))).json();
        return d.runs.some((run) => run.status === 'succeeded');
      },
      { timeout: 20000 },
    )
    .toBe(true);
  await page.screenshot({
    path: 'test-results/standard/desktop.png',
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: 'test-results/standard/mobile.png',
    animations: 'disabled',
  });
  for (const id of plans)
    assert.equal(
      (
        await api.post(endpoint('/managed-tasks/pause'), {
          headers,
          data: { id },
        })
      ).status(),
      200,
    );
  plans.length = 0;
  assert.equal(
    (
      await api.put(endpoint('/settings'), {
        headers,
        data: { values: original },
      })
    ).status(),
    200,
  );
  original = undefined;
  assert.equal(
    (await api.post(endpoint('/auth/logout'), { headers, data: {} })).status(),
    200,
  );
  assert.equal((await api.get(endpoint('/auth/session'))).status(), 401);
  assert.equal((await api.get(endpoint('/workspace'))).status(), 401);
  assert.deepEqual(errors, []);
  console.log(
    'PASS: Better Auth native password login, disabled registration, origin protection, D1 session revocation, settings, scoped keys, real tasks and responsive UI',
  );
} finally {
  for (const id of plans)
    await context.request
      .post(endpoint('/managed-tasks/pause'), { headers, data: { id } })
      .catch(() => {});
  if (original)
    await context.request
      .put(endpoint('/settings'), { headers, data: { values: original } })
      .catch(() => {});
  await guest.dispose();
  await browser.close();
}
