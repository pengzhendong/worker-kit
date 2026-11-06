import { describe, expect, it } from 'vitest';
import { createOperationsRoutes } from '../src/server/operations';

function fixture() {
  const forwarded: Request[] = [];
  const identities: string[] = [];
  const app = createOperationsRoutes<{}>({
    backend: 'test',
    principal: c => {
      identities.push(c.req.header('X-Test-User') ?? 'anonymous');
      return c.req.header('X-Test-User') ? { id: '1', name: 'test', permissions: c.req.header('X-Test-User') === 'admin' ? ['tasks:read', 'tasks:manage'] : ['tasks:read'] } : null;
    },
    tasks: () => ({ fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init); forwarded.push(request);
      return Response.json({ definitions: [], plans: [], runs: [] });
    }) as Fetcher['fetch'] }),
    runtime: () => ({ application: { name: 'test', version: '1' }, environment: 'local', checks: [] }),
  });
  return { app, forwarded, identities };
}
describe('CMS-independent operations boundary', () => {
  it('reuses the checked principal only inside one request and rechecks the next identity', async () => {
    const { app, identities, forwarded } = fixture();
    const first = await app.request('https://kit.test/workspace', { headers: { 'X-Test-User': 'admin' } });
    expect((await first.json() as { user: { permissions: string[] } }).user.permissions).toContain('tasks:manage');
    expect(identities).toEqual(['admin']);
    expect((await app.request('https://kit.test/workspace')).status).toBe(401);
    const viewer = await app.request('https://kit.test/workspace', { headers: { 'X-Test-User': 'viewer' } });
    expect((await viewer.json() as { user: { permissions: string[] } }).user.permissions).toEqual(['tasks:read']);
    expect(identities).toEqual(['admin', 'anonymous', 'viewer']);
    expect(forwarded).toHaveLength(2);
  });
  it('rejects anonymous requests before touching task storage', async () => {
    const { app, forwarded } = fixture();
    expect((await app.request('https://kit.test/workspace')).status).toBe(401);
    expect((await app.request('https://kit.test/managed-tasks', { method: 'POST', body: '{}' })).status).toBe(401);
    expect(forwarded).toHaveLength(0);
  });
  it('lets a viewer inspect real state and denies writes server-side', async () => {
    const { app, forwarded } = fixture();
    const response = await app.request('https://kit.test/workspace', { headers: { 'X-Test-User': 'viewer' } });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toMatchObject({ backend: 'test', plans: [], runs: [] });
    expect((await app.request('https://kit.test/managed-tasks/run', { method: 'POST', headers: { 'X-Test-User': 'viewer', Origin: 'https://kit.test' }, body: '{"id":"test"}' })).status).toBe(403);
    expect(forwarded).toHaveLength(1);
  });
  it('enforces origin, byte limit and allowlisted actions even for an administrator', async () => {
    const { app, forwarded } = fixture();
    const send = (suffix: string, origin?: string, body = '{}') => app.request('https://kit.test/managed-tasks' + suffix, { method: 'POST', headers: { 'X-Test-User': 'admin', ...(origin ? { Origin: origin } : {}) }, body });
    expect((await send('/run')).status).toBe(403);
    expect((await send('/run', 'https://other.test')).status).toBe(403);
    expect((await send('/delete-everything', 'https://kit.test')).status).toBe(404);
    expect((await send('/run', 'https://kit.test', 'x'.repeat(9000))).status).toBe(413);
    expect(forwarded).toHaveLength(0);
    expect((await send('/run', 'https://kit.test', '{"id":"plan-1"}')).status).toBe(200);
    expect(new URL(forwarded[0].url).pathname).toBe('/api/managed-tasks/run');
    expect(forwarded[0].headers.get('X-WorkerKit-Backend')).toBe('test');
    expect(forwarded[0].headers.get('X-Test-User')).toBeNull();
    expect(await forwarded[0].text()).toBe('{"id":"plan-1"}');
  });
});
