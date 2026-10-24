import { describe, expect, it } from 'vitest';
import { createApiClient } from '../src/web/api';
import { createSessionScope } from '../src/web/session';

function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
describe('session scoped requests', () => {
  it('aborts old work, clears registered user caches, and rejects late responses even if fetch ignores abort', async () => {
    const scope = createSessionScope(); const cache = new Map([['private', 'old identity']]); scope.registerCleanup(() => cache.clear());
    const response = deferred<Response>(); const started = deferred<AbortSignal>();
    const api = createApiClient({ scope, fetcher: ((_input, init) => { started.resolve(init!.signal!); return response.promise; }) as typeof fetch });
    const pending = api('/private').catch((error: unknown) => error); const signal = await started.promise;
    scope.reset('identity-changed'); expect(signal.aborted).toBe(true); expect(cache.size).toBe(0);
    expect(await pending).toMatchObject({ name: 'AbortError' });
    response.resolve(Response.json({ secret: 'old identity' }));
    const next = createApiClient({ scope, fetcher: (async () => Response.json({ identity: 'new' })) as typeof fetch });
    expect(await next('/private')).toEqual({ identity: 'new' });
  });
  it('expires once for concurrent 401s and never expires a new identity because of an old response', async () => {
    const scope = createSessionScope(); const events: string[] = []; scope.subscribe((event) => events.push(event.reason));
    const api = createApiClient({ scope, fetcher: (async () => Response.json({ error: { code: 'unauthorized' } }, { status: 401 })) as typeof fetch });
    const results = await Promise.all([api('/one').catch((error: unknown) => error), api('/two').catch((error: unknown) => error)]);
    expect(events).toEqual(['expired']); for (const result of results) expect(result).toMatchObject({ name: 'AbortError' });
    const old = deferred<Response>(); const started = deferred<void>();
    const oldApi = createApiClient({ scope, fetcher: (() => { started.resolve(); return old.promise; }) as typeof fetch });
    const pending = oldApi('/old').catch((error: unknown) => error); await started.promise;
    scope.reset('signed-in'); old.resolve(Response.json({}, { status: 401 })); await pending;
    expect(events).toEqual(['expired', 'signed-in']);
  });
  it('keeps identity for 403, 5xx and network errors and does not retry mutations', async () => {
    const scope = createSessionScope(); let calls = 0;
    for (const status of [403, 503]) {
      const api = createApiClient({ scope, fetcher: (async () => { calls++; return Response.json({ error: { code: 'denied', message: 'denied' } }, { status }); }) as typeof fetch });
      await expect(api('/write', { method: 'POST' })).rejects.toMatchObject({ status });
    }
    const offline = createApiClient({ scope, fetcher: (async () => { calls++; throw new TypeError('offline'); }) as typeof fetch });
    await expect(offline('/write', { method: 'POST' })).rejects.toThrow('offline');
    expect(calls).toBe(3); expect(scope.version).toBe(0);
  });
  it('cancels the caller signal during body decoding and never returns stale decoded data', async () => {
    const scope = createSessionScope(); const body = deferred<unknown>(); const decoding = deferred<void>();
    const response = Response.json({}); response.json = () => { decoding.resolve(); return body.promise; };
    const api = createApiClient({ scope, fetcher: (async () => response) as typeof fetch });
    const controller = new AbortController(); const pending = api('/slow', { signal: controller.signal }).catch((error: unknown) => error);
    await decoding.promise; controller.abort(); expect(await pending).toMatchObject({ name: 'AbortError' }); body.resolve({ stale: true });
  });
  it('preserves Retry-After, handles invalid 401 bodies and supports authenticated binary downloads', async () => {
    const limited = createApiClient({ fetcher: (async () => Response.json({ error: { code: 'login_limited' } }, { status: 429, headers: { 'Retry-After': '17' } })) as typeof fetch });
    await expect(limited('/login')).rejects.toMatchObject({ status: 429, retryAfterSeconds: 17 });
    const scope = createSessionScope(); const invalid = createApiClient({ scope, fetcher: (async () => new Response('invalid', { status: 401 })) as typeof fetch });
    await expect(invalid('/protected')).rejects.toMatchObject({ name: 'AbortError' }); expect(scope.version).toBe(1);
    const binary = createApiClient({ scope, fetcher: (async () => new Response('download')) as typeof fetch });
    expect(await (await binary<Blob>('/download', { responseType: 'blob' })).text()).toBe('download');
  });
  it('runs all cleanup callbacks and fails closed when a user cache cannot be cleared', () => {
    const scope = createSessionScope(); let cleared = false; let notified = false;
    scope.registerCleanup(() => { throw new Error('private cache details'); }); scope.registerCleanup(() => { cleared = true; }); scope.subscribe(() => { notified = true; });
    expect(() => scope.reset('signed-in')).toThrow('会话数据清理失败'); expect(cleared).toBe(true); expect(notified).toBe(true);
  });
});
