import { bodyLimit } from 'hono/body-limit';
import type { Context } from 'hono';
import { ApiError, createAdminAuth, createFileRoutes, createServer, createSettingsRoutes, readPageQuery } from '@pengzhendong/worker-kit/server';
import type { BatchResult, FieldIssue, PageList } from '@pengzhendong/worker-kit/contracts';
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
const resourceSort = { name: 'name COLLATE NOCASE', status: 'status', updated_at: 'updated_at' } as const;
function resourceQuery(c: C) {
  const query = readPageQuery(new URL(c.req.url).searchParams, {
    sortFields: ['name', 'status', 'updated_at'] as const,
    filterFields: ['status', 'kind'] as const,
    defaultSort: { field: 'updated_at', order: 'desc' },
  });
  const { q, filters: { status, kind } } = query;
  if (status && !['enabled', 'disabled'].includes(status)) throw new ApiError(400, 'invalid_query', '资源状态无效');
  if (kind && !['订阅源', '存储', '任务', '配置'].includes(kind)) throw new ApiError(400, 'invalid_query', '资源类型无效');
  const clauses: string[] = []; const args: string[] = [];
  if (q) { clauses.push('(name LIKE ? OR description LIKE ? OR address LIKE ?)'); args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (status) { clauses.push('status = ?'); args.push(status); }
  if (kind) { clauses.push('kind = ?'); args.push(kind); }
  // Only values from this closed map enter SQL. All user values use bindings.
  const orderBy = `${resourceSort[query.sort!.field]} ${query.sort!.order === 'asc' ? 'ASC' : 'DESC'}, id ASC`;
  return { ...query, where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', args, orderBy };
}
app.get('/api/admin/resources', async (c) => {
  const { where, args, page, pageSize, offset, orderBy } = resourceQuery(c);
  const [count, rows] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) AS total FROM resources ${where}`).bind(...args).first<{ total: number }>(),
    c.env.DB.prepare(`SELECT * FROM resources ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).bind(...args, pageSize, offset).all<Resource>(),
  ]);
  return c.json({ items: rows.results, total: count?.total ?? 0, page, pageSize } satisfies PageList<Resource>);
});
app.get('/api/admin/resources/export', async (c) => {
  const { where, args, orderBy } = resourceQuery(c);
  const rows = await c.env.DB.prepare(`SELECT * FROM resources ${where} ORDER BY ${orderBy} LIMIT 10000`).bind(...args).all<Resource>();
  return new Response(JSON.stringify(rows.results, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="resources.json"', 'Cache-Control': 'no-store' } });
});
async function resourceInput(c: C) {
  let input: unknown;
  try { input = await c.req.json(); } catch { throw new ApiError(400, 'invalid_json', '请求 JSON 无效'); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ApiError(400, 'invalid_resource', '请填写资源信息');
  const body = input as Record<string, unknown>;
  const fields: FieldIssue[] = [];
  if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 80) fields.push({ path: ['name'], message: '名称不能为空，且不能超过 80 个字符' });
  if (typeof body.kind !== 'string' || !['订阅源', '存储', '任务', '配置'].includes(body.kind)) fields.push({ path: ['kind'], message: '请选择有效的资源类型' });
  if (typeof body.status !== 'string' || !['enabled', 'disabled'].includes(body.status)) fields.push({ path: ['status'], message: '请选择有效的资源状态' });
  if (typeof body.address !== 'string' || body.address.length > 2000) fields.push({ path: ['address'], message: '地址必须是文本，且不能超过 2000 个字符' });
  else if (body.address && !/^https?:\/\//i.test(body.address)) fields.push({ path: ['address'], message: '地址必须以 http:// 或 https:// 开头' });
  if (typeof body.description !== 'string' || body.description.length > 1000) fields.push({ path: ['description'], message: '描述必须是文本，且不能超过 1000 个字符' });
  if (fields.length) throw new ApiError(422, 'validation_failed', '请检查表单内容', fields);
  return { name: (body.name as string).trim(), kind: String(body.kind), status: String(body.status), address: body.address as string, description: body.description as string };
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
  if (!body || !Array.isArray(body.ids) || !body.ids.length || body.ids.length > 100 || body.ids.some((id) => typeof id !== 'string' || !id.trim() || id.length > 100) || !['enabled', 'disabled'].includes(String(body.status))) {
    throw new ApiError(400, 'invalid_batch', '请选择 1–100 条资源和有效状态');
  }
  const ids = [...new Set(body.ids as string[])]; const placeholders = ids.map(() => '?').join(',');
  const result = await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE resources SET status=?, updated_at=? WHERE id IN (${placeholders}) RETURNING id`).bind(body.status, new Date().toISOString(), ...ids), auditStatement(c, 'resource.batch', `${String(body.status)} · 请求 ${ids.length} 项`),
  ]);
  const changed = new Set((result[0]?.results as { id: string }[]).map((row) => row.id));
  const succeeded = ids.filter((id) => changed.has(id));
  const failed = ids.filter((id) => !changed.has(id)).map((id) => ({ id, code: 'resource_not_found', message: '资源不存在或已被删除' }));
  return c.json({ succeeded, failed, updated: succeeded.length } satisfies BatchResult & { updated: number });
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
