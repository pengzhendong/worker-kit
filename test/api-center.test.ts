import { env } from 'cloudflare:workers';
import { expect, it } from 'vitest';
import { createDashboard } from '../examples/dashboard/server';
import type { Bindings } from '../examples/dashboard/server';
import { endpoints } from '../examples/dashboard/server/api-description';
import { createApiKeys, hashApiKey } from '../src/server/api-keys';
import { d1ApiKeyStore } from '../examples/dashboard/server/api-key-store';
import { listModulePermissions } from '../src/modules';
import { dashboardModules } from '../examples/dashboard/modules';

const bindings = env as unknown as Bindings;
const origin = 'https://api.example';
async function fixture(grants?: string[]) {
  const app = createDashboard(grants ? { resolvePermissions: () => grants } : {});
  const login = await app.request(`${origin}/api/auth/login`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': crypto.randomUUID() }, body: JSON.stringify({ username: bindings.ADMIN_USERNAME, password: bindings.ADMIN_PASSWORD }) }, bindings);
  const headers = { Cookie: login.headers.get('Set-Cookie')!.split(';')[0]!, Origin: origin, 'Content-Type': 'application/json' };
  const issue = async (permissions = ['resources:read']) => {
    const response = await app.request(`${origin}/api/admin/api-keys`, { method: 'POST', headers, body: JSON.stringify({ name: 'Test script', expiresInDays: 7, permissions }) }, bindings);
    expect(response.status).toBe(201); return await response.json() as { token: string; key: { id: string; prefix: string } };
  };
  return { app, headers, issue };
}
it('publishes a protected complete OpenAPI document with real schemas and distinct security schemes', async () => {
  const { app, headers } = await fixture();
  expect((await app.request('/api/admin/openapi.json', {}, bindings)).status).toBe(401);
  const response = await app.request(`${origin}/api/admin/openapi.json`, { headers }, bindings); expect(response.status).toBe(200);
  const spec = await response.json() as any;
  expect(spec.openapi).toBe('3.1.0');
  const actual = Object.entries(spec.paths).flatMap(([path, value]) => Object.keys(value as object).filter((method) => ['get', 'post', 'put', 'delete'].includes(method)).map((method) => `${method.toUpperCase()} ${path}`));
  expect(actual.sort()).toEqual(endpoints.map((entry) => `${entry.method} ${entry.path.replace(':id', '{id}')}`).sort());
  expect(spec.paths['/api/admin/resources'].post.requestBody.content['application/json'].schema.required).toContain('name');
  expect(spec.paths['/api/admin/resources'].get.security).toEqual([{ cookieAuth: [] }, { bearerAuth: [] }]);
  expect(spec.paths['/api/admin/api-keys'].post.security).toEqual([{ cookieAuth: [] }]);
  expect(spec.paths['/api/admin/files/download'].get.responses[200].content['application/octet-stream']).toBeTruthy();
});
it('stores only a digest and returns a secret once; lists contain metadata, never secrets or hashes', async () => {
  const { app, headers, issue } = await fixture(); const created = await issue();
  expect(created.token).toMatch(/^wk_[\w-]{43}$/);
  const stored = await bindings.DB.prepare('SELECT hash FROM api_keys WHERE id = ?').bind(created.key.id).first<{ hash: string }>();
  expect(stored!.hash).toBe(await hashApiKey(created.token)); expect(stored!.hash).not.toContain(created.token);
  const response = await app.request(`${origin}/api/admin/api-keys?page=1&pageSize=10`, { headers }, bindings);
  const text = await response.text(); expect(text).not.toContain(created.token); expect(text).not.toContain(stored!.hash); expect(text).not.toContain('"hash"');
  expect(JSON.parse(text).grantablePermissions).not.toContain('api:issue');
});
it('allows scoped reads without Cookie or Origin, denies writes, admin tools and token management, never falls back to Cookie', async () => {
  const { app, headers, issue } = await fixture(); const created = await issue();
  const bearer = { Authorization: `Bearer ${created.token}` };
  expect((await app.request(`${origin}/api/admin/resources`, { headers: bearer }, bindings)).status).toBe(200);
  expect((await app.request(`${origin}/api/admin/resources`, { method: 'POST', headers: { ...bearer, 'Content-Type': 'application/json' }, body: '{}' }, bindings)).status).toBe(403);
  for (const path of ['/api/admin/api-keys', '/api/admin/openapi.json', '/api/admin/diagnostics', '/api/admin/audit/retention']) expect((await app.request(`${origin}${path}`, { headers: bearer }, bindings)).status).toBe(403);
  expect((await app.request(`${origin}/api/admin/api-keys`, { method: 'POST', headers: { ...bearer, ...headers }, body: '{}' }, bindings)).status).toBe(403);
  expect((await app.request(`${origin}/api/admin/resources`, { headers: { ...headers, Authorization: 'Bearer invalid' } }, bindings)).status).toBe(401);
  const access = await app.request(`${origin}/api/admin/access`, { headers: bearer }, bindings); expect(await access.json()).toEqual({ permissions: ['resources:read'] });
  const row = await bindings.DB.prepare('SELECT last_used_at FROM api_keys WHERE id=?').bind(created.key.id).first(); expect(row!.last_used_at).toBeTruthy();
});
it('supports scoped writes with a token audit actor and blocks revoked, expired, owner-invalid and downgraded keys', async () => {
  const f = await fixture(); const created = await f.issue(['resources:create']); const bearer = { Authorization: `Bearer ${created.token}`, 'Content-Type': 'application/json' };
  const response = await f.app.request(`${origin}/api/admin/resources`, { method: 'POST', headers: bearer, body: JSON.stringify({ name: 'Key-created resource', kind: '配置', status: 'enabled', address: '', description: '' }) }, bindings); expect(response.status).toBe(201);
  expect(await bindings.DB.prepare('SELECT actor FROM audit_events WHERE target=?').bind('Key-created resource').first()).toEqual({ actor: `token:${created.key.id}` });
  const downgraded = createDashboard({ resolvePermissions: () => [] });
  expect((await downgraded.request(`${origin}/api/admin/resources`, { method: 'POST', headers: bearer, body: '{}' }, bindings)).status).toBe(403);
  const revoked = await f.app.request(`${origin}/api/admin/api-keys/${created.key.id}`, { method: 'DELETE', headers: f.headers }, bindings); expect(revoked.status).toBe(204);
  expect((await f.app.request(`${origin}/api/admin/resources`, { headers: bearer }, bindings)).status).toBe(401);
  const expired = await f.issue(); await bindings.DB.prepare("UPDATE api_keys SET expires_at = '2000-01-01T00:00:00Z' WHERE id=?").bind(expired.key.id).run();
  expect((await f.app.request(`${origin}/api/admin/resources`, { headers: { Authorization: `Bearer ${expired.token}` } }, bindings)).status).toBe(401);
  const owner = await f.issue(); await bindings.DB.prepare("UPDATE api_keys SET owner = 'other' WHERE id=?").bind(owner.key.id).run();
  expect((await f.app.request(`${origin}/api/admin/resources`, { headers: { Authorization: `Bearer ${owner.token}` } }, bindings)).status).toBe(401);
});
it('requires management grants and same-origin Cookie requests and refuses privilege escalation or invalid inputs', async () => {
  const f = await fixture(['api:read', 'api:tokens', 'api:issue', 'resources:read']);
  for (const permissions of [['resources:create'], ['api:issue'], ['*'], []]) {
    const response = await f.app.request(`${origin}/api/admin/api-keys`, { method: 'POST', headers: f.headers, body: JSON.stringify({ name: 'Invalid', expiresInDays: 7, permissions }) }, bindings); expect(response.status).toBe(422);
  }
  expect((await f.app.request(`${origin}/api/admin/api-keys`, { method: 'POST', headers: { Cookie: f.headers.Cookie, 'Content-Type': 'application/json' }, body: '{}' }, bindings)).status).toBe(403);
  const noGrants = await fixture(['api:read']); expect((await noGrants.app.request(`${origin}/api/admin/api-keys`, { headers: noGrants.headers }, bindings)).status).toBe(403);
});
it('enforces independent API key rate limits and fails closed without a configured limiter', async () => {
  const f = await fixture(); const created = await f.issue(); const headers = { Authorization: `Bearer ${created.token}` };
  const limited = { ...bindings, API_KEY_RATE_LIMITER: { limit: async () => ({ success: false }) } };
  const response = await f.app.request(`${origin}/api/admin/resources`, { headers }, limited); expect(response.status).toBe(429); expect(response.headers.get('Retry-After')).toBe('60');
  expect((await f.app.request(`${origin}/api/admin/resources`, { headers }, { ...bindings, API_KEY_RATE_LIMITER: undefined! })).status).toBe(503);
});
it('validates key expiry bounds and preserves module disablement on every token request', async () => {
  const service = createApiKeys({ store: d1ApiKeyStore(bindings.DB) });
  for (const expiresInDays of [0, 366, NaN, 1.5]) await expect(service.issue({ owner: 'admin', name: 'test', permissions: ['resources:read'], expiresInDays }, ['resources:read'])).rejects.toMatchObject({ status: 422 });
  const f = await fixture(); const created = await f.issue();
  const modules = dashboardModules.map((module) => module.id === 'resources' ? { ...module, enabled: false } : module);
  const app = createDashboard({ modules, resolvePermissions: () => listModulePermissions(dashboardModules) });
  expect((await app.request(`${origin}/api/admin/resources`, { headers: { Authorization: `Bearer ${created.token}` } }, bindings)).status).toBe(403);
});
it('enforces HTTPS for bearer credentials and rejects oversized resource payloads before parsing', async () => {
  const f = await fixture(); const created = await f.issue(['resources:create', 'resources:batch']); const headers = { Authorization: `Bearer ${created.token}`, 'Content-Type': 'application/json' };
  expect((await f.app.request('http://api.example/api/admin/resources', { headers }, bindings)).status).toBe(503);
  for (const path of ['/api/admin/resources', '/api/admin/resources/batch']) expect((await f.app.request(`${origin}${path}`, { method: 'POST', headers, body: JSON.stringify({ data: 'x'.repeat(17000) }) }, bindings)).status).toBe(413);
});
it('enforces application settings constraints before writing and preserves the previous value on validation failure', async () => {
  const f = await fixture();
  const previous = await bindings.SETTINGS.get('workerkit:settings');
  for (const values of [{ siteName: ' ' }, { pageSize: 0 }, { pageSize: 19 }, { description: 'x'.repeat(201) }, { contactEmail: 'invalid' }]) {
    const response = await f.app.request(`${origin}/api/admin/settings`, { method: 'PUT', headers: f.headers, body: JSON.stringify({ values }) }, bindings);
    expect(response.status).toBe(422); expect(await response.json()).toMatchObject({ error: { code: 'validation_failed', fields: expect.any(Array) } });
    expect(await bindings.SETTINGS.get('workerkit:settings')).toBe(previous);
  }
});
