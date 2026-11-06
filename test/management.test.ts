import { env } from 'cloudflare:workers';
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import {
  createManagementRoutes,
  adminManagementPermissions,
} from '../src/server/management';
import { createOperationsRoutes } from '../src/server/operations';
import type { ManagementPrincipal } from '../src/contracts/management';

type Bindings = { store: KVNamespace; user: ManagementPrincipal | null };
function fixture() {
  const origin = 'https://management.test';
  const bindings: Bindings = {
    store: (env as unknown as { SETTINGS: KVNamespace }).SETTINGS,
    user: {
      id: 'native-user',
      name: 'Administrator',
      permissions: [...adminManagementPermissions],
    },
  };
  const prefix = 'management-test:' + crypto.randomUUID() + ':';
  const management = {
    store: (e: Bindings) => e.store,
    prefix,
    apiRoot: '/api/manage',
    cookieName: 'host-session',
    settings: { title: 'demo', enabled: true },
  };
  const app = new Hono<{ Bindings: Bindings }>().route(
    '/api/manage',
    createOperationsRoutes<Bindings>({
      backend: 'test',
      management,
      principal: (c) => c.env.user,
      runtime: () => ({
        application: { name: 'test', version: '1' },
        environment: 'test',
        checks: [],
      }),
      tasks: () => ({
        fetch: async (request) =>
          new Request(request).method === 'GET'
            ? Response.json({ definitions: [], plans: [], runs: [] })
            : Response.json({ id: 'created-plan' }, { status: 201 }),
      }),
    }),
  );
  const fetch = (path: string, init?: RequestInit) =>
    app.fetch(new Request(origin + '/api/manage' + path, init), bindings);
  const headers = { Origin: origin, 'Content-Type': 'application/json' };
  return { origin, bindings, fetch, headers, management };
}
describe('shared management capabilities behind host authentication', () => {
  it('requires host authentication on every management entry including docs and capabilities', async () => {
    const f = fixture();
    f.bindings.user = null;
    for (const path of [
      '/workspace',
      '/capabilities',
      '/settings',
      '/keys',
      '/audit',
      '/openapi.json',
      '/reference',
    ])
      expect((await f.fetch(path)).status).toBe(401);
  });
  it('filters workspace data and enforces permissions on direct endpoints', async () => {
    const f = fixture();
    f.bindings.user!.permissions = ['tasks:read', 'runtime:read'];
    const workspace = (await (await f.fetch('/workspace')).json()) as {
      management: { settings: unknown; keys: unknown; audit: unknown };
    };
    expect(workspace.management).toMatchObject({
      settings: null,
      keys: null,
      audit: null,
    });
    for (const path of ['/settings', '/keys', '/audit'])
      expect((await f.fetch(path)).status).toBe(403);
    expect(
      (
        await f.fetch('/settings', {
          method: 'PUT',
          headers: f.headers,
          body: '{"values":{"title":"private"}}',
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await f.fetch('/managed-tasks', {
          method: 'POST',
          headers: f.headers,
          body: '{}',
        })
      ).status,
    ).toBe(403);
  });
  it('persists settings and task audits without recording values or task inputs', async () => {
    const f = fixture();
    expect(
      (
        await f.fetch('/settings', {
          method: 'PUT',
          headers: f.headers,
          body: '{"values":{"title":"private-value"}}',
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await f.fetch('/managed-tasks', {
          method: 'POST',
          headers: f.headers,
          body: '{"inputs":{"untrusted":"private-input"}}',
        })
      ).status,
    ).toBe(201);
    const events = await (await f.fetch('/audit')).text();
    expect(events).toContain('settings.update');
    expect(events).toContain('task.create');
    expect(events).toContain('native-user');
    expect(events).not.toContain('private-value');
    expect(events).not.toContain('private-input');
    const other = createManagementRoutes<Bindings>({
      ...f.management,
      prefix: 'other:' + crypto.randomUUID(),
      principal: (c) => c.env.user,
      runtime: () => ({
        application: { name: 'test', version: '1' },
        environment: 'test',
        checks: [],
      }),
    });
    const response = await other.routes.fetch(
      new Request(f.origin + '/settings'),
      f.bindings,
    );
    expect(await response.json()).toMatchObject({ values: { title: 'demo' } });
  });
  it('adds newly declared defaults without exposing removed or mistyped stored fields', async () => {
    const f = fixture();
    await f.bindings.store.put(
      f.management.prefix + 'settings',
      JSON.stringify({
        values: {
          title: 'preserved',
          removed: 'private-legacy',
          enabled: 'wrong-type',
        },
        updatedAt: '2026-11-06T00:00:00Z',
      }),
    );
    const response = await f.fetch('/settings');
    expect(await response.json()).toEqual({
      values: { title: 'preserved', enabled: true },
      updatedAt: '2026-11-06T00:00:00Z',
    });
    const workspaceResponse = await f.fetch('/workspace');
    expect(workspaceResponse.status).toBe(200);
    const workspace = await workspaceResponse.text();
    expect(JSON.parse(workspace).management.settings.values).toEqual({
      title: 'preserved',
      enabled: true,
    });
    expect(workspace).not.toContain('private-legacy');
  });
  it('keeps scoped keys out of host sessions and isolates backend key namespaces', async () => {
    const f = fixture();
    const issued = (await (
      await f.fetch('/keys', {
        method: 'POST',
        headers: f.headers,
        body: '{"name":"fixture","expiresInDays":1,"permissions":["runtime:read"]}',
      })
    ).json()) as { token: string; key: { id: string } };
    f.bindings.user = null;
    const headers = { Authorization: 'Bearer ' + issued.token };
    expect((await f.fetch('/service-status', { headers })).status).toBe(200);
    for (const path of ['/settings', '/keys', '/audit', '/workspace'])
      expect((await f.fetch(path, { headers })).status).toBe(401);
    const other = createManagementRoutes<Bindings>({
      ...f.management,
      prefix: 'other:' + crypto.randomUUID(),
      principal: () => null,
      runtime: () => ({
        application: { name: 'test', version: '1' },
        environment: 'test',
        checks: [],
      }),
    });
    expect(
      (
        await other.routes.fetch(
          new Request(f.origin + '/service-status', { headers }),
          f.bindings,
        )
      ).status,
    ).toBe(401);
  });
  it('applies origin checks and permissions when mounted under a different path than the documented URL', async () => {
    const f = fixture();
    f.bindings.user!.permissions = ['runtime:read'];
    const service = createManagementRoutes<Bindings>({
      ...f.management,
      apiRoot: '/hub/api/admin',
      principal: (c) => c.env.user,
      runtime: () => ({
        application: { name: 'test', version: '1' },
        environment: 'test',
        checks: [],
      }),
    });
    const app = new Hono<{ Bindings: Bindings }>().route(
      '/api/admin',
      service.routes,
    );
    expect(
      (await app.fetch(new Request(f.origin + '/api/admin/keys'), f.bindings))
        .status,
    ).toBe(403);
    expect(
      (
        await f.fetch('/keys', {
          method: 'POST',
          headers: { ...f.headers, Origin: 'https://untrusted.test' },
          body: '{}',
        })
      ).status,
    ).toBe(403);
  });
});
