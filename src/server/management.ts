import { bodyLimit } from 'hono/body-limit';
import type { Context } from 'hono';
import { createServer, ApiError, type WorkerEnv } from './app';
import { requireSameOrigin } from './auth';
import {
  createApiKeys,
  apiKeyInfo,
  type ApiKeyRecord,
  type ApiKeyStore,
} from './api-keys';
import {
  createSettingsRoutes,
  readSettingsSnapshot,
  type SettingsValues,
} from './settings';
import { inspectRuntime, readCloudflareMetrics } from './runtime';
import type {
  AuditEntry,
  ManagementCapabilities,
  ManagementPrincipal,
  ManagementSnapshot,
} from '../contracts/management';

export const adminManagementPermissions = [
  'runtime:read',
  'settings:read',
  'settings:manage',
  'keys:manage',
  'audit:read',
  'tasks:read',
  'tasks:manage',
] as const;
export interface ManagementOptions<E extends object> {
  store(env: E): KVNamespace;
  prefix: string;
  apiRoot: string;
  cookieName?: string;
  sessionHours?: number;
  settings: SettingsValues;
  tasks?: boolean;
}
/** Shared management capabilities behind a host's existing identity. No user store. */
export function createManagementRoutes<E extends object>(
  options: ManagementOptions<E> & {
    principal(
      c: Context<WorkerEnv<E>>,
    ): Promise<ManagementPrincipal | null> | ManagementPrincipal | null;
    runtime(c: Context<WorkerEnv<E>>): Parameters<typeof inspectRuntime>[0];
  },
) {
  const app = createServer<E>(),
    prefix = options.prefix;
  const principals = new WeakMap<Context<WorkerEnv<E>>, ManagementPrincipal>();
  const audit = async (
    env: E,
    action: string,
    target: string,
    actor: string,
  ) => {
    const at = new Date().toISOString(),
      id = crypto.randomUUID();
    try {
      await options
        .store(env)
        .put(
          prefix +
            'audit:' +
            String(9999999999999 - Date.now()).padStart(13, '0') +
            ':' +
            id,
          JSON.stringify({ id, at, actor, action, target }),
          { expirationTtl: 2592000 },
        );
    } catch {
      console.error(JSON.stringify({ event: 'management_audit_write_failed' }));
    }
  };
  const recordKey = (hash: string) => prefix + 'key:' + hash;
  const idKey = (id: string) => prefix + 'key-id:' + id;
  const keyStore = (env: E): ApiKeyStore => ({
    async insert(record) {
      const kv = options.store(env);
      await kv.put(recordKey(record.hash), JSON.stringify(record));
      try {
        await kv.put(idKey(record.id), record.hash);
      } catch (error) {
        await kv.delete(recordKey(record.hash));
        throw error;
      }
    },
    async findByHash(hash) {
      const value = await options
        .store(env)
        .get<ApiKeyRecord>(recordKey(hash), 'json');
      return value
        ? {
            ...value,
            lastUsedAt: await options
              .store(env)
              .get(prefix + 'usage:' + value.id),
          }
        : null;
    },
    // Usage metadata never overwrites the canonical authorization record or revocation.
    async touch(id, at) {
      await options
        .store(env)
        .put(prefix + 'usage:' + id, at, { expirationTtl: 31536000 });
    },
  });
  const keys = (env: E) => createApiKeys({ store: keyStore(env) });
  const cursorFor = (c: Context<WorkerEnv<E>>, name = 'cursor') => {
    const cursor = c.req.query(name);
    if (cursor && cursor.length > 2048)
      throw new ApiError(400, 'invalid_cursor', '分页游标无效');
    return cursor;
  };

  const capabilities = (user: ManagementPrincipal): ManagementCapabilities => ({
    runtime: user.permissions.includes('runtime:read'),
    settings: {
      read: user.permissions.includes('settings:read'),
      manage: user.permissions.includes('settings:manage'),
    },
    keys: { manage: user.permissions.includes('keys:manage') },
    audit: { read: user.permissions.includes('audit:read') },
    tasks: {
      read: !!options.tasks && user.permissions.includes('tasks:read'),
      manage: !!options.tasks && user.permissions.includes('tasks:manage'),
    },
  });
  const readSettings = (env: E) =>
    readSettingsSnapshot(
      options.store(env),
      prefix + 'settings',
      options.settings,
    );
  const readKeys = async (env: E, cursor?: string) => {
    const page = await options
      .store(env)
      .list({ prefix: prefix + 'key:', limit: 20, cursor });
    const records = await Promise.all(
      page.keys.map(async (key) => {
        const value = await options
          .store(env)
          .get<ApiKeyRecord>(key.name, 'json');
        return value
          ? apiKeyInfo({
              ...value,
              lastUsedAt: await options
                .store(env)
                .get(prefix + 'usage:' + value.id),
            })
          : null;
      }),
    );
    return {
      items: records.filter(
        (value): value is NonNullable<typeof value> => value !== null,
      ),
      cursor: 'cursor' in page ? page.cursor : null,
    };
  };
  const readAudit = async (env: E, cursor?: string) => {
    const page = await options
      .store(env)
      .list({ prefix: prefix + 'audit:', limit: 20, cursor });
    const records = await Promise.all(
      page.keys.map((key) =>
        options.store(env).get<AuditEntry>(key.name, 'json'),
      ),
    );
    return {
      items: records.filter((value): value is AuditEntry => value !== null),
      cursor: 'cursor' in page ? page.cursor : null,
    };
  };
  const summary = async (
    c: Context<WorkerEnv<E>>,
    user: ManagementPrincipal,
  ): Promise<ManagementSnapshot> => {
    const allowed = capabilities(user);
    const [settings, keyPage, auditPage] = await Promise.all([
      allowed.settings.read ? readSettings(c.env) : null,
      allowed.keys.manage ? readKeys(c.env, cursorFor(c, 'keysCursor')) : null,
      allowed.audit.read ? readAudit(c.env, cursorFor(c, 'auditCursor')) : null,
    ]);
    return { capabilities: allowed, settings, keys: keyPage, audit: auditPage };
  };
  app.use('*', bodyLimit({ maxSize: 16384 }));
  app.use('*', async (c, next) => {
    c.header('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method))
      requireSameOrigin(c.req.raw);
    if (
      c.req.path.endsWith('/service-status') &&
      c.req.header('Authorization')
    ) {
      const key = await keys(c.env).verify(c.req.header('Authorization'));
      if (!key.permissions.includes('runtime:read'))
        throw new ApiError(403, 'forbidden', '令牌无此权限');
      await keys(c.env).used(key.id);
      return next();
    }
    const user = await options.principal(c);
    if (!user) throw new ApiError(401, 'unauthorized', '请先登录');
    principals.set(c, user);
    const path = c.req.path;
    const needed = /\/settings\/?$/.test(path)
      ? c.req.method === 'GET'
        ? 'settings:read'
        : 'settings:manage'
      : /\/keys(?:\/[^/]+)?\/?$/.test(path)
        ? 'keys:manage'
        : /\/audit$/.test(path)
          ? 'audit:read'
          : /\/(?:runtime(?:\/metrics)?|service-status)$/.test(path)
            ? 'runtime:read'
            : null;
    if (needed && !user.permissions.includes(needed))
      throw new ApiError(403, 'forbidden', '没有执行此操作的权限');
    await next();
  });
  app.get('/reference', (c) => {
    const apiRoot = options.apiRoot
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;');
    c.header(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'none'",
    );
    return c.html(
      `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WorkerKit API 文档</title><link rel="stylesheet" href="/management-assets/reference.css"></head><body data-management-api-root="${apiRoot}"><div id="root"></div><script type="module" src="/management-assets/reference.js"></script></body></html>`,
    );
  });
  app.get('/capabilities', (c) => c.json(capabilities(principals.get(c)!)));
  app.get('/runtime', async (c) =>
    c.json(await inspectRuntime(options.runtime(c))),
  );
  app.get('/runtime/metrics', async (c) =>
    c.json(await readCloudflareMetrics({})),
  );
  app.get('/service-status', async (c) =>
    c.json(await inspectRuntime(options.runtime(c))),
  );
  app.get('/configuration', (c) =>
    c.json({
      storage: 'Cloudflare KV',
      sessionHours: options.sessionHours ?? null,
      authentication: options.sessionHours
        ? 'WorkerKit KV 会话'
        : '由原生后端管理',
      settings: Object.keys(options.settings),
      audit: 'KV 最近记录，30 天保留，尽力写入',
      permissions: ['runtime:read'],
    }),
  );
  app.route(
    '/settings',
    createSettingsRoutes<E>({
      store: options.store,
      defaults: options.settings,
      key: prefix + 'settings',
      onChange: (c, event) =>
        audit(c.env, event.action, event.target, principals.get(c)!.id),
    }),
  );
  app.get('/keys', async (c) => c.json(await readKeys(c.env, cursorFor(c))));
  app.post('/keys', async (c) => {
    let input: { name: string; expiresInDays: number; permissions: string[] };
    try {
      input = await c.req.json();
    } catch {
      throw new ApiError(400, 'invalid_json', '请求 JSON 无效');
    }
    const result = await keys(c.env).issue(
      { ...input, owner: principals.get(c)!.id },
      ['runtime:read'],
    );
    await audit(c.env, 'key.issue', result.key.id, principals.get(c)!.id);
    return c.json(result, 201);
  });
  app.delete('/keys/:id', async (c) => {
    const kv = options.store(c.env),
      hash = await kv.get(idKey(c.req.param('id')));
    const value = hash
      ? await kv.get<ApiKeyRecord>(recordKey(hash), 'json')
      : null;
    if (!value) throw new ApiError(404, 'not_found', '令牌不存在');
    await kv.put(
      recordKey(value.hash),
      JSON.stringify({ ...value, revokedAt: new Date().toISOString() }),
    );
    await audit(c.env, 'key.revoke', value.id, principals.get(c)!.id);
    return c.json({ revoked: true });
  });
  app.get('/audit', async (c) => c.json(await readAudit(c.env, cursorFor(c))));
  const operations = [
    ['/capabilities', 'get', '功能与权限'],
    ['/runtime', 'get', '运行检查'],
    ['/configuration', 'get', '配置状态'],
    ['/settings', 'get', '读取 KV 设置'],
    ['/settings', 'put', '更新 KV 设置'],
    ['/keys', 'get', '访问密钥元数据'],
    ['/keys', 'post', '签发受限访问密钥'],
    ['/keys/{id}', 'delete', '撤销访问密钥'],
    ['/audit', 'get', '最近操作审计'],
    ['/workspace', 'get', '管理工作台'],
    ['/managed-tasks', 'get', '任务计划'],
    ['/managed-tasks', 'post', '创建任务计划'],
    ['/managed-tasks/run', 'post', '运行任务'],
    ['/managed-tasks/pause', 'post', '暂停任务'],
    ['/managed-tasks/resume', 'post', '恢复任务'],
  ] as const;
  app.get('/openapi.json', (c) => {
    const paths: Record<string, Record<string, unknown>> = {};
    for (const [suffix, method, summary] of operations) {
      if (
        !options.tasks &&
        (suffix === '/workspace' || suffix.startsWith('/managed-tasks'))
      )
        continue;
      const operation: Record<string, unknown> = {
        operationId: method + suffix.replaceAll('/', '-'),
        summary,
        responses: {
          [method === 'post' && suffix === '/keys' ? '201' : '200']: {
            description: '成功',
          },
          '401': { description: '未登录' },
          '403': { description: '来源或权限不符' },
        },
      };
      if (suffix === '/keys/{id}')
        operation.parameters = [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ];
      if (suffix === '/keys' && method === 'post')
        operation.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'permissions', 'expiresInDays'],
                properties: {
                  name: { type: 'string', maxLength: 80 },
                  permissions: {
                    type: 'array',
                    items: { type: 'string', enum: ['runtime:read'] },
                  },
                  expiresInDays: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 365,
                    default: 30,
                  },
                },
              },
            },
          },
        };
      if (suffix.startsWith('/managed-tasks') && method === 'post') {
        const schema =
          suffix === '/managed-tasks'
            ? {
                type: 'object',
                required: ['task', 'schedule'],
                properties: {
                  task: { type: 'string', default: 'check-bindings' },
                  inputs: {
                    type: 'object',
                    additionalProperties: { type: 'string' },
                  },
                  schedule: {
                    type: 'object',
                    required: ['kind', 'minutes'],
                    properties: {
                      kind: { type: 'string', enum: ['interval'] },
                      minutes: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 10080,
                        default: 60,
                      },
                    },
                  },
                },
              }
            : {
                type: 'object',
                required: ['id'],
                properties: { id: { type: 'string' } },
              };
        operation.requestBody = {
          required: true,
          content: { 'application/json': { schema } },
        };
      }
      if (suffix === '/settings' && method === 'put')
        operation.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['values'],
                properties: {
                  values: {
                    type: 'object',
                    properties: Object.fromEntries(
                      Object.entries(options.settings).map(([name, value]) => [
                        name,
                        { type: typeof value, default: value },
                      ]),
                    ),
                  },
                },
              },
            },
          },
        };
      (paths[options.apiRoot + suffix] ??= {})[method] = operation;
    }
    return c.json({
      openapi: '3.1.0',
      info: { title: 'WorkerKit Native API', version: '0.4.0' },
      servers: [{ url: new URL(c.req.url).origin }],
      components: {
        securitySchemes: {
          session: {
            type: 'apiKey',
            in: 'cookie',
            name: options.cookieName ?? 'session',
          },
        },
      },
      security: [{ session: [] }],
      paths,
    });
  });
  return { routes: app, audit, summary, capabilities };
}
