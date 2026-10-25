import { env, exports as workersExports } from 'cloudflare:workers';
import { beforeAll, expect, it } from 'vitest';
import type { Bindings } from '../examples/dashboard/server';
import { resourceSchema, resourceUpdateSchema, savedSettingsSchema } from '../examples/dashboard/server/schemas';

const origin = 'https://schemas.example';
const bindings = env as unknown as Bindings;
let cookie = '';
let spec: any;
const headers = () => ({ Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' });
const request = (path: string, method = 'GET', body?: unknown) => workersExports.default.fetch(`${origin}/api/admin${path}`, {
  method, headers: headers(), body: body === undefined ? undefined : JSON.stringify(body),
});
const values = (name = 'schema-contract') => ({ name, kind: '配置', status: 'enabled', address: '', description: '' });
beforeAll(async () => {
  const response = await workersExports.default.fetch(`${origin}/api/auth/login`, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': crypto.randomUUID() },
    body: JSON.stringify({ username: bindings.ADMIN_USERNAME, password: bindings.ADMIN_PASSWORD }),
  });
  cookie = response.headers.get('Set-Cookie')!.split(';')[0]!;
  spec = await (await request('/openapi.json')).json();
});

it('enforces documented resource boundaries, including whitespace, optional addresses and case-insensitive HTTP', async () => {
  const schema = spec.paths['/api/admin/resources'].post.requestBody.content['application/json'].schema;
  expect(schema.properties.name).toMatchObject({ minLength: 1, maxLength: 80 });
  expect((await request('/resources', 'POST', schema.examples[0])).status).toBe(201);
  const pattern = new RegExp(schema.properties.address.pattern);
  for (const [address, valid] of [['', true], ['HTTPS://example.com', true], ['ftp://example.com', false], ['\n', false]] as const) {
    expect(pattern.test(address)).toBe(valid);
    expect((await request('/resources', 'POST', { ...values(), address })).status).toBe(valid ? 201 : 422);
  }
  expect((await request('/resources', 'POST', values('x'.repeat(80)))).status).toBe(201);
  const before = await bindings.DB.prepare('SELECT COUNT(*) AS count FROM resources').first();
  for (const name of ['', '   ', 'x'.repeat(81)]) {
    const response = await request('/resources', 'POST', values(name));
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: { code: 'validation_failed', fields: [{ path: ['name'], message: expect.any(String) }] } });
  }
  expect(await bindings.DB.prepare('SELECT COUNT(*) AS count FROM resources').first()).toEqual(before);
});

it('validates merged settings using the documented fields while retaining partial updates and legacy 400/422 errors', async () => {
  const schema = spec.paths['/api/admin/settings'].put.requestBody.content['application/json'].schema.properties.values;
  expect(schema.additionalProperties).toBe(false);
  expect(schema.required ?? []).toEqual([]);
  expect(schema.properties.pageSize.enum).toEqual([10, 20, 50, 100]);
  const response = await request('/settings', 'PUT', { values: { siteName: 'x'.repeat(40), showWelcome: false } });
  expect(response.status).toBe(200);
  const previous = savedSettingsSchema.parse(await response.json());
  expect(previous.values.showWelcome).toBe(false);
  const stored = await bindings.SETTINGS.get('workerkit:settings');
  for (const [values, status] of [[{ siteName: 'x'.repeat(41) }, 422], [{ contactEmail: '\n' }, 422], [{ pageSize: 19 }, 422], [{ showWelcome: 'true' }, 400], [{ undeclared: true }, 400]] as const) {
    expect((await request('/settings', 'PUT', { values })).status).toBe(status);
    expect(await bindings.SETTINGS.get('workerkit:settings')).toBe(stored);
  }
  expect(savedSettingsSchema.parse(await (await request('/settings', 'PUT', { values: {} })).json()).values).toEqual(previous.values);
});

it('preserves authentication order, malformed JSON and root object failure contracts', async () => {
  const raw = (body: string, requestHeaders = headers()) => workersExports.default.fetch(`${origin}/api/admin/resources`, { method: 'POST', headers: requestHeaders, body });
  expect((await raw('{', { ...headers(), Cookie: '' })).status).toBe(401);
  expect((await raw('{', { ...headers(), Origin: 'https://foreign.example' })).status).toBe(403);
  for (const [body, code] of [['{', 'invalid_json'], ['null', 'invalid_resource'], ['[]', 'invalid_resource']]) {
    const response = await raw(body!); expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code } });
  }
  const invalid = await request('/resources', 'POST', { ...values(''), address: 'ftp://example.com' });
  expect(await invalid.json()).toMatchObject({ error: { fields: [{ path: ['name'], message: expect.any(String) }, { path: ['address'], message: expect.any(String) }] } });
});

it('rejects documented batch, confirmation and API key boundary violations without recording writes', async () => {
  expect(spec.paths['/api/admin/resources/batch'].post.requestBody.content['application/json'].schema.properties.ids).toMatchObject({ minItems: 1, maxItems: 100 });
  expect(spec.paths['/api/admin/api-keys'].post.requestBody.content['application/json'].schema.properties.expiresInDays).toMatchObject({ minimum: 1, maximum: 365 });
  expect(spec.paths['/api/admin/audit/prune'].post.requestBody.content['application/json'].schema.properties.confirmation.const).toBe('delete-expired-audit-events');
  const before = await bindings.DB.prepare('SELECT COUNT(*) AS count FROM audit_events').first();
  for (const body of [null, { ids: [], status: 'enabled' }, { ids: [' '], status: 'enabled' }, { ids: Array(101).fill('id'), status: 'enabled' }]) {
    expect((await request('/resources/batch', 'POST', body)).status).toBe(400);
  }
  expect((await request('/audit/prune', 'POST', { confirmation: 'yes' })).status).toBe(400);
  for (const expiresInDays of [0, 366, 1.5, '7']) {
    expect((await request('/api-keys', 'POST', { name: 'script', permissions: ['resources:read'], expiresInDays })).status).toBe(422);
  }
  expect(await bindings.DB.prepare('SELECT COUNT(*) AS count FROM audit_events').first()).toEqual(before);
});

it('serializes real create, update, list and export results conforming to the documented resource schemas', async () => {
  const created = await request('/resources', 'POST', values('  schema-output  '));
  const resource = resourceSchema.parse(await created.json());
  expect(resource.name).toBe('schema-output');
  const updated = await request(`/resources/${resource.id}`, 'PUT', values('schema-updated'));
  expect(resourceUpdateSchema.parse(await updated.json()).name).toBe('schema-updated');
  const list = await (await request('/resources?q=schema-updated')).json() as { items: unknown[] };
  expect(list.items).toHaveLength(1); resourceSchema.parse(list.items[0]);
  const exported = await request('/resources/export?q=schema-updated');
  expect(exported.headers.get('Content-Disposition')).toContain('resources.json');
  const items = await exported.json() as unknown[];
  expect(items).toHaveLength(1); resourceSchema.parse(items[0]);
});
