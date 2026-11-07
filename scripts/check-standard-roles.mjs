import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { request } from '@playwright/test';
const base = process.env.STANDARD_PREVIEW_URL || 'http://kit.localhost:5184';
assert(
  ['localhost', '127.0.0.1', 'kit.localhost'].includes(
    new URL(base).hostname,
  ) || process.env.WORKERKIT_DEPLOYED === '1',
);
const admin = await request.newContext(),
  viewer = await request.newContext(),
  guest = await request.newContext(),
  headers = { Origin: base };
const native = (p) => base + '/standard/auth' + p,
  api = (p) => base + '/standard/api' + p;
let userId;
try {
  assert.equal(
    (
      await admin.post(api('/auth/login'), {
        headers,
        data: { username: 'admin', password: 'password' },
      })
    ).status(),
    200,
  );
  const name = 'qa' + randomUUID().replaceAll('-', '').slice(0, 10);
  const data = {
    email: name + '@workerkit.example',
    name,
    role: 'user',
    password: 'viewer-password-2026',
    data: { username: name, displayUsername: name },
  };
  assert(
    (
      await guest.post(native('/admin/create-user'), { headers, data })
    ).status() >= 400,
  );
  const created = await admin.post(native('/admin/create-user'), {
    headers,
    data,
  });
  assert.equal(created.status(), 200);
  userId = (await created.json()).user.id;
  assert.equal(
    (
      await viewer.post(api('/auth/login'), {
        headers,
        data: { username: name, password: data.password },
      })
    ).status(),
    200,
  );
  const workspace = await (await viewer.get(api('/workspace'))).json();
  assert(!workspace.user.permissions.includes('settings:manage'));
  assert.equal(workspace.management.capabilities.settings.manage, false);
  for (const suffix of ['/settings', '/keys', '/audit'])
    assert.equal((await viewer.get(api(suffix))).status(), 403);
  assert.equal(
    (
      await viewer.put(api('/settings'), {
        headers,
        data: { values: { siteTitle: 'forbidden' } },
      })
    ).status(),
    403,
  );
  assert.equal(
    (
      await viewer.post(api('/managed-tasks'), {
        headers,
        data: {
          task: 'check-bindings',
          schedule: { kind: 'interval', minutes: 60 },
          inputs: {},
        },
      })
    ).status(),
    403,
  );
  assert.equal(
    (
      await viewer.post(native('/admin/create-user'), {
        headers,
        data: { ...data, email: 'cannot-create@workerkit.example' },
      })
    ).status(),
    403,
  );
  assert.equal((await viewer.get(api('/service-status'))).status(), 200);
  console.log(
    'PASS: native Better Auth Admin plugin creates a real viewer; read-only permissions and privilege escalation are enforced',
  );
} finally {
  if (userId)
    await admin.post(native('/admin/remove-user'), {
      headers,
      data: { userId },
    });
  for (const context of [viewer, admin, guest]) {
    await context
      .post(api('/auth/logout'), { headers, data: {} })
      .catch(() => {});
    await context.dispose();
  }
}
