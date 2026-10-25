import { env } from 'cloudflare:workers';
import { expect, it } from 'vitest';
import { inspectRuntime, readCloudflareMetrics } from '../src/server';
import { createDashboard } from '../examples/dashboard/server';
import type { Bindings } from '../examples/dashboard/server';

const config = { accountId: 'a'.repeat(32), scriptName: 'workerkit-test', apiToken: 'private-analytics-token' };
const analytics = (rows: unknown[], extra = {}) => Response.json({ data: { viewer: { accounts: [{ workersInvocationsAdaptive: rows }] } }, ...extra });
it('projects safe version fields and bounded read-only check results into runtime status', async () => {
  const version = { id: 'version-id', tag: 'release', timestamp: '2026-10-25T00:00:00Z', secret: 'hidden-version-field' };
  const result = await inspectRuntime({ application: { name: 'Example', version: '1.0' }, environment: 'test', version, timeoutMs: 5, checks: [
    { name: 'D1', kind: 'database', description: 'Database', check: async () => ({ secret: 'hidden-result' }) },
    { name: 'Service', kind: 'service', description: 'Upstream', check: async () => { throw new Error('hidden-error'); } },
    { name: 'R2', kind: 'storage', description: 'Files', check: () => new Promise(() => {}) },
  ] });
  expect(result).toMatchObject({ ok: false, environment: 'test', version: { id: 'version-id', tag: 'release', createdAt: '2026-10-25T00:00:00.000Z' }, checks: [{ status: 'ok' }, { status: 'error' }, { status: 'timeout' }] });
  expect(JSON.stringify(result)).not.toContain('hidden');
  const empty = await inspectRuntime({ application: { name: 'No bindings', version: '1' }, environment: 'local', checks: [], version: { timestamp: 'invalid' } });
  expect(empty.checks).toEqual([]); expect(empty.version).toEqual({ id: null, tag: null, createdAt: null });
});
it('does not request analytics when credentials are absent or only partially configured', async () => {
  let calls = 0;
  const fetcher = (async () => { calls++; throw new Error('Should not fetch'); }) as typeof fetch;
  expect(await readCloudflareMetrics({}, { fetcher })).toMatchObject({ status: 'not-configured', requests: null, memoryBytesP50: null });
  expect(await readCloudflareMetrics({ accountId: config.accountId }, { fetcher })).toMatchObject({ status: 'error', requests: null });
  expect(await readCloudflareMetrics({ ...config, scriptName: 'injected\nquery' }, { fetcher })).toMatchObject({ status: 'error' });
  expect(calls).toBe(0);
});
it('queries one fixed Worker/hour and converts API microseconds into milliseconds without averaging quantiles', async () => {
  const fetcher = (async (url: string, init: RequestInit) => {
    expect(url).toBe('https://api.cloudflare.com/client/v4/graphql'); expect(init.redirect).toBe('error');
    expect(new Headers(init.headers).get('Authorization')).toBe(`Bearer ${config.apiToken}`);
    const input = JSON.parse(String(init.body));
    expect(input.variables).toEqual({ account: config.accountId, script: config.scriptName, from: '2026-10-24T23:00:00.000Z', to: '2026-10-25T00:00:00.000Z' });
    expect(input.query).toContain('limit: 1'); expect(input.query).not.toContain('dimensions');
    return analytics([{ sum: { requests: 250, errors: 5 }, quantiles: { cpuTimeP50: 1500, cpuTimeP99: 6000, wallTimeP50: 20000, wallTimeP99: 80000, memoryUsageBytesP50: 10485760, memoryUsageBytesP99: 20971520 } }]);
  }) as typeof fetch;
  const result = await readCloudflareMetrics(config, { fetcher, now: Date.parse('2026-10-25T00:00:00Z') });
  expect(result).toMatchObject({ status: 'ok', requests: 250, errors: 5, cpuMsP50: 1.5, cpuMsP99: 6, wallMsP50: 20, wallMsP99: 80, memoryBytesP50: 10485760 });
  expect(JSON.stringify(result)).not.toContain(config.apiToken); expect(JSON.stringify(result)).not.toContain(config.accountId);
});
it('distinguishes no requests, missing percentile data and provider failures', async () => {
  expect(await readCloudflareMetrics(config, { fetcher: (async () => analytics([])) as typeof fetch })).toMatchObject({ status: 'ok', requests: 0, errors: 0, cpuMsP50: null, memoryBytesP50: null });
  expect(await readCloudflareMetrics(config, { fetcher: (async () => analytics([{ sum: { requests: 1, errors: 0 }, quantiles: {} }])) as typeof fetch })).toMatchObject({ status: 'ok', requests: 1, cpuMsP50: null });
  for (const response of [analytics([], { errors: [{ message: config.apiToken }] }), Response.json({ wrong: true }), analytics([{ sum: { requests: -1, errors: 0 } }]), new Response(config.apiToken, { status: 403 })]) {
    const result = await readCloudflareMetrics(config, { fetcher: (async () => response) as typeof fetch });
    expect(result).toMatchObject({ status: 'error', requests: null, cpuMsP50: null }); expect(JSON.stringify(result)).not.toContain(config.apiToken);
  }
  const oversized = await readCloudflareMetrics(config, { fetcher: (async () => new Response('x'.repeat(70_000))) as typeof fetch });
  expect(oversized.status).toBe('error'); expect(oversized.requests).toBeNull();
  const aborted = await readCloudflareMetrics(config, { fetcher: (async () => { throw new DOMException(config.apiToken, 'AbortError'); }) as typeof fetch });
  expect(aborted.status).toBe('error'); expect(JSON.stringify(aborted)).not.toContain(config.apiToken);
});
it('keeps runtime reports behind browser authentication and the runtime permission', async () => {
  const bindings = env as unknown as Bindings;
  const origin = 'https://runtime.example';
  async function fixture(grants?: string[]) {
    const app = createDashboard(grants ? { resolvePermissions: () => grants } : {});
    const response = await app.request(`${origin}/api/auth/login`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': crypto.randomUUID() }, body: JSON.stringify({ username: bindings.ADMIN_USERNAME, password: bindings.ADMIN_PASSWORD }) }, bindings);
    return { app, headers: { Cookie: response.headers.get('Set-Cookie')!.split(';')[0]! } };
  }
  const limited = await fixture(['overview:read']);
  for (const path of ['/api/admin/runtime', '/api/admin/runtime/metrics']) {
    expect((await limited.app.request(path, {}, bindings)).status).toBe(401);
    expect((await limited.app.request(path, { headers: limited.headers }, bindings)).status).toBe(403);
  }
  const full = await fixture();
  const before = await bindings.DB.prepare('SELECT COUNT(*) AS total FROM resources').first();
  const response = await full.app.request(`${origin}/api/admin/runtime`, { headers: full.headers }, bindings);
  expect(response.status).toBe(200); expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(await response.json()).toMatchObject({ ok: true, runtime: 'Cloudflare Workers', checks: [{ name: 'D1', status: 'ok' }, { name: 'KV', status: 'ok' }, { name: 'R2', status: 'ok' }] });
  expect(await (await full.app.request(`${origin}/api/admin/runtime/metrics`, { headers: full.headers }, bindings)).json()).toMatchObject({ status: 'not-configured', requests: null });
  expect(await bindings.DB.prepare('SELECT COUNT(*) AS total FROM resources').first()).toEqual(before);
});
