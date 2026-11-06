import { bodyLimit } from 'hono/body-limit';
import { createServer, ApiError, type WorkerEnv } from './app';
import type { Context } from 'hono';
import { createKvAdminAuth } from './kv-auth';
import { createApiKeys, apiKeyInfo, type ApiKeyRecord, type ApiKeyStore } from './api-keys';
import { createSettingsRoutes, type SettingsValues } from './settings';
import { inspectRuntime, readCloudflareMetrics } from './runtime';

/** Optional KV administration. Applications own bindings, business routes and settings. */
export function createNativeAdmin<E extends object>(options: {
  store(env: E): KVNamespace;
  username(env: E): string;
  password(env: E): string | undefined;
  rateLimit(env: E, request: Request): Promise<boolean>;
  cookieName: string;
  prefix?: string;
  apiRoot: string;
  runtime(env: E): Parameters<typeof inspectRuntime>[0];
  settings: SettingsValues;
}) {
  const prefix = options.prefix ?? 'workerkit:native:';
  const auth = createKvAdminAuth({ cookieName: options.cookieName, keyPrefix: prefix + 'session:', authScope: options.cookieName, sessionSeconds: 43200 });
  const app = createServer<E>();
  const user = (env: E) => options.username(env) || 'admin';
  const password = (env: E) => options.password(env) || '';
  const isAuthenticated = (request: Request, env: E) => auth.isAuthenticated(request, options.store(env), user(env), password(env));
  const audit = async (env: E, action: string, target: string) => {
    const at = new Date().toISOString(), id = crypto.randomUUID();
    try { await options.store(env).put(prefix + 'audit:' + String(9999999999999 - Date.now()).padStart(13, '0') + ':' + id, JSON.stringify({ id, at, actor: user(env), action, target }), { expirationTtl: 2592000 }); }
    catch { console.error(JSON.stringify({ event: 'native_audit_write_failed' })); }
  };
  const recordKey = (hash: string) => prefix + 'key:' + hash;
  const idKey = (id: string) => prefix + 'key-id:' + id;
  const keyStore = (env: E): ApiKeyStore => ({
    async insert(record) {
      const kv = options.store(env);
      await kv.put(recordKey(record.hash), JSON.stringify(record));
      try { await kv.put(idKey(record.id), record.hash); } catch (error) { await kv.delete(recordKey(record.hash)); throw error; }
    },
    async findByHash(hash) {
      const value = await options.store(env).get<ApiKeyRecord>(recordKey(hash), 'json');
      return value ? { ...value, lastUsedAt: await options.store(env).get(prefix + 'usage:' + value.id) } : null;
    },
    // Usage metadata never overwrites the canonical authorization record or revocation.
    async touch(id, at) { await options.store(env).put(prefix + 'usage:' + id, at, { expirationTtl: 31536000 }); },
  });
  const keys = (env: E) => createApiKeys({ store: keyStore(env) });
  const cursorFor = (c: Context<WorkerEnv<E>>) => {
    const cursor = c.req.query('cursor');
    if (cursor && cursor.length > 2048) throw new ApiError(400, 'invalid_cursor', '分页游标无效');
    return cursor;
  };
  app.use('*', bodyLimit({ maxSize: 16384 }));
  app.use('*', async (c, next) => {
    c.header('Cache-Control', 'no-store');
    if (!password(c.env)) throw new ApiError(503, 'not_configured', '管理员凭据未配置');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method) && !auth.isSameOrigin(c.req.raw)) throw new ApiError(403, 'origin_mismatch', '请求来源不符');
    if (c.req.path.endsWith('/auth/login')) return next();
    if (c.req.path.endsWith('/service-status') && c.req.header('Authorization')) {
      const key = await keys(c.env).verify(c.req.header('Authorization'));
      if (!key.permissions.includes('runtime:read')) throw new ApiError(403, 'forbidden', '令牌无此权限');
      await keys(c.env).used(key.id); return next();
    }
    if (!await isAuthenticated(c.req.raw, c.env)) throw new ApiError(401, 'unauthorized', '请先登录');
    await next();
  });
  app.post('/auth/login', async c => {
    if (!await options.rateLimit(c.env, c.req.raw)) throw new ApiError(429, 'rate_limited', '登录过于频繁，请稍后重试');
    let input: unknown; try { input = await c.req.json(); } catch { throw new ApiError(400, 'invalid_json', '请求 JSON 无效'); }
    const value = input as Record<string, unknown> | null;
    if (typeof value?.username !== 'string' || typeof value?.password !== 'string' || !await auth.verifyCredentials(value.username, value.password, user(c.env), password(c.env))) throw new ApiError(401, 'invalid_credentials', '用户名或密码错误');
    c.header('Set-Cookie', await auth.createSession(options.store(c.env), user(c.env), password(c.env), c.req.raw));
    await audit(c.env, 'session.login', 'current'); return c.json({ username: user(c.env) });
  });
  app.get('/auth/session', c => c.json({ username: user(c.env) }));
  app.post('/auth/logout', async c => {
    c.header('Set-Cookie', await auth.deleteSession(c.req.raw, options.store(c.env)));
    await audit(c.env, 'session.logout', 'current'); return c.json({ ok: true });
  });
  app.get('/runtime/metrics', async c => c.json(await readCloudflareMetrics({})));
  app.get('/runtime', async c => c.json(await inspectRuntime(options.runtime(c.env))));
  app.get('/service-status', async c => c.json(await inspectRuntime(options.runtime(c.env))));
  app.get('/configuration', c => c.json({ storage: 'Cloudflare KV', sessionHours: 12, settings: Object.keys(options.settings), audit: 'KV 最近记录，30 天保留，尽力写入', permissions: ['runtime:read'] }));
  app.route('/settings', createSettingsRoutes<E>({ store: options.store, defaults: options.settings, key: prefix + 'settings', onChange: async (c, event) => audit(c.env, event.action, event.target) }));
  app.get('/keys', async c => {
    const page = await options.store(c.env).list({ prefix: prefix + 'key:', limit: 20, cursor: cursorFor(c) });
    const items = [];
    for (const key of page.keys) { const value = await options.store(c.env).get<ApiKeyRecord>(key.name, 'json'); if (value) items.push(apiKeyInfo({ ...value, lastUsedAt: await options.store(c.env).get(prefix + 'usage:' + value.id) })); }
    return c.json({ items, cursor: 'cursor' in page ? page.cursor : null });
  });
  app.post('/keys', async c => {
    let value: { name: string; expiresInDays: number; permissions: string[] };
    try { value = await c.req.json(); } catch { throw new ApiError(400, 'invalid_json', '请求 JSON 无效'); }
    const result = await keys(c.env).issue({ ...value, owner: user(c.env) }, ['runtime:read']);
    await audit(c.env, 'key.issue', result.key.id); return c.json(result, 201);
  });
  app.delete('/keys/:id', async c => {
    const kv = options.store(c.env), hash = await kv.get(idKey(c.req.param('id')));
    const value = hash ? await kv.get<ApiKeyRecord>(recordKey(hash), 'json') : null;
    if (!value) throw new ApiError(404, 'not_found', '令牌不存在');
    await kv.put(recordKey(value.hash), JSON.stringify({ ...value, revokedAt: new Date().toISOString() }));
    await audit(c.env, 'key.revoke', value.id); return c.json({ revoked: true });
  });
  app.get('/audit', async c => {
    const page = await options.store(c.env).list({ prefix: prefix + 'audit:', limit: 20, cursor: cursorFor(c) });
    const items = []; for (const key of page.keys) { const item = await options.store(c.env).get(key.name, 'json'); if (item) items.push(item); }
    return c.json({ items, cursor: 'cursor' in page ? page.cursor : null });
  });
  const operations = [
    ['/auth/session','get','当前账户'], ['/auth/logout','post','注销会话'], ['/runtime','get','运行检查'], ['/configuration','get','配置状态'],
    ['/settings','get','读取 KV 设置'], ['/settings','put','更新 KV 设置'], ['/keys','get','访问密钥元数据'], ['/keys','post','签发受限访问密钥'], ['/keys/{id}','delete','撤销访问密钥'], ['/audit','get','最近操作审计'],
  ] as const;
  app.get('/openapi.json', c => {
    const paths: Record<string, Record<string, unknown>> = {};
    for (const [suffix, method, summary] of operations) {
      const operation: Record<string, unknown> = { operationId: method + suffix.replaceAll('/', '-'), summary, responses: { [method === 'post' && suffix === '/keys' ? '201' : '200']: { description: '成功' }, '401': { description: '未登录' }, '403': { description: '来源或权限不符' } } };
      if (suffix === '/keys/{id}') operation.parameters = [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }];
      if (suffix === '/keys' && method === 'post') operation.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name','permissions','expiresInDays'], properties: { name: { type: 'string', maxLength: 80 }, permissions: { type: 'array', items: { type: 'string', enum: ['runtime:read'] } }, expiresInDays: { type: 'integer', minimum: 1, maximum: 365, default: 30 } } } } } };
      if (suffix === '/settings' && method === 'put') operation.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object', required: ['values'], properties: { values: { type: 'object', properties: Object.fromEntries(Object.entries(options.settings).map(([name,value]) => [name, { type: typeof value, default: value }])) } } } } } };
      (paths[options.apiRoot + suffix] ??= {})[method] = operation;
    }
    return c.json({ openapi: '3.1.0', info: { title: 'WorkerKit Native API', version: '0.3.0' }, servers: [{ url: new URL(c.req.url).origin }], components: { securitySchemes: { session: { type: 'apiKey', in: 'cookie', name: options.cookieName } } }, security: [{ session: [] }], paths });
  });
  return { routes: app, isAuthenticated, audit };
}
