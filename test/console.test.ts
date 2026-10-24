import { env, exports as workersExports } from 'cloudflare:workers';
import { beforeAll, describe, expect, it } from 'vitest';
import { createAdminAuth, createServer } from '../src/server';
import type { AdminBindings } from '../src/server';

const origin = 'https://console.example';
let cookie = '';
const bindings = env as unknown as AdminBindings;
beforeAll(async () => {
  const response = await workersExports.default.fetch(`${origin}/api/auth/login`, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': crypto.randomUUID() },
    body: JSON.stringify({ username: bindings.ADMIN_USERNAME, password: bindings.ADMIN_PASSWORD }),
  });
  cookie = response.headers.get('Set-Cookie')!.split(';')[0]!;
});
async function request(path: string, method = 'GET', body?: unknown) {
  return workersExports.default.fetch(`${origin}/api/admin${path}`, {
    method, headers: { Cookie: cookie, Origin: origin, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe('persisted console features', () => {
  it('creates, filters, edits, batches, exports and deletes resources with audit events', async () => {
    const values = { name: 'test-resource', kind: '配置', status: 'enabled', address: 'https://example.com/test', description: 'persistent resource' };
    const created = await request('/resources', 'POST', values);
    expect(created.status).toBe(201);
    const resource = await created.json<{ id: string }>();
    const list = await (await request('/resources?q=test-resource')).json<{ total: number; items: { id: string }[] }>();
    expect(list.total).toBe(1); expect(list.items[0]?.id).toBe(resource.id);
    expect((await request(`/resources/${resource.id}`, 'PUT', { ...values, description: 'updated' })).status).toBe(200);
    expect((await request('/resources/batch', 'POST', { ids: [resource.id], status: 'disabled' })).status).toBe(200);
    const filtered = await (await request('/resources?q=test-resource&status=disabled')).json<{ total: number }>();
    expect(filtered.total).toBe(1);
    const exported = await request('/resources/export?q=test-resource');
    expect(exported.headers.get('Content-Disposition')).toContain('attachment');
    expect((await exported.json<unknown[]>()).length).toBe(1);
    expect((await request(`/resources/${resource.id}`, 'DELETE')).status).toBe(204);
    expect((await (await request('/resources?q=test-resource')).json<{ total: number }>()).total).toBe(0);
    const audit = await (await request('/audit?action=resource.create')).json<{ items: { target: string }[] }>();
    expect(audit.items.some((event) => event.target === 'test-resource')).toBe(true);
  });

  it('rejects invalid resource input and unknown IDs', async () => {
    expect((await request('/resources', 'POST', { name: '' })).status).toBe(400);
    expect((await request('/resources/missing', 'DELETE')).status).toBe(404);
    expect((await request('/resources/batch', 'POST', { ids: [], status: 'enabled' })).status).toBe(400);
  });

  it('saves settings in KV across requests and rejects unknown or mistyped fields', async () => {
    expect((await request('/settings', 'PUT', { values: { siteName: 'Test Console', pageSize: 50, showWelcome: false } })).status).toBe(200);
    const saved = await (await request('/settings')).json<{ values: { siteName: string; pageSize: number; showWelcome: boolean }; updatedAt: string }>();
    expect(saved.values).toMatchObject({ siteName: 'Test Console', pageSize: 50, showWelcome: false });
    expect(saved.updatedAt).toBeTruthy();
    expect((await request('/settings', 'PUT', { values: { ADMIN_PASSWORD: 'no' } })).status).toBe(400);
    expect((await request('/settings', 'PUT', { values: { pageSize: '50' } })).status).toBe(400);
  });

  it('uploads, lists, downloads and deletes an actual R2 object', async () => {
    const form = new FormData(); form.set('file', new File(['workerkit-file-content'], '测试文件.txt', { type: 'text/plain' }));
    const response = await workersExports.default.fetch(`${origin}/api/admin/files`, { method: 'POST', headers: { Cookie: cookie, Origin: origin }, body: form });
    expect(response.status).toBe(201);
    const file = await response.json<{ key: string; name: string }>();
    expect(file.name).toBe('测试文件.txt');
    const list = await (await request('/files')).json<{ items: { key: string }[] }>();
    expect(list.items.some((item) => item.key === file.key)).toBe(true);
    const download = await request(`/files/download?key=${encodeURIComponent(file.key)}`);
    expect(download.headers.get('Content-Disposition')).toContain('attachment');
    expect(new TextDecoder().decode(await download.arrayBuffer())).toBe('workerkit-file-content');
    expect((await request(`/files?key=${encodeURIComponent(file.key)}`, 'DELETE')).status).toBe(204);
    expect((await request(`/files/download?key=${encodeURIComponent(file.key)}`)).status).toBe(404);
    expect((await request('/files/download?key=outside-scope')).status).toBe(400);
  });

  it('protects file downloads, settings and resource writes without a session', async () => {
    for (const path of ['/files', '/settings', '/resources', '/audit']) expect((await workersExports.default.fetch(`${origin}/api/admin${path}`)).status).toBe(401);
  });

  it('reports real D1 and storage counts', async () => {
    const response = await request('/overview');
    expect(response.status).toBe(200);
    const data = await response.json<{ total: number; enabled: number; bindings: unknown[] }>();
    expect(data.total).toBeGreaterThanOrEqual(4); expect(data.enabled).toBeLessThanOrEqual(data.total); expect(data.bindings).toHaveLength(3);
  });
});

it('permits the requested short preview password only on loopback HTTP with explicit opt-in', async () => {
  for (const allow of [false, true]) {
    const app = createServer<AdminBindings>({ log: () => {} });
    app.route('/auth', createAdminAuth<AdminBindings>({ allowWeakLocalPassword: allow }).routes);
    const testEnv = { ...bindings, ADMIN_PASSWORD: 'password', ADMIN_LOGIN_RATE_LIMITER: { limit: async () => ({ success: true }) } };
    const local = await app.request('http://127.0.0.1/auth/login', { method: 'POST', headers: { Origin: 'http://127.0.0.1', 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'password' }) }, testEnv);
    expect(local.status).toBe(allow ? 200 : 503);
    expect((await app.request(`${origin}/auth/session`, {}, testEnv)).status).toBe(503);
  }
});
