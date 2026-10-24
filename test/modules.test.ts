import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { canAccessModule, canPerform, defineModules, getModuleNavigation, listModulePermissions, resolveModule } from '../src/modules';
import { createAdminAuth, createModuleAccess, createServer } from '../src/server';
import type { AdminBindings } from '../src/server';
import { createDashboard } from '../examples/dashboard/server';
import type { Bindings } from '../examples/dashboard/server';
import { dashboardModules } from '../examples/dashboard/modules';

const modules = defineModules([
  { id: 'files', label: '文件', path: '/files', actions: { read: '查看', upload: '上传' }, access: 'read', navigation: { placement: 'sidebar', order: 20 } },
  { id: 'account', label: '账户', path: '/account', actions: {}, navigation: { placement: 'user', order: 10 } },
  { id: 'hidden', label: '详情', path: '/details', actions: { read: '查看' }, access: 'read' },
  { id: 'off', label: '停用', path: '/off', actions: { read: '查看' }, access: 'read', enabled: false, navigation: { placement: 'sidebar', order: 5 } },
  { id: 'dev', label: '调试', path: '/dev', actions: {}, developmentOnly: true, navigation: { placement: 'sidebar', order: 10 } },
] as const);
const readOnly = { authenticated: true, permissions: ['files:read', 'off:read', 'hidden:read'] };

describe('module declarations and presentation access', () => {
  it('rejects conflicting IDs, paths and undeclared page actions at composition', () => {
    expect(() => defineModules([modules[0], modules[0]])).toThrow('Duplicate');
    expect(() => defineModules([modules[0], { ...modules[0], id: 'different' }])).toThrow('Duplicate');
    for (const change of [{ id: 'bad:id' }, { path: '/files?admin=true' as const }, { access: 'missing' }, { actions: { '*': '全部' } }, { navigation: { placement: 'sidebar' as const, order: NaN } }]) {
      expect(() => defineModules([{ ...modules[0], ...change }])).toThrow();
    }
  });
  it('copies and freezes config without mutating caller-owned arrays', () => {
    const actions = { read: '查看' }; const input = [{ id: 'example', label: '示例', path: '/example' as const, actions }];
    const result = defineModules(input); actions.read = 'changed'; input.push({ ...input[0]!, id: 'another' });
    expect(result).toHaveLength(1); expect(result[0]!.actions.read).toBe('查看');
    expect(Object.isFrozen(result)).toBe(true); expect(Object.isFrozen(result[0]!.actions)).toBe(true);
  });
  it('uses exact explicit grants and denies unknown, disabled and production-only access', () => {
    expect(canPerform(modules, 'files:read', readOnly)).toBe(true);
    for (const permission of ['files:upload', 'files:delete', 'off:read', '*', 'files:*']) expect(canPerform(modules, permission, { ...readOnly, permissions: [...readOnly.permissions, '*', 'files:*'] })).toBe(false);
    expect(canPerform(modules, 'files:read', { ...readOnly, authenticated: false })).toBe(false);
    expect(canAccessModule(modules[1], { authenticated: false, permissions: [] })).toBe(false);
    expect(canAccessModule(modules[1], { authenticated: true, permissions: [] })).toBe(true);
    expect(listModulePermissions(modules)).toEqual(['files:read', 'files:upload', 'hidden:read']);
  });
  it('derives ordered menus and exact routes independently of menu visibility', () => {
    expect(getModuleNavigation(modules, 'sidebar', readOnly).map((module) => module.id)).toEqual(['files']);
    expect(getModuleNavigation(modules, 'sidebar', { ...readOnly, development: true }).map((module) => module.id)).toEqual(['dev', 'files']);
    expect(getModuleNavigation(modules, 'user', readOnly).map((module) => module.id)).toEqual(['account']);
    expect(getModuleNavigation(modules, 'sidebar', { ...readOnly, authenticated: false })).toEqual([]);
    expect(resolveModule(modules, '/details')?.id).toBe('hidden');
    for (const path of ['/off', '/dev', '/files/unknown', '/unknown']) expect(resolveModule(modules, path)).toBeUndefined();
    expect(resolveModule(modules, '/dev', { development: true })?.id).toBe('dev');
  });
});

const bindings = env as unknown as Bindings;
const origin = 'https://module-tests.example';
async function login(app: ReturnType<typeof createDashboard>) {
  const response = await app.request(`${origin}/api/auth/login`, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': crypto.randomUUID() },
    body: JSON.stringify({ username: bindings.ADMIN_USERNAME, password: bindings.ADMIN_PASSWORD }),
  }, bindings);
  expect(response.status).toBe(200);
  return response.headers.get('Set-Cookie')!.split(';')[0]!;
}
const request = (app: ReturnType<typeof createDashboard>, cookie: string, path: string, method = 'GET', body?: unknown) => app.request(`${origin}/api/admin${path}`, {
  method, headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json', 'X-Permissions': '*' }, body: body === undefined ? undefined : JSON.stringify(body),
}, bindings);

describe('module authorization in workerd', () => {
  it('denies unauthenticated and missing grants, rejects invalid configuration and unknown guards', async () => {
    const app = createServer<AdminBindings>({ log: () => {} });
    const auth = createAdminAuth<AdminBindings>(); app.route('/auth', auth.routes);
    let grants: readonly string[] | null = null;
    const access = createModuleAccess<AdminBindings>({ modules, resolvePermissions: () => grants });
    expect(() => access.require('files:missing')).toThrow('Undeclared');
    app.get('/files', access.require('files:read'), (c) => c.json({ ok: true }));
    expect((await app.request('/files', {}, bindings)).status).toBe(401);
    grants = []; expect((await app.request('/files', {}, bindings)).status).toBe(403);
    grants = ['*', 'files:*']; expect((await app.request('/files', {}, bindings)).status).toBe(403);
    grants = undefined as unknown as null; expect((await app.request('/files', {}, bindings)).status).toBe(503);
    grants = ['files:read']; expect((await app.request('/files', {}, bindings)).status).toBe(200);
  });
  it('protects actual business writes, exports and downloads for a read-only administrator', async () => {
    const grants = ['resources:read', 'files:read', 'settings:read'];
    const app = createDashboard({ resolvePermissions: () => grants }); const cookie = await login(app);
    expect((await request(app, '', '/access')).status).toBe(401);
    expect(await (await request(app, cookie, '/access')).json()).toEqual({ permissions: grants });
    for (const path of ['/resources', '/files', '/settings']) expect((await request(app, cookie, path)).status).toBe(200);
    const before = {
      rows: await bindings.DB.prepare('SELECT COUNT(*) AS n FROM resources').first(),
      settings: await bindings.SETTINGS.get('workerkit:settings'), files: (await bindings.FILES.list()).objects.length,
    };
    for (const [path, method, body] of [
      ['/resources', 'POST', { name: 'denied' }], ['/resources/missing', 'PUT', {}], ['/resources/missing', 'DELETE', undefined],
      ['/resources/batch', 'POST', { ids: ['missing'], status: 'disabled' }], ['/resources/export', 'GET', undefined],
      ['/settings', 'PUT', { values: { siteName: 'denied' } }], ['/files', 'POST', {}], ['/files?key=uploads/missing', 'DELETE', undefined],
      ['/files/download?key=uploads/missing', 'GET', undefined], ['/audit', 'GET', undefined],
    ] as const) {
      const response = await request(app, cookie, path, method, body);
      expect(response.status, `${method} ${path}`).toBe(403);
      expect(await response.json()).toMatchObject({ error: { code: 'forbidden' } });
    }
    expect(await bindings.DB.prepare('SELECT COUNT(*) AS n FROM resources').first()).toEqual(before.rows);
    expect(await bindings.SETTINGS.get('workerkit:settings')).toBe(before.settings);
    expect((await bindings.FILES.list()).objects).toHaveLength(before.files);
  });
  it('removes disabled module grants and denies its actual API even when the policy grants it', async () => {
    const app = createDashboard({ modules: dashboardModules.map((module) => module.id === 'files' ? { ...module, enabled: false } : module), resolvePermissions: () => ['files:read', 'files:upload', 'resources:read', 'unknown:read'] });
    const cookie = await login(app);
    expect(await (await request(app, cookie, '/access')).json()).toEqual({ permissions: ['resources:read'] });
    expect((await request(app, cookie, '/files')).status).toBe(403);
    expect((await request(app, cookie, '/files', 'POST', {})).status).toBe(403);
    expect((await request(app, cookie, '/resources')).status).toBe(200);
  });
  it('does not expose ungranted resource, file or audit data through the overview', async () => {
    const app = createDashboard({ resolvePermissions: () => ['overview:read'] }); const cookie = await login(app);
    const response = await request(app, cookie, '/overview'); expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ total: null, enabled: null, files: null, bytes: null, recent: [], activity: [], bindings: [] });
  });
});
