import { ApiError } from '@pengzhendong/worker-kit/server';

/** Example-owned table/policy. Disabled unless the application explicitly configures retention. */
export function auditRetention(rawDays?: string, now = Date.now()) {
  if (rawDays === undefined || rawDays === '0') return { enabled: false as const, days: null, before: null };
  const days = Number(rawDays);
  if (!/^\d+$/.test(rawDays) || !Number.isSafeInteger(days) || days < 7 || days > 3650) throw new ApiError(503, 'retention_unconfigured', '操作日志保留配置无效');
  return { enabled: true as const, days, before: new Date(now - days * 86_400_000).toISOString() };
}
export async function inspectAuditRetention(db: D1Database, rawDays?: string, now = Date.now()) {
  const policy = auditRetention(rawDays, now);
  const row = policy.enabled ? await db.prepare('SELECT COUNT(*) AS count FROM audit_events WHERE created_at < ?').bind(policy.before).first<{ count: number }>() : null;
  return { ...policy, eligible: row?.count ?? 0, batchLimit: 1000 };
}
export async function pruneAuditEvents(db: D1Database, rawDays: string | undefined, actor: string, now = Date.now()) {
  const policy = auditRetention(rawDays, now);
  if (!policy.enabled) throw new ApiError(409, 'retention_disabled', '尚未启用操作日志保留策略');
  const [result] = await db.batch([
    db.prepare('DELETE FROM audit_events WHERE id IN (SELECT id FROM audit_events WHERE created_at < ? ORDER BY created_at, id LIMIT 1000) RETURNING id').bind(policy.before),
    db.prepare('INSERT INTO audit_events(id, actor, action, target, created_at) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), actor, 'audit.prune', `before ${policy.before} · limit 1000`, new Date(now).toISOString()),
  ]);
  return { deleted: result!.results.length, before: policy.before, batchLimit: 1000 };
}
