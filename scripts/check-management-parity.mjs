import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect, request } from '@playwright/test';
import { browserOptions } from './browser.mjs';
const base = process.env.PAYLOAD_PREVIEW_URL || 'http://kit.localhost:5184',
  sonic = process.env.SONIC_PREVIEW_URL || 'http://sonic.kit.localhost:5184';
assert(
  new URL(base).hostname.endsWith('.localhost') ||
    ['localhost', '127.0.0.1'].includes(new URL(base).hostname) ||
    process.env.WORKERKIT_DEPLOYED === '1',
  'Remote writes require an explicitly authorized deployment',
);
const browser = await chromium.launch(browserOptions),
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  }),
  page = await context.newPage(),
  guest = await request.newContext();
page.setDefaultTimeout(20000);
page.setDefaultNavigationTimeout(60000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const routes = [
  { name: 'payload', origin: base, root: '/api/workerkit' },
  { name: 'sonic', origin: sonic, root: '/api/workerkit' },
  { name: 'native', origin: base, root: '/native/api' },
  { name: 'hub', origin: base, root: '/hub/api/admin' },
];
const api = context.request,
  original = new Map(),
  keys = [],
  plans = [],
  results = [];
const marker = 'QA-' + randomUUID().slice(0, 8);
const headers = async (origin) => ({
  Origin: origin,
  ...(origin === sonic
    ? {
        'X-CSRF-Token':
          (await context.cookies(sonic)).find((c) => c.name === 'csrf_token')
            ?.value || '',
      }
    : {}),
});
const endpoint = (route, path) => route.origin + route.root + path;
async function login() {
  assert.equal(
    (
      await api.post(base + '/api/users/login', {
        headers: { Origin: base },
        data: { username: 'admin', password: 'password' },
      })
    ).status(),
    200,
  );
  await api.get(sonic + '/auth/login');
  await api.post(sonic + '/auth/login/form', {
    headers: await headers(sonic),
    form: { email: 'admin', password: 'password' },
  });
  for (const route of routes.slice(2))
    assert.equal(
      (
        await api.post(endpoint(route, '/auth/login'), {
          headers: await headers(route.origin),
          data: { username: 'admin', password: 'password' },
        })
      ).status(),
      200,
    );
}
async function workspace(route) {
  const response = await api.get(endpoint(route, '/workspace'));
  assert.equal(response.status(), 200);
  return response.json();
}
async function checkPanel(frame, route, suffix) {
  const panel = frame.locator('[data-management]');
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: 'KV 设置', exact: true }).click();
  const value = marker + '-' + suffix;
  await panel.getByLabel('站点名称', { exact: true }).fill(value);
  await panel.getByRole('button', { name: '保存设置', exact: true }).click();
  await expect
    .poll(
      async () =>
        (await (await api.get(endpoint(route, '/settings'))).json()).values
          .siteTitle,
    )
    .toBe(value);
  await panel.getByRole('button', { name: '访问密钥', exact: true }).click();
  await panel.getByLabel('名称', { exact: true }).fill(value);
  const issuedResponse = page.waitForResponse(
    (response) =>
      response.url() === endpoint(route, '/keys') &&
      response.request().method() === 'POST',
  );
  await panel.getByRole('button', { name: '签发密钥', exact: true }).click();
  const issued = await (await issuedResponse).json();
  keys.push({ route, id: issued.key.id });
  assert.equal(
    (await panel.locator('[data-issued-token]').innerText()).trim() ===
      issued.token,
    true,
  );
  assert.equal(
    await frame
      .locator('body')
      .evaluate(
        (token) =>
          JSON.stringify({ ...localStorage, ...sessionStorage }).includes(
            token,
          ),
        issued.token,
      ),
    false,
  );
  assert.equal(
    (
      await guest.get(endpoint(route, '/service-status'), {
        headers: { Authorization: 'Bearer ' + issued.token },
      })
    ).status(),
    200,
  );
  assert.equal(
    (
      await guest.get(endpoint(route, '/settings'), {
        headers: { Authorization: 'Bearer ' + issued.token },
      })
    ).status(),
    401,
  );
  await panel
    .getByRole('button', { name: '已保存，关闭', exact: true })
    .click();
  await expect(panel.locator('[data-issued-token]')).toHaveCount(0);
  await panel
    .getByRole('row')
    .filter({ hasText: value })
    .getByRole('button', { name: /^撤\s*销$/ })
    .click();
  await frame.getByRole('button', { name: '确认撤销', exact: true }).click();
  await expect
    .poll(async () =>
      (
        await guest.get(endpoint(route, '/service-status'), {
          headers: { Authorization: 'Bearer ' + issued.token },
        })
      ).status(),
    )
    .toBe(401);
  await expect(
    frame.getByRole('button', { name: '确认撤销', exact: true }),
  ).toBeHidden();
  await panel.getByRole('button', { name: '操作审计', exact: true }).click();
  await expect(
    panel.getByText('key.revoke', { exact: true }).first(),
  ).toBeVisible();
  assert.equal((await panel.innerText()).includes(issued.token), false);
  await panel.getByRole('button', { name: 'API 中心', exact: true }).click();
  await expect(
    panel.getByRole('link', { name: '打开交互式 API 文档 ↗', exact: true }),
  ).toHaveAttribute('href', route.root + '/reference');
  assert.equal((await api.get(endpoint(route, '/reference'))).status(), 200);
  results.push({
    backend: route.name,
    view: suffix,
    settings: true,
    keys: true,
    audit: true,
    api: true,
  });
  console.log('PASS management UI', route.name, suffix);
}
try {
  for (const route of routes)
    for (const path of [
      '/settings',
      '/keys',
      '/audit',
      '/workspace',
      '/reference',
    ])
      assert.equal((await guest.get(endpoint(route, path))).status(), 401);
  await login();
  for (const route of routes) {
    const data = await workspace(route);
    assert.deepEqual(data.management.capabilities, {
      runtime: true,
      settings: { read: true, manage: true },
      keys: { manage: true },
      audit: { read: true },
      tasks: { read: true, manage: true },
    });
    original.set(
      route.name,
      await (await api.get(endpoint(route, '/settings'))).json(),
    );
    assert.equal(
      (
        await api.put(endpoint(route, '/settings'), {
          headers: { Origin: 'https://untrusted.test' },
          data: { values: { siteTitle: marker } },
        })
      ).status(),
      403,
    );
    const before = data.plans.map((plan) => plan.schedule.minutes);
    const minutes = Array.from({ length: 10080 }, (_, index) => index + 1).find(
      (value) => !before.includes(value),
    );
    const created = await api.post(endpoint(route, '/managed-tasks'), {
      headers: await headers(route.origin),
      data: {
        task: 'check-bindings',
        inputs: {},
        schedule: { kind: 'interval', minutes },
      },
    });
    assert.equal(created.status(), 201);
    const plan = await created.json();
    plans.push({ route, id: plan.id });
    assert.equal(
      (
        await api.post(endpoint(route, '/managed-tasks/run'), {
          headers: await headers(route.origin),
          data: { id: plan.id },
        })
      ).status(),
      200,
    );
    assert.ok(
      (await workspace(route)).runs.some(
        (run) => run.planId === plan.id && run.status === 'succeeded',
      ),
    );
    assert.equal(
      (
        await api.post(endpoint(route, '/managed-tasks/pause'), {
          headers: await headers(route.origin),
          data: { id: plan.id },
        })
      ).status(),
      200,
    );
    assert.ok(
      !(await workspace(route)).plans.find((item) => item.id === plan.id)
        .scheduleId,
    );
    assert.equal(
      (
        await api.post(endpoint(route, '/managed-tasks/resume'), {
          headers: await headers(route.origin),
          data: { id: plan.id },
        })
      ).status(),
      200,
    );
    const issued = await (
      await api.post(endpoint(route, '/keys'), {
        headers: await headers(route.origin),
        data: { name: marker, expiresInDays: 1, permissions: ['runtime:read'] },
      })
    ).json();
    keys.push({ route, id: issued.key.id });
    for (const other of routes)
      assert.equal(
        (
          await guest.get(endpoint(other, '/service-status'), {
            headers: { Authorization: 'Bearer ' + issued.token },
          })
        ).status(),
        other === route ? 200 : 401,
      );
    console.log(
      'PASS management API',
      route.name,
      'task lifecycle, scoped-key isolation and permissions',
    );
  }
  // A native Payload viewer can read tasks but cannot use management secrets or writes.
  const viewerName = 'viewer-' + randomUUID().slice(0, 8);
  let viewerId;
  const viewer = await request.newContext();
  try {
    const created = await api.post(base + '/api/users', {
      headers: await headers(base),
      data: {
        username: viewerName,
        email: viewerName + '@workerkit.test',
        password: 'fixture-password-123',
        role: 'viewer',
      },
    });
    assert.equal(created.status(), 201);
    viewerId = (await created.json()).doc.id;
    assert.equal(
      (
        await viewer.post(base + '/api/users/login', {
          headers: { Origin: base },
          data: { username: viewerName, password: 'fixture-password-123' },
        })
      ).status(),
      200,
    );
    const data = await (
      await viewer.get(base + '/api/workerkit/workspace')
    ).json();
    assert.equal(data.management.keys, null);
    assert.equal(data.management.settings, null);
    assert.equal(data.management.audit, null);
    for (const path of ['/keys', '/audit', '/settings'])
      assert.equal(
        (await viewer.get(base + '/api/workerkit' + path)).status(),
        403,
      );
  } finally {
    if (viewerId)
      await api.delete(base + '/api/users/' + viewerId, {
        headers: await headers(base),
      });
    await viewer.dispose();
  }
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
  for (const route of routes.slice(0, 2)) {
    for (const [, view] of views) {
      await page.goto(
        route.origin +
          (view === 'docs' ? '/docs/workspace.html' : `/${view}/workspace`),
      );
      await expect(page.locator('[data-workspace]')).toContainText('依赖正常');
      await checkPanel(page, route, view);
    }
  }
  // A token must not reappear after external logout and a new authenticated refresh.
  await page.goto(base + '/?view=payload&preload=off');
  const active = page.frameLocator('#preview');
  const navToggle = active.locator(
    '.nav-toggler[aria-label="Open Menu"]:visible',
  );
  if (await navToggle.count()) await navToggle.click();
  await active.getByRole('link', { name: '应用运维', exact: true }).click();
  await expect(active.locator('[data-workspace]')).toContainText('依赖正常');
  const controls = active.locator('[data-management]');
  await controls.getByRole('button', { name: '访问密钥', exact: true }).click();
  await controls
    .getByLabel('名称', { exact: true })
    .fill(marker + '-session-boundary');
  const issue = page.waitForResponse(
    (r) =>
      r.url() === endpoint(routes[0], '/keys') &&
      r.request().method() === 'POST',
  );
  await controls.getByRole('button', { name: '签发密钥', exact: true }).click();
  const oneTime = await (await issue).json();
  keys.push({ route: routes[0], id: oneTime.key.id });
  await expect(controls.locator('[data-issued-token]')).toBeVisible();
  assert.equal(
    (
      await api.post(base + '/api/users/logout', {
        headers: await headers(base),
      })
    ).status(),
    200,
  );
  await active.getByRole('button', { name: '刷新', exact: true }).click();
  await expect(
    active.getByRole('link', { name: '登录后端', exact: true }),
  ).toBeVisible();
  assert.equal(
    (
      await api.post(base + '/api/users/login', {
        headers: { Origin: base },
        data: { username: 'admin', password: 'password' },
      })
    ).status(),
    200,
  );
  await active.getByRole('button', { name: '刷新', exact: true }).click();
  await expect(active.locator('[data-workspace]')).toContainText('依赖正常');
  await controls.getByRole('button', { name: '访问密钥', exact: true }).click();
  await expect(controls.locator('[data-issued-token]')).toHaveCount(0);
  // NuxtHub shares the Nuxt UI management component and keeps the storage example separate.
  await page.goto(base + '/hub/');
  await expect(
    page.getByRole('heading', { name: 'NuxtHub 全栈工作台', exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-workspace]')).toContainText('依赖正常');
  await checkPanel(page, routes[3], 'hub');
  // Lightweight task UI is real and uses its independent task namespace.
  await page.goto(base + '/native/#/tasks');
  await expect(page.locator('[data-workspace]')).toContainText('依赖正常');
  await expect(
    page.getByRole('button', { name: '创建计划', exact: true }),
  ).toBeVisible();
  // Scalar is a local bundle on both CMS origins; execute a real request with native cookies.
  for (const route of routes.slice(0, 2)) {
    const docs = await context.newPage();
    try {
      await docs.goto(endpoint(route, '/reference'));
      await expect(
        docs.getByRole('button', { name: /GET .*runtime 运行检查/ }),
      ).toBeVisible({ timeout: 30000 });
      await docs
        .getByRole('button', { name: /GET .*runtime 运行检查/ })
        .click();
      await docs.getByRole('button', { name: /^测试请求/ }).click();
      const [response] = await Promise.all([
        docs.waitForResponse(
          (r) =>
            r.url() === endpoint(route, '/runtime') &&
            r.request().method() === 'GET',
        ),
        docs
          .getByRole('button', { name: /向 .*runtime 发送 get 请求/ })
          .click(),
      ]);
      assert.equal(response.status(), 200);
    } finally {
      await docs.close();
    }
  }
  // Restoring one namespace must leave the other three unchanged.
  for (const route of routes) {
    await api.put(endpoint(route, '/settings'), {
      headers: await headers(route.origin),
      data: original.get(route.name),
    });
    assert.deepEqual(
      (await (await api.get(endpoint(route, '/settings'))).json()).values,
      original.get(route.name).values,
    );
  }
  assert.deepEqual(errors, []);
  await mkdir('test-results/management-parity', { recursive: true });
  await writeFile(
    'test-results/management-parity/result.json',
    JSON.stringify(
      {
        routes: 4,
        ui: results,
        viewerBoundary: true,
        scopedKeyIsolation: true,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    'PASS parity: four backends, sixteen CMS UIs, native/Hub tasks, settings, scoped keys, audit, API docs and real viewer permissions',
  );
} finally {
  for (const { route, id } of keys)
    await api
      .delete(endpoint(route, '/keys/' + id), {
        headers: await headers(route.origin),
      })
      .catch(() => {});
  for (const { route, id } of plans)
    await api
      .post(endpoint(route, '/managed-tasks/pause'), {
        headers: await headers(route.origin),
        data: { id },
      })
      .catch(() => {});
  for (const route of routes)
    if (original.has(route.name))
      await api
        .put(endpoint(route, '/settings'), {
          headers: await headers(route.origin),
          data: original.get(route.name),
        })
        .catch(() => {});
  await guest.dispose();
  await browser.close();
}
