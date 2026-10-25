import { describe, expect, it, vi } from 'vitest';
import { createKvAdminAuth } from '../src/server/kv-auth';
const origin = 'https://cookie.test';
function fixture() { const values = new Map<string, string>(); return { values, store: { get: async (key: string) => values.has(key) ? JSON.parse(values.get(key)!) : null, put: async (key: string, value: string) => { values.set(key, value); }, delete: async (key: string) => { values.delete(key); } }, auth: createKvAdminAuth({ cookieName: 'test_session', keyPrefix: 'session:', authScope: 'test', sessionSeconds: 60 }) }; }
describe('native revocable KV sessions', () => {
  it('stores only a token digest and makes logout revoke the server record', async () => {
    const { values, store, auth } = fixture(); const request = new Request(origin);
    const cookie = await auth.createSession(store, 'admin', 'existing-password', request);
    expect(cookie).toContain('HttpOnly; SameSite=Strict'); expect(cookie).toContain('; Secure');
    const token = cookie.split(';')[0]!.split('=')[1]!; expect([...values.keys()][0]).not.toContain(token); expect([...values.values()][0]).not.toContain('existing-password');
    const signed = new Request(origin, { headers: { cookie } }); expect(await auth.isAuthenticated(signed, store, 'admin', 'existing-password')).toBe(true);
    expect(await auth.isAuthenticated(new Request('http://public.test', { headers: { cookie } }), store, 'admin', 'existing-password')).toBe(false);
    expect(await auth.isAuthenticated(signed, store, 'admin', 'changed-password')).toBe(false);
    await auth.deleteSession(signed, store); expect(values.size).toBe(0); expect(await auth.isAuthenticated(signed, store, 'admin', 'existing-password')).toBe(false);
  });
  it('rejects expiry, tampering, missing configuration and credentials mismatch', async () => {
    const { store, auth } = fixture(); const now = Date.now(); vi.useFakeTimers(); vi.setSystemTime(now);
    try { const cookie = await auth.createSession(store, 'admin', 'password', new Request(origin));
      const request = new Request(origin, { headers: { cookie } }); vi.setSystemTime(now + 60_000); expect(await auth.isAuthenticated(request, store, 'admin', 'password')).toBe(false);
      expect(await auth.isAuthenticated(new Request(origin, { headers: { cookie: 'test_session=bogus' } }), store, 'admin', 'password')).toBe(false);
      expect(await auth.verifyCredentials('admin', 'password', '', '')).toBe(false); expect(await auth.verifyCredentials('admin', 'wrong', 'admin', 'password')).toBe(false);
    } finally { vi.useRealTimers(); }
  });
  it('bounds configuration, enforces HTTPS, and validates same origin for mutations', async () => {
    const { auth, store } = fixture(); expect(() => createKvAdminAuth({ cookieName: 'bad;name', keyPrefix: 'session:', authScope: 'x' })).toThrow();
    await expect(auth.createSession(store, 'admin', 'password', new Request('http://public.test'))).rejects.toThrow('HTTPS');
    expect(auth.isSameOrigin(new Request(origin, { headers: { Origin: 'https://evil.test' } }))).toBe(false);
    expect(auth.isSameOrigin(new Request(origin, { headers: { Origin: origin } }))).toBe(true);
  });
});
