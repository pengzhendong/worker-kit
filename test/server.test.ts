import { env, exports as workersExports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { ApiError, createAdminAuth, createServer } from '../src/server';
import type { AdminBindings, RequestLog } from '../src/server';

const bindings = env as unknown as AdminBindings;
const origin = 'https://example.com';
function loginRequest(password = bindings.ADMIN_PASSWORD, ip = crypto.randomUUID()) {
  return new Request(`${origin}/api/auth/login`, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
    body: JSON.stringify({ username: 'admin', password }),
  });
}
async function login() {
  const response = await workersExports.default.fetch(loginRequest());
  expect(response.status).toBe(200);
  return response.headers.get('Set-Cookie')!.split(';')[0]!;
}

describe('browser authentication in workerd', () => {
  it('leaves health public and protects business routes', async () => {
    expect((await workersExports.default.fetch(`${origin}/health`)).status).toBe(200);
    const response = await workersExports.default.fetch(`${origin}/api/admin/overview`);
    expect(response.status).toBe(401);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Request-Id')).toBeTruthy();
    expect(await response.json()).toMatchObject({ error: { code: 'unauthorized' } });
  });

  it('signs a secure cookie and grants access to the application', async () => {
    const response = await workersExports.default.fetch(loginRequest());
    expect(response.status).toBe(200);
    const cookie = response.headers.get('Set-Cookie')!;
    for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/', 'Max-Age=43200']) expect(cookie).toContain(attribute);
    expect(decodeURIComponent(cookie)).not.toContain(bindings.ADMIN_PASSWORD);
    const protectedResponse = await workersExports.default.fetch(`${origin}/api/admin/overview`, { headers: { Cookie: cookie.split(';')[0]! } });
    expect(protectedResponse.status).toBe(200);
    expect(await protectedResponse.json()).toMatchObject({ user: 'admin', runtime: 'Cloudflare Workers' });
  });

  it('rejects wrong credentials, missing origins and foreign origins', async () => {
    expect((await workersExports.default.fetch(loginRequest('incorrect-password'))).status).toBe(401);
    for (const testOrigin of [null, 'https://evil.example']) {
      const request = loginRequest();
      if (testOrigin) request.headers.set('Origin', testOrigin); else request.headers.delete('Origin');
      expect((await workersExports.default.fetch(request)).status).toBe(403);
    }
  });

  it('rejects tampered cookies and cross-origin authenticated mutations', async () => {
    const cookie = await login();
    expect((await workersExports.default.fetch(`${origin}/api/auth/session`, { headers: { Cookie: `${cookie}tampered` } })).status).toBe(401);
    expect((await workersExports.default.fetch(`${origin}/api/admin/echo`, { method: 'POST', headers: { Cookie: cookie, Origin: 'https://evil.example' } })).status).toBe(403);
    expect((await workersExports.default.fetch(`${origin}/api/admin/echo`, { method: 'POST', headers: { Cookie: cookie, Origin: origin } })).status).toBe(200);
  });

  it('clears the browser cookie on logout', async () => {
    const cookie = await login();
    const response = await workersExports.default.fetch(`${origin}/api/auth/logout`, { method: 'POST', headers: { Cookie: cookie, Origin: origin } });
    expect(response.status).toBe(204);
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });

  it('enforces the native login rate limiter', async () => {
    const ip = crypto.randomUUID();
    for (let attempt = 0; attempt < 5; attempt++) expect((await workersExports.default.fetch(loginRequest('incorrect-password', ip))).status).toBe(401);
    const response = await workersExports.default.fetch(loginRequest(bindings.ADMIN_PASSWORD, ip));
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
  });

  it('bounds the login body', async () => {
    const request = loginRequest();
    expect((await workersExports.default.fetch(new Request(request, { body: 'x'.repeat(5000) }))).status).toBe(413);
  });
});

describe('session lifetime and configuration', () => {
  function setup() {
    let now = 2_000_000_000_000;
    const app = createServer<AdminBindings>({ log: () => {} });
    const auth = createAdminAuth<AdminBindings>({ now: () => now, sessionSeconds: 60 });
    app.route('/api/auth', auth.routes);
    const testEnv = { ...bindings, ADMIN_LOGIN_RATE_LIMITER: { limit: async () => ({ success: true }) } };
    return { app, testEnv, expire: () => { now += 60_000; } };
  }

  it('rejects expired sessions at the expiration boundary', async () => {
    const { app, testEnv, expire } = setup();
    const response = await app.fetch(loginRequest(), testEnv);
    const cookie = response.headers.get('Set-Cookie')!.split(';')[0]!;
    expect((await app.request(`${origin}/api/auth/session`, { headers: { Cookie: cookie } }, testEnv)).status).toBe(200);
    expire();
    expect((await app.request(`${origin}/api/auth/session`, { headers: { Cookie: cookie } }, testEnv)).status).toBe(401);
  });

  it('invalidates sessions when any configured credential changes', async () => {
    const { app, testEnv } = setup();
    const response = await app.fetch(loginRequest(), testEnv);
    const cookie = response.headers.get('Set-Cookie')!.split(';')[0]!;
    for (const changed of [
      { ADMIN_USERNAME: 'another-admin' }, { ADMIN_PASSWORD: 'another-valid-password' },
      { ADMIN_SESSION_SECRET: 'another-secret-with-at-least-32-characters' },
    ]) expect((await app.request(`${origin}/api/auth/session`, { headers: { Cookie: cookie } }, { ...testEnv, ...changed })).status).toBe(401);
  });

  it('fails closed without required configuration or HTTPS', async () => {
    const { app, testEnv } = setup();
    for (const missing of [
      { ADMIN_PASSWORD: '' }, { ADMIN_SESSION_SECRET: 'short' },
      { ADMIN_LOGIN_RATE_LIMITER: undefined },
    ]) expect((await app.request(`${origin}/api/auth/session`, {}, { ...testEnv, ...missing } as AdminBindings)).status).toBe(503);
    expect((await app.request('http://example.com/api/auth/session', {}, testEnv)).status).toBe(503);
    expect((await app.request('http://localhost/api/auth/session', {}, testEnv)).status).toBe(401);
  });
});

describe('server diagnostics', () => {
  it('normalizes errors without exposing internals or logging query strings', async () => {
    const entries: RequestLog[] = [];
    const app = createServer({ log: (entry) => entries.push(entry) });
    app.get('/failure', () => { throw new Error('private upstream password'); });
    app.get('/invalid', () => { throw new ApiError(422, 'invalid_input', '参数错误'); });
    const response = await app.request(`${origin}/failure?token=private`, { headers: { 'X-Request-Id': 'attacker-controlled' } }, {});
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('private');
    expect(response.headers.get('X-Request-Id')).not.toBe('attacker-controlled');
    expect(entries[0]).toMatchObject({ path: '/failure', status: 500 });
    expect(JSON.stringify(entries)).not.toContain('private');
    const invalid = await app.request(`${origin}/invalid`, {}, {});
    expect(invalid.status).toBe(422);
    expect(await invalid.json()).toMatchObject({ error: { code: 'invalid_input', message: '参数错误' } });
    expect((await app.request(`${origin}/missing`, {}, {})).status).toBe(404);
  });
});
