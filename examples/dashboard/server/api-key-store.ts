import type { ApiKeyRecord, ApiKeyStore } from '@pengzhendong/worker-kit/server';
type Row = { id: string; owner: string; name: string; prefix: string; hash: string; permissions: string; created_at: string; expires_at: string; revoked_at: string | null; last_used_at: string | null };
export function keyFromRow(row: Row): ApiKeyRecord {
  return { id: row.id, owner: row.owner, name: row.name, prefix: row.prefix, hash: row.hash, permissions: JSON.parse(row.permissions), createdAt: row.created_at, expiresAt: row.expires_at, revokedAt: row.revoked_at, lastUsedAt: row.last_used_at };
}
export function d1ApiKeyStore(db: D1Database): ApiKeyStore {
  // Force fresh authorization reads even when the application enables D1 read replication.
  const primary = () => db.withSession('first-primary');
  return {
    async insert(key) {
      await db.batch([
        db.prepare('INSERT INTO api_keys VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)').bind(key.id, key.owner, key.name, key.prefix, key.hash, JSON.stringify(key.permissions), key.createdAt, key.expiresAt),
        db.prepare('INSERT INTO audit_events VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), key.owner, 'api-key.create', key.id, key.createdAt),
      ]);
    },
    async findByHash(hash) { const row = await primary().prepare('SELECT * FROM api_keys WHERE hash = ?').bind(hash).first<Row>(); return row ? keyFromRow(row) : null; },
    async touch(id, at) { await db.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ? AND (last_used_at IS NULL OR last_used_at < ?)').bind(at, id, new Date(Date.parse(at) - 60_000).toISOString()).run(); },
  };
}
export async function listApiKeys(db: D1Database, owner: string, page: number, pageSize: number) {
  const session = db.withSession('first-primary');
  const count = await session.prepare('SELECT COUNT(*) AS total FROM api_keys WHERE owner = ?').bind(owner).first<{ total: number }>();
  const rows = await session.prepare('SELECT * FROM api_keys WHERE owner = ? ORDER BY created_at DESC, id LIMIT ? OFFSET ?').bind(owner, pageSize, (page - 1) * pageSize).all<Row>();
  return { rows: rows.results.map(keyFromRow), total: count?.total ?? 0 };
}
