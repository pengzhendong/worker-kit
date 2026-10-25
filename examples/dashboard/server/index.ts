import { bodyLimit } from 'hono/body-limit';
import type { Context } from 'hono';
import { ApiError, apiKeyInfo, createApiKeys, createAdminAuth, createModuleAccess, createFileRoutes, createServer, createSettingsRoutes, inspectRuntime, readCloudflareMetrics, readPageQuery, runHealthChecks } from '@pengzhendong/worker-kit/server';
import { openAPIRouteHandler } from '@pengzhendong/worker-kit/openapi';
import type { BatchResult, PageList } from '@pengzhendong/worker-kit/contracts';
import { listModulePermissions } from '@pengzhendong/worker-kit/modules';
import type { ModuleDefinition, ModulePermission } from '@pengzhendong/worker-kit/modules';
import { dashboardModules } from '../modules';
import type { AdminBindings, WorkerEnv } from '@pengzhendong/worker-kit/server';
import { inspectAuditRetention, pruneAuditEvents } from './audit-retention';
import { installApiDescriptions, tokenEndpoint, tokenPermissions } from './api-description';
import { d1ApiKeyStore, listApiKeys } from './api-key-store';
import { validateSettings } from './settings-validation';
import { apiKeyInputSchema, auditPruneSchema, resourceBatchSchema, resourceInputSchema } from './schemas';
import { formIssues, readJson } from './validation';

export interface Bindings extends AdminBindings { DB: D1Database; SETTINGS: KVNamespace; FILES: R2Bucket; API_KEY_RATE_LIMITER: AdminBindings['ADMIN_LOGIN_RATE_LIMITER']; AUDIT_RETENTION_DAYS?: string; CF_VERSION_METADATA?: { id?: string; tag?: string; timestamp?: string }; CLOUDFLARE_METRICS_ACCOUNT_ID?: string; CLOUDFLARE_METRICS_SCRIPT_NAME?: string; CLOUDFLARE_METRICS_API_TOKEN?: string }
type C = Context<WorkerEnv<Bindings>>;
type Resource = { id: string; name: string; kind: string; status: 'enabled' | 'disabled'; address: string; description: string; created_at: string; updated_at: string };
export function createDashboard(options: {
  modules?: readonly ModuleDefinition[];
  resolvePermissions?: (user: string) => readonly string[] | null | Promise<readonly string[] | null>;
} = {}) {
  const modules = options.modules ?? dashboardModules;
  const app = createServer<Bindings>();
  const ownerPermissions = (user: string) => options.resolvePermissions ? options.resolvePermissions(user) : listModulePermissions(modules);
  const access = createModuleAccess<Bindings>({ modules, resolvePermissions: (c) => {
    const key = c.get('apiKey');
    if (key) return key.permissions;
    const user = c.get('adminUser');
    if (!user) return null;
    // The single administrator is explicitly granted active actions by the application policy.
    return ownerPermissions(user);
  } });
  const requirePermission = (permission: ModulePermission<typeof dashboardModules[number]>) => access.require(permission);
  const auth = createAdminAuth<Bindings>({ allowWeakLocalPassword: true });
  installApiDescriptions(app, listModulePermissions(modules));
  app.get('/health', (c) => { c.header('Cache-Control', 'no-store'); return c.json({ ok: true, service: 'worker-kit-dashboard' }); });
  app.route('/api/auth', auth.routes);
  app.use('/api/admin/*', async (c, next) => {
    c.header('Cache-Control', 'no-store');
    // Presence of Authorization chooses this scheme. Invalid keys never fall back to a Cookie.
    if (c.req.header('Authorization') !== undefined) {
      const url = new URL(c.req.url);
      if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))) throw new ApiError(503, 'https_required', '访问令牌需要 HTTPS');
      const keys = createApiKeys({ store: d1ApiKeyStore(c.env.DB) });
      const key = await keys.verify(c.req.header('Authorization'));
      if (key.owner !== c.env.ADMIN_USERNAME) throw new ApiError(401, 'invalid_api_key', '访问令牌无效或已失效');
      if (!tokenEndpoint(c.req.method, new URL(c.req.url).pathname)) throw new ApiError(403, 'browser_session_required', '此接口仅支持浏览器登录');
      const current = await ownerPermissions(key.owner);
      if (!current || !Array.isArray(current) || current.some((value) => typeof value !== 'string')) throw new ApiError(401, 'invalid_api_key', '访问令牌所属身份已失效');
      if (!c.env.API_KEY_RATE_LIMITER || typeof c.env.API_KEY_RATE_LIMITER.limit !== 'function') throw new ApiError(503, 'rate_limit_unconfigured', '令牌限流尚未配置');
      const limit = await c.env.API_KEY_RATE_LIMITER.limit({ key: key.id });
      if (!limit.success) { c.header('Retry-After', '60'); throw new ApiError(429, 'api_key_limited', '访问令牌请求过于频繁'); }
      c.set('apiKey', { id: key.id, owner: key.owner, permissions: key.permissions.filter((permission) => tokenPermissions.includes(permission) && current.includes(permission)) });
      await next();
      if (c.res.status < 400 && (!key.lastUsedAt || Date.parse(key.lastUsedAt) < Date.now() - 60_000)) await keys.used(key.id);
      return;
    }
    return auth.requireAdmin(c, next);
  });
  app.get('/api/admin/access', async (c) => c.json({ permissions: await access.permissions(c) }));
  const browserOnly = async (c: C, next: () => Promise<void>) => { if (c.get('apiKey')) throw new ApiError(403, 'browser_session_required', '此接口仅支持浏览器登录'); await next(); };
  app.get('/api/admin/runtime', browserOnly, requirePermission('runtime:read'), async (c) => c.json(await inspectRuntime({
    application: { name: 'WorkerKit Dashboard', version: '0.2.0' },
    environment: ['localhost', '127.0.0.1', '[::1]'].includes(new URL(c.req.url).hostname) ? 'local' : 'production',
    version: c.env.CF_VERSION_METADATA,
    checks: [
      { name: 'D1', kind: 'database', description: '配置与操作日志', check: () => c.env.DB.prepare('SELECT 1').first() },
      { name: 'KV', kind: 'kv', description: '应用设置', check: () => c.env.SETTINGS.get('workerkit:settings') },
      { name: 'R2', kind: 'storage', description: '私有文件存储', check: () => c.env.FILES.head('uploads/health-check') },
    ],
  })));
  app.get('/api/admin/runtime/metrics', browserOnly, requirePermission('runtime:read'), async (c) => c.json(await readCloudflareMetrics({
    accountId: c.env.CLOUDFLARE_METRICS_ACCOUNT_ID, scriptName: c.env.CLOUDFLARE_METRICS_SCRIPT_NAME, apiToken: c.env.CLOUDFLARE_METRICS_API_TOKEN,
  }, { signal: c.req.raw.signal })));
  app.get('/api/admin/openapi.json', browserOnly, requirePermission('api:read'), openAPIRouteHandler(app, {
    excludeStaticFile: false, excludeMethods: ['OPTIONS', 'HEAD'],
    documentation: { openapi: '3.1.0', info: { title: 'WorkerKit API', version: '0.2.0', description: '当前应用的接口。Cookie 写操作要求同源 Origin；Bearer Token 仅能访问显式开放的业务接口。' }, servers: [{ url: '/' }], components: { securitySchemes: { cookieAuth: { type: 'apiKey', in: 'cookie', name: 'workerkit_session', description: '通过登录接口设置，HttpOnly；无需复制 Cookie。' }, bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'Opaque API Key' } } } },
  }));
  app.get('/api/admin/api-keys', browserOnly, requirePermission('api:tokens'), async (c) => {
    const query = readPageQuery(new URL(c.req.url).searchParams);
    const result = await listApiKeys(c.env.DB, c.get('adminUser')!, query.page, query.pageSize);
    const grants = await access.permissions(c);
    return c.json({ items: result.rows.map(apiKeyInfo), total: result.total, page: query.page, pageSize: query.pageSize, grantablePermissions: tokenPermissions.filter((permission) => grants.includes(permission)) });
  });
  app.post('/api/admin/api-keys', browserOnly, requirePermission('api:issue'), bodyLimit({ maxSize: 8192 }), async (c) => {
    const parsed = apiKeyInputSchema.safeParse(await readJson(c));
    if (!parsed.success) throw new ApiError(422, 'invalid_api_key', '请填写名称、1–365 天有效期，并选择已授权的业务权限');
    const body = parsed.data;
    const grants = await access.permissions(c);
    const keys = createApiKeys({ store: d1ApiKeyStore(c.env.DB) });
    return c.json(await keys.issue({ owner: c.get('adminUser')!, name: body.name, permissions: body.permissions, expiresInDays: body.expiresInDays }, tokenPermissions.filter((permission) => grants.includes(permission))), 201);
  });
  app.delete('/api/admin/api-keys/:id', browserOnly, requirePermission('api:revoke'), async (c) => {
    const id = c.req.param('id'), owner = c.get('adminUser')!, at = new Date().toISOString();
    const existing = await c.env.DB.withSession('first-primary').prepare('SELECT id FROM api_keys WHERE id = ? AND owner = ?').bind(id, owner).first();
    if (!existing) throw new ApiError(404, 'api_key_not_found', '访问令牌不存在');
    await c.env.DB.batch([
      c.env.DB.prepare('UPDATE api_keys SET revoked_at = COALESCE(revoked_at, ?) WHERE id = ? AND owner = ?').bind(at, id, owner),
      c.env.DB.prepare('INSERT INTO audit_events VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), owner, 'api-key.revoke', id, at),
    ]);
    return c.body(null, 204);
  });
  app.get('/api/admin/diagnostics', requirePermission('overview:diagnose'), async (c) => {
    const result = await runHealthChecks([
      { name: 'D1', check: () => c.env.DB.prepare('SELECT 1').first() },
      { name: 'KV', check: () => c.env.SETTINGS.get('workerkit:settings') },
      { name: 'R2', check: () => c.env.FILES.head('uploads/health-check') },
    ]);
    // This is a diagnostic report, not a public readiness probe. Dependency failures remain in checks.
    return c.json(result);
  });
  app.get('/api/admin/audit/retention', requirePermission('audit:read'), async (c) => c.json(await inspectAuditRetention(c.env.DB, c.env.AUDIT_RETENTION_DAYS)));
  app.post('/api/admin/audit/prune', requirePermission('audit:prune'), bodyLimit({ maxSize: 1024 }), async (c) => {
    if (!auditPruneSchema.safeParse(await readJson(c)).success) throw new ApiError(400, 'confirmation_required', '请确认清理过期操作日志');
    return c.json(await pruneAuditEvents(c.env.DB, c.env.AUDIT_RETENTION_DAYS, c.get('adminUser')!));
  });
  // Explicit Hono middleware before the reusable storage routes, including list and download separately.
  app.get('/api/admin/settings', requirePermission('settings:read'));
  app.put('/api/admin/settings', requirePermission('settings:update'));
  app.get('/api/admin/files', requirePermission('files:read'));
  app.post('/api/admin/files', requirePermission('files:upload'));
  app.get('/api/admin/files/download', requirePermission('files:download'));
  app.delete('/api/admin/files', requirePermission('files:delete'));

  function auditStatement(c: C, action: string, target: string) {
    return c.env.DB.prepare('INSERT INTO audit_events(id, actor, action, target, created_at) VALUES(?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), c.get('apiKey') ? `token:${c.get('apiKey')!.id}` : c.get('adminUser')!, action, target.slice(0, 500), new Date().toISOString());
  }
  async function recordChange(c: C, event: { action: string; target: string }) {
    // KV/R2 writes cannot share a transaction with D1. Audit failure does not undo a successful write.
    try { await auditStatement(c, event.action, event.target).run(); }
    catch { console.error(JSON.stringify({ event: 'audit_write_failed', action: event.action, requestId: c.get('requestId') })); }
  }
  app.route('/api/admin/settings', createSettingsRoutes<Bindings>({
    store: (env) => env.SETTINGS,
    defaults: { siteName: 'WorkerKit', description: '你的应用工作台', contactEmail: '', pageSize: 20, showWelcome: true },
    validate: validateSettings,
    onChange: recordChange,
  }));
  app.route('/api/admin/files', createFileRoutes<Bindings>({ bucket: (env) => env.FILES, onChange: recordChange }));

  app.get('/api/admin/overview', requirePermission('overview:read'), async (c) => {
    const grants = await access.permissions(c);
    const can = (permission: string) => grants.includes(permission);
    const [summary, recent, activity, files, settings] = await Promise.all([
      can('resources:read') ? c.env.DB.prepare("SELECT COUNT(*) AS total, COALESCE(SUM(status = 'enabled'), 0) AS enabled FROM resources").first<{ total: number; enabled: number }>() : null,
      can('resources:read') ? c.env.DB.prepare('SELECT * FROM resources ORDER BY updated_at DESC, id LIMIT 5').all<Resource>() : null,
      can('audit:read') ? c.env.DB.prepare('SELECT * FROM audit_events ORDER BY created_at DESC, id LIMIT 7').all() : null,
      can('files:read') ? c.env.FILES.list({ prefix: 'uploads/', limit: 1000 }) : null, can('settings:read') ? c.env.SETTINGS.get('workerkit:settings') : null,
    ]);
    return c.json({ user: c.get('adminUser') ?? c.get('apiKey')?.owner, runtime: 'Cloudflare Workers', now: new Date().toISOString(),
      total: summary?.total ?? null, enabled: summary?.enabled ?? null,
      files: files?.objects.length ?? null, filesTruncated: files?.truncated ?? false, bytes: files?.objects.reduce((sum, object) => sum + object.size, 0) ?? null,
      recent: recent?.results ?? [], activity: activity?.results ?? [],
      bindings: [...(can('resources:read') ? [{ name: 'D1 Database', detail: '配置与操作日志', status: 'connected' }] : []), ...(can('files:read') ? [{ name: 'R2 Bucket', detail: '私有文件存储', status: 'connected' }] : []), ...(can('settings:read') ? [{ name: 'Workers KV', detail: settings ? '已保存应用设置' : '使用默认应用设置', status: 'connected' }] : [])],
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
  app.get('/api/admin/resources', requirePermission('resources:read'), async (c) => {
    const { where, args, page, pageSize, offset, orderBy } = resourceQuery(c);
    const [count, rows] = await Promise.all([
      c.env.DB.prepare(`SELECT COUNT(*) AS total FROM resources ${where}`).bind(...args).first<{ total: number }>(),
      c.env.DB.prepare(`SELECT * FROM resources ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).bind(...args, pageSize, offset).all<Resource>(),
    ]);
    return c.json({ items: rows.results, total: count?.total ?? 0, page, pageSize } satisfies PageList<Resource>);
  });
  app.get('/api/admin/resources/export', requirePermission('resources:export'), async (c) => {
    const { where, args, orderBy } = resourceQuery(c);
    const rows = await c.env.DB.prepare(`SELECT * FROM resources ${where} ORDER BY ${orderBy} LIMIT 10000`).bind(...args).all<Resource>();
    return new Response(JSON.stringify(rows.results, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="resources.json"', 'Cache-Control': 'no-store' } });
  });
  async function resourceInput(c: C) {
    const input = await readJson(c);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ApiError(400, 'invalid_resource', '请填写资源信息');
    const parsed = resourceInputSchema.safeParse(input);
    if (!parsed.success) throw new ApiError(422, 'validation_failed', '请检查表单内容', formIssues(parsed.error.issues));
    return { ...parsed.data, name: parsed.data.name.trim() };
  }
  app.post('/api/admin/resources', requirePermission('resources:create'), async (c) => {
    const data = await resourceInput(c); const id = crypto.randomUUID(); const now = new Date().toISOString();
    await c.env.DB.batch([
      c.env.DB.prepare('INSERT INTO resources VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id, data.name, data.kind, data.status, data.address, data.description, now, now), auditStatement(c, 'resource.create', data.name),
    ]);
    return c.json({ id, ...data, created_at: now, updated_at: now }, 201);
  });
  app.put('/api/admin/resources/:id', requirePermission('resources:update'), async (c) => {
    const id = c.req.param('id');
    if (!await c.env.DB.prepare('SELECT id FROM resources WHERE id=?').bind(id).first()) throw new ApiError(404, 'resource_not_found', '资源不存在');
    const data = await resourceInput(c); const now = new Date().toISOString();
    await c.env.DB.batch([
      c.env.DB.prepare('UPDATE resources SET name=?, kind=?, status=?, address=?, description=?, updated_at=? WHERE id=?').bind(data.name, data.kind, data.status, data.address, data.description, now, id), auditStatement(c, 'resource.update', data.name),
    ]);
    return c.json({ id, ...data, updated_at: now });
  });
  app.delete('/api/admin/resources/:id', requirePermission('resources:delete'), async (c) => {
    const row = await c.env.DB.prepare('SELECT name FROM resources WHERE id=?').bind(c.req.param('id')).first<{ name: string }>();
    if (!row) throw new ApiError(404, 'resource_not_found', '资源不存在');
    await c.env.DB.batch([c.env.DB.prepare('DELETE FROM resources WHERE id=?').bind(c.req.param('id')), auditStatement(c, 'resource.delete', row.name)]);
    return c.body(null, 204);
  });
  app.post('/api/admin/resources/batch', requirePermission('resources:batch'), async (c) => {
    const parsed = resourceBatchSchema.safeParse(await readJson(c));
    if (!parsed.success) {
      throw new ApiError(400, 'invalid_batch', '请选择 1–100 条资源和有效状态');
    }
    const body = parsed.data;
    const ids = [...new Set(body.ids)]; const placeholders = ids.map(() => '?').join(',');
    const result = await c.env.DB.batch([
      c.env.DB.prepare(`UPDATE resources SET status=?, updated_at=? WHERE id IN (${placeholders}) RETURNING id`).bind(body.status, new Date().toISOString(), ...ids), auditStatement(c, 'resource.batch', `${String(body.status)} · 请求 ${ids.length} 项`),
    ]);
    const changed = new Set((result[0]?.results as { id: string }[]).map((row) => row.id));
    const succeeded = ids.filter((id) => changed.has(id));
    const failed = ids.filter((id) => !changed.has(id)).map((id) => ({ id, code: 'resource_not_found', message: '资源不存在或已被删除' }));
    return c.json({ succeeded, failed, updated: succeeded.length } satisfies BatchResult & { updated: number });
  });
  app.get('/api/admin/audit', requirePermission('audit:read'), async (c) => {
    const page = Math.max(1, Math.min(10000, Math.trunc(Number(c.req.query('page')) || 1)));
    const action = (c.req.query('action') ?? '').slice(0, 80); const where = action ? 'WHERE action = ?' : ''; const args = action ? [action] : [];
    const [count, rows] = await Promise.all([
      c.env.DB.prepare(`SELECT COUNT(*) AS total FROM audit_events ${where}`).bind(...args).first<{ total: number }>(),
      c.env.DB.prepare(`SELECT * FROM audit_events ${where} ORDER BY created_at DESC, id LIMIT 20 OFFSET ?`).bind(...args, (page - 1) * 20).all(),
    ]);
    return c.json({ items: rows.results, total: count?.total ?? 0, page });
  });
  app.post('/api/admin/echo', requirePermission('overview:read'), (c) => c.json({ ok: true }));
  return app;
}

export default createDashboard();
