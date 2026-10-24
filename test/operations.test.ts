import { env } from 'cloudflare:workers';
import { expect, it } from 'vitest';
import { createServer, runHealthChecks } from '../src/server';
import { createDashboard } from '../examples/dashboard/server';
import type { Bindings } from '../examples/dashboard/server';
import { auditRetention, inspectAuditRetention, pruneAuditEvents } from '../examples/dashboard/server/audit-retention';

it('bounds parallel health checks and never includes values or error details', async () => {
  const result = await runHealthChecks([
    { name: 'ok', check: async () => ({ secret: 'private' }) },
    { name: 'error', check: async () => { throw new Error('private password'); } },
    { name: 'timeout', check: () => new Promise(() => {}) },
  ], { timeoutMs: 5 });
  expect(result.ok).toBe(false); expect(result.checks.map((item) => item.status)).toEqual(['ok', 'error', 'timeout']);
  expect(JSON.stringify(result)).not.toContain('private');
  await expect(runHealthChecks([], { timeoutMs: 0 })).rejects.toThrow('configuration');
});

const bindings = env as unknown as Bindings;
it('does not turn a successful response into a failure when a synchronous log sink throws', async () => {
  const app = createServer({ log: () => { throw new Error('private exporter credentials'); } });
  app.get('/ok', (c) => c.json({ ok: true }));
  const response = await app.request('/ok'); expect(response.status).toBe(200); expect(await response.json()).toEqual({ ok: true });
});
const origin = 'https://operations.example';
async function authenticated(grants?: string[]) {
  const app = createDashboard(grants ? { resolvePermissions: () => grants } : {});
  const login = await app.request(`${origin}/api/auth/login`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': crypto.randomUUID() }, body: JSON.stringify({ username: bindings.ADMIN_USERNAME, password: bindings.ADMIN_PASSWORD }) }, bindings);
  return { app, headers: { Cookie: login.headers.get('Set-Cookie')!.split(';')[0]!, Origin: origin, 'Content-Type': 'application/json' } };
}
it('keeps liveness public and independently protects diagnostics and retention cleanup', async () => {
  const { app, headers } = await authenticated(['overview:read', 'audit:read']);
  expect((await app.request('/health', {}, bindings)).headers.get('Cache-Control')).toBe('no-store');
  expect((await app.request('/api/admin/diagnostics', {}, bindings)).status).toBe(401);
  expect((await app.request(`${origin}/api/admin/diagnostics`, { headers }, bindings)).status).toBe(403);
  expect((await app.request(`${origin}/api/admin/audit/prune`, { method: 'POST', headers, body: JSON.stringify({ confirmation: 'delete-expired-audit-events' }) }, bindings)).status).toBe(403);
  expect(await (await app.request(`${origin}/api/admin/audit/retention`, { headers }, bindings)).json()).toMatchObject({ enabled: false, eligible: 0 });
  const full = await authenticated();
  expect(await (await full.app.request(`${origin}/api/admin/diagnostics`, { headers: full.headers }, bindings)).json()).toMatchObject({ ok: true, checks: [{ name: 'D1', status: 'ok' }, { name: 'KV', status: 'ok' }, { name: 'R2', status: 'ok' }] });
  expect((await full.app.request(`${origin}/api/admin/audit/prune`, { method: 'POST', headers: full.headers, body: '{}' }, bindings)).status).toBe(400);
  expect((await full.app.request(`${origin}/api/admin/audit/prune`, { method: 'POST', headers: full.headers, body: JSON.stringify({ confirmation: 'delete-expired-audit-events' }) }, bindings)).status).toBe(409);
});
it('requires an explicit retention policy and prunes bounded batches while preserving recent records and an audit of cleanup', async () => {
  expect(auditRetention()).toMatchObject({ enabled: false }); expect(auditRetention('0')).toMatchObject({ enabled: false });
  for (const value of ['NaN', '-1', '1', '3651']) expect(() => auditRetention(value)).toThrow();
  await bindings.DB.prepare("WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x < 1001) INSERT INTO audit_events SELECT 'retention-old-' || x, 'admin', 'test.old', 'old', '2020-01-01T00:00:00.000Z' FROM n").run();
  const now = Date.parse('2026-10-24T12:00:00Z');
  await bindings.DB.prepare('INSERT INTO audit_events VALUES (?, ?, ?, ?, ?)').bind('retention-recent', 'admin', 'test.recent', 'keep', new Date(now).toISOString()).run();
  expect(await inspectAuditRetention(bindings.DB, '7', now)).toMatchObject({ eligible: 1001 });
  expect(await pruneAuditEvents(bindings.DB, '7', 'test-admin', now)).toMatchObject({ deleted: 1000 });
  expect(await inspectAuditRetention(bindings.DB, '7', now)).toMatchObject({ eligible: 1 });
  expect(await pruneAuditEvents(bindings.DB, '7', 'test-admin', now)).toMatchObject({ deleted: 1 });
  expect(await bindings.DB.prepare("SELECT id FROM audit_events WHERE id = 'retention-recent'").first()).not.toBeNull();
  expect(await bindings.DB.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE action = 'audit.prune' AND actor = 'test-admin'").first()).toEqual({ n: 2 });
});
