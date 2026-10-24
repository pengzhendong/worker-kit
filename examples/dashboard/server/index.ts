import { bodyLimit } from 'hono/body-limit';
import type { Context } from 'hono';
import { ApiError, createAdminAuth, createFileRoutes, createServer, createSettingsRoutes } from '@pengzhendong/worker-kit/server';
import type { AdminBindings, WorkerEnv } from '@pengzhendong/worker-kit/server';

export interface Bindings extends AdminBindings { DB: D1Database; SETTINGS: KVNamespace; FILES: R2Bucket }
type C = Context<WorkerEnv<Bindings>>;
type Resource = { id: string; name: string; kind: string; status: 'enabled' | 'disabled'; address: string; description: string; created_at: string; updated_at: string };
const app = createServer<Bindings>();
const auth = createAdminAuth<Bindings>({ allowWeakLocalPassword: true });
app.get('/health', (c) => c.json({ ok: true, service: 'worker-kit-dashboard' }));
app.route('/api/auth', auth.routes);
app.use('/api/admin/*', auth.requireAdmin);

function auditStatement(c: C, action: string, target: string) {
  return c.env.DB.prepare('INSERT INTO audit_events(id, actor, action, target, created_at) VALUES(?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), c.get('adminUser') ?? 'admin', action, target.slice(0, 500), new Date().toISOString());
}
async function recordChange(c: C, event: { action: string; target: string }) {
  // KV/R2 writes cannot share a transaction with D1. Audit failure does not undo a successful write.
  try { await auditStatement(c, event.action, event.target).run(); }
  catch { console.error(JSON.stringify({ event: 'audit_write_failed', action: event.action, requestId: c.get('requestId') })); }
}
app.route('/api/admin/settings', createSettingsRoutes<Bindings>({
  store: (env) => env.SETTINGS,
  defaults: { siteName: 'WorkerKit', description: '你的应用工作台', contactEmail: '', pageSize: 20, showWelcome: true },
  onChange: recordChange,
}));
app.route('/api/admin/files', createFileRoutes<Bindings>({ bucket: (env) => env.FILES, onChange: recordChange }));

app.get('/api/admin/overview', async (c) => {
  const [summary, recent, activity, files, settings] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) AS total, COALESCE(SUM(status = 'enabled'), 0) AS enabled FROM resources").first<{ total: number; enabled: number }>(),
    c.env.DB.prepare('SELECT * FROM resources ORDER BY updated_at DESC, id LIMIT 5').all<Resource>(),
    c.env.DB.prepare('SELECT * FROM audit_events ORDER BY created_at DESC, id LIMIT 7').all(),
    c.env.FILES.list({ prefix: 'uploads/', limit: 1000 }), c.env.SETTINGS.get('workerkit:settings'),
  ]);
  return c.json({ user: c.get('adminUser'), runtime: 'Cloudflare Workers', now: new Date().toISOString(),
    total: summary?.total ?? 0, enabled: summary?.enabled ?? 0,
    files: files.objects.length, filesTruncated: files.truncated, bytes: files.objects.reduce((sum, object) => sum + object.size, 0),
    recent: recent.results, activity: activity.results,
    bindings: [{ name: 'D1 Database', detail: '配置与操作日志', status: 'connected' }, { name: 'R2 Bucket', detail: '私有文件存储', status: 'connected' }, { name: 'Workers KV', detail: settings ? '已保存应用设置' : '使用默认应用设置', status: 'connected' }],
  });
});

const boundedJson = bodyLimit({ maxSize: 16_384, onError: () => { throw new ApiError(413, 'body_too_large', '请求过大'); } });
app.use('/api/admin/resources', boundedJson);
app.use('/api/admin/resources/*', boundedJson);
function filters(c: C) {
  const q = (c.req.query('q') ?? '').trim().slice(0, 100);
  const status = c.req.query('status') ?? ''; const kind = c.req.query('kind') ?? '';
  const clauses: string[] = []; const args: string[] = [];
  if (q) { clauses.push('(name LIKE ? OR description LIKE ? OR address LIKE ?)'); args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (status) { clauses.push('status = ?'); args.push(status); }
  if (kind) { clauses.push('kind = ?'); args.push(kind); }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', args };
}
app.get('/api/admin/resources', async (c) => {
  const { where, args } = filters(c);
  const page = Math.max(1, Math.min(10000, Math.trunc(Number(c.req.query('page')) || 1)));
  const pageSize = Math.max(1, Math.min(100, Math.trunc(Number(c.req.query('pageSize')) || 20)));
  const [count, rows] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) AS total FROM resources ${where}`).bind(...args).first<{ total: number }>(),
    c.env.DB.prepare(`SELECT * FROM resources ${where} ORDER BY updated_at DESC, id LIMIT ? OFFSET ?`).bind(...args, pageSize, (page - 1) * pageSize).all<Resource>(),
  ]);
  return c.json({ items: rows.results, total: count?.total ?? 0, page, pageSize });
});
app.get('/api/admin/resources/export', async (c) => {
  const { where, args } = filters(c);
  const rows = await c.env.DB.prepare(`SELECT * FROM resources ${where} ORDER BY updated_at DESC, id LIMIT 10000`).bind(...args).all<Resource>();
  return new Response(JSON.stringify(rows.results, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="resources.json"', 'Cache-Control': 'no-store' } });
});
async function resourceInput(c: C) {
  let input: unknown;
  try { input = await c.req.json(); } catch { throw new ApiError(400, 'invalid_json', '请求 JSON 无效'); }
  if (!input || typeof input !== 'object') throw new ApiError(400, 'invalid_resource', '请填写资源信息');
  const body = input as Record<string, unknown>;
  if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 80 ||
      !['订阅源', '存储', '任务', '配置'].includes(String(body.kind)) || !['enabled', 'disabled'].includes(String(body.status)) ||
      typeof body.address !== 'string' || body.address.length > 2000 || typeof body.description !== 'string' || body.description.length > 1000) {
    throw new ApiError(400, 'invalid_resource', '请检查名称、类型、状态和内容长度');
  }
  if (body.address && !/^https?:\/\//i.test(body.address)) throw new ApiError(400, 'invalid_address', '地址必须以 http:// 或 https:// 开头');
  return { name: body.name.trim(), kind: String(body.kind), status: String(body.status), address: body.address, description: body.description };
}
app.post('/api/admin/resources', async (c) => {
  const data = await resourceInput(c); const id = crypto.randomUUID(); const now = new Date().toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO resources VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id, data.name, data.kind, data.status, data.address, data.description, now, now), auditStatement(c, 'resource.create', data.name),
  ]);
  return c.json({ id, ...data, created_at: now, updated_at: now }, 201);
});
app.put('/api/admin/resources/:id', async (c) => {
  const id = c.req.param('id');
  if (!await c.env.DB.prepare('SELECT id FROM resources WHERE id=?').bind(id).first()) throw new ApiError(404, 'resource_not_found', '资源不存在');
  const data = await resourceInput(c); const now = new Date().toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE resources SET name=?, kind=?, status=?, address=?, description=?, updated_at=? WHERE id=?').bind(data.name, data.kind, data.status, data.address, data.description, now, id), auditStatement(c, 'resource.update', data.name),
  ]);
  return c.json({ id, ...data, updated_at: now });
});
app.delete('/api/admin/resources/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT name FROM resources WHERE id=?').bind(c.req.param('id')).first<{ name: string }>();
  if (!row) throw new ApiError(404, 'resource_not_found', '资源不存在');
  await c.env.DB.batch([c.env.DB.prepare('DELETE FROM resources WHERE id=?').bind(c.req.param('id')), auditStatement(c, 'resource.delete', row.name)]);
  return c.body(null, 204);
});
app.post('/api/admin/resources/batch', async (c) => {
  let body: { ids?: unknown; status?: unknown };
  try { body = await c.req.json(); } catch { throw new ApiError(400, 'invalid_json', '请求 JSON 无效'); }
  if (!body || !Array.isArray(body.ids) || !body.ids.length || body.ids.length > 100 || body.ids.some((id) => typeof id !== 'string' || id.length > 100) || !['enabled', 'disabled'].includes(String(body.status))) {
    throw new ApiError(400, 'invalid_batch', '请选择 1–100 条资源和有效状态');
  }
  const ids = [...new Set(body.ids as string[])]; const placeholders = ids.map(() => '?').join(',');
  const result = await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE resources SET status=?, updated_at=? WHERE id IN (${placeholders})`).bind(body.status, new Date().toISOString(), ...ids), auditStatement(c, 'resource.batch', `${String(body.status)} · ${ids.length} 项`),
  ]);
  return c.json({ updated: result[0]?.meta.changes ?? 0 });
});
app.get('/api/admin/audit', async (c) => {
  const page = Math.max(1, Math.min(10000, Math.trunc(Number(c.req.query('page')) || 1)));
  const action = (c.req.query('action') ?? '').slice(0, 80); const where = action ? 'WHERE action = ?' : ''; const args = action ? [action] : [];
  const [count, rows] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) AS total FROM audit_events ${where}`).bind(...args).first<{ total: number }>(),
    c.env.DB.prepare(`SELECT * FROM audit_events ${where} ORDER BY created_at DESC, id LIMIT 20 OFFSET ?`).bind(...args, (page - 1) * 20).all(),
  ]);
  return c.json({ items: rows.results, total: count?.total ?? 0, page });
});
app.post('/api/admin/echo', (c) => c.json({ ok: true }));
export default app;
