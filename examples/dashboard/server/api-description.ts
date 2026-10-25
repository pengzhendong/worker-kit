import { runtimeSnapshotSchema as runtime, runtimeMetricsSchema as metrics } from '@pengzhendong/worker-kit/contracts';
import { describeRoute } from '@pengzhendong/worker-kit/openapi';
import type { DescribeRouteOptions } from '@pengzhendong/worker-kit/openapi';
import type { Hono } from 'hono';
import type { OpenAPIV3_1 as O } from 'openapi-types';
import type { WorkerEnv } from '@pengzhendong/worker-kit/server';
import type { Bindings } from './index';
import { apiKeyInputSchema, auditPruneSchema, inputJsonSchema, outputJsonSchema, resourceBatchSchema, resourceInputSchema, resourceSchema, resourceUpdateSchema, savedSettingsSchema, settingsPatchSchema } from './schemas';

const str = { type: 'string' as const }, bool = { type: 'boolean' as const }, integer = { type: 'integer' as const };
const obj = (properties: Record<string, O.SchemaObject>, required = Object.keys(properties)): O.SchemaObject => ({ type: 'object', properties, required });
const arr = (items: O.SchemaObject): O.SchemaObject => ({ type: 'array', items });
const nullable = (schema: O.SchemaObject): O.SchemaObject => ({ anyOf: [schema, { type: 'null' }] });
const stamp: O.SchemaObject = { type: 'string', format: 'date-time' };
const error = obj({ error: obj({ code: str, message: str, fields: arr(obj({ path: arr({ anyOf: [str, integer] }), message: str })) }, ['code', 'message']), requestId: str });
const resourceInput = inputJsonSchema(resourceInputSchema) as O.SchemaObject;
const resource = outputJsonSchema(resourceSchema) as O.SchemaObject;
const savedSettings = outputJsonSchema(savedSettingsSchema) as O.SchemaObject;
const file = obj({ key: str, name: str, size: integer, uploadedAt: stamp, contentType: str });
const audit = obj({ id: str, actor: str, action: str, target: str, created_at: stamp });
const session = obj({ user: str, expiresAt: { ...integer, description: 'Unix 秒' } });
const retention = obj({ enabled: bool, days: nullable(integer), before: nullable(stamp), eligible: integer, batchLimit: { ...integer, const: 1000 } });
const key = obj({ id: str, owner: str, name: str, prefix: str, permissions: arr(str), createdAt: stamp, expiresAt: stamp, revokedAt: nullable(stamp), lastUsedAt: nullable(stamp) });
const query = (name: string, schema: NonNullable<O.ParameterObject['schema']> = str, required = false): O.ParameterObject => ({ name, in: 'query', required, schema });
const pageQuery = [query('page', { ...integer, minimum: 1, maximum: 10000, default: 1 }), query('pageSize', { ...integer, minimum: 1, maximum: 100, default: 20 })];
const resourceQuery = [...pageQuery, query('q', { ...str, maxLength: 100 }), query('kind', { ...str, enum: ['订阅源', '存储', '任务', '配置'] }), query('status', { ...str, enum: ['enabled', 'disabled'] }), query('sort', { ...str, enum: ['name', 'status', 'updated_at'] }), query('order', { ...str, enum: ['asc', 'desc'] })];
const json = (schema: O.SchemaObject): O.RequestBodyObject => ({ required: true, content: { 'application/json': { schema } } });
const response = (schema: O.SchemaObject): O.ResponseObject => ({ description: '成功', content: { 'application/json': { schema } } });
export interface Endpoint { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; path: string; summary: string; tag: string; permission?: string; token?: boolean; public?: boolean; input?: O.RequestBodyObject; parameters?: O.ParameterObject[]; output?: O.SchemaObject; status?: number; description?: string; binary?: boolean }
const page = (items: O.SchemaObject) => obj({ items: arr(items), total: integer, page: integer, pageSize: integer });
export const endpoints: readonly Endpoint[] = [
  { method: 'GET', path: '/health', summary: '服务存活检查', tag: '运行', public: true, output: obj({ ok: bool, service: str }) },
  { method: 'POST', path: '/api/auth/login', summary: '管理员登录', tag: '认证', public: true, input: json(obj({ username: str, password: { ...str, format: 'password' } })), output: session, description: '同源 Origin 必填；设置 HttpOnly Cookie。限流可能返回 429 和 Retry-After。' },
  { method: 'GET', path: '/api/auth/session', summary: '查看当前会话', tag: '认证', output: session },
  { method: 'POST', path: '/api/auth/logout', summary: '退出当前登录', tag: '认证', status: 204, description: '同源 Origin 必填，清除浏览器 Cookie。' },
  { method: 'GET', path: '/api/admin/access', summary: '当前操作权限', tag: '认证', token: true, output: obj({ permissions: arr(str) }) },
  { method: 'GET', path: '/api/admin/overview', summary: '工作台概览', tag: '运行', permission: 'overview:read', token: true, output: obj({ user: str, runtime: str, now: stamp, total: nullable(integer), enabled: nullable(integer), files: nullable(integer), filesTruncated: bool, bytes: nullable(integer), recent: arr(resource), activity: arr(audit), bindings: arr(obj({ name: str, detail: str, status: str })) }) },
  { method: 'GET', path: '/api/admin/diagnostics', summary: '只读依赖诊断', tag: '运行', permission: 'overview:diagnose', output: obj({ ok: bool, checks: arr(obj({ name: str, status: { ...str, enum: ['ok', 'error', 'timeout'] }, durationMs: integer })) }), description: '200 表示取得诊断报告；依赖状态由 ok/checks 判断。每项默认等待上限 1500ms。' },
  { method: 'GET', path: '/api/admin/runtime', summary: '查看应用运行状态', tag: '运行', permission: 'runtime:read', output: runtime, description: '只读依赖检查与原生版本元数据。200 表示取得报告，依赖状态检查 ok/checks；不是全天可用率。' },
  { method: 'GET', path: '/api/admin/runtime/metrics', summary: '读取 Cloudflare 运行指标', tag: '运行', permission: 'runtime:read', output: metrics, description: '服务端配置固定 Worker 的过去一小时聚合指标。CPU/执行耗时单位 ms，内存 bytes；未接入或失败返回明确状态和 null，不返回密钥或原始平台错误。' },
  { method: 'GET', path: '/api/admin/resources', summary: '查询资源', tag: '资源', permission: 'resources:read', token: true, parameters: resourceQuery, output: page(resource) },
  { method: 'POST', path: '/api/admin/resources', summary: '新增资源', tag: '资源', permission: 'resources:create', token: true, input: json(resourceInput), output: resource, status: 201 },
  { method: 'PUT', path: '/api/admin/resources/:id', summary: '编辑资源', tag: '资源', permission: 'resources:update', token: true, input: json(resourceInput), output: outputJsonSchema(resourceUpdateSchema) as O.SchemaObject },
  { method: 'DELETE', path: '/api/admin/resources/:id', summary: '删除资源', tag: '资源', permission: 'resources:delete', token: true, status: 204 },
  { method: 'POST', path: '/api/admin/resources/batch', summary: '批量启停资源', tag: '资源', permission: 'resources:batch', token: true, input: json(inputJsonSchema(resourceBatchSchema) as O.SchemaObject), output: obj({ succeeded: arr(str), failed: arr(obj({ id: str, code: str, message: str })), updated: integer }) },
  { method: 'GET', path: '/api/admin/resources/export', summary: '导出资源 JSON', tag: '资源', permission: 'resources:export', token: true, parameters: resourceQuery, output: arr(resource), description: '最多导出 10000 项。' },
  { method: 'GET', path: '/api/admin/settings', summary: '读取应用设置', tag: '设置', permission: 'settings:read', token: true, output: savedSettings },
  { method: 'PUT', path: '/api/admin/settings', summary: '保存应用设置', tag: '设置', permission: 'settings:update', token: true, input: json(inputJsonSchema(settingsPatchSchema) as O.SchemaObject), output: savedSettings, description: '仅接收已声明的非机密设置；请求体上限 16KB。' },
  { method: 'GET', path: '/api/admin/files', summary: '查询私有文件', tag: '文件', permission: 'files:read', token: true, parameters: [query('cursor'), query('pageSize', { ...integer, minimum: 1, maximum: 100, default: 100 })], output: obj({ items: arr(file), cursor: nullable(str), maxBytes: integer }) },
  { method: 'POST', path: '/api/admin/files', summary: '上传私有文件', tag: '文件', permission: 'files:upload', token: true, input: { required: true, content: { 'multipart/form-data': { schema: obj({ file: { type: 'string', format: 'binary' } }) } } }, output: file, status: 201, description: '单文件最大 10MB。' },
  { method: 'GET', path: '/api/admin/files/download', summary: '下载私有文件', tag: '文件', permission: 'files:download', token: true, parameters: [query('key', str, true)], binary: true },
  { method: 'DELETE', path: '/api/admin/files', summary: '删除私有文件', tag: '文件', permission: 'files:delete', token: true, parameters: [query('key', str, true)], status: 204 },
  { method: 'GET', path: '/api/admin/audit', summary: '查询操作日志', tag: '操作日志', permission: 'audit:read', token: true, parameters: [pageQuery[0]!, query('action')], output: obj({ items: arr(audit), total: integer, page: integer }) },
  { method: 'GET', path: '/api/admin/audit/retention', summary: '查看日志保留策略', tag: '操作日志', permission: 'audit:read', output: retention },
  { method: 'POST', path: '/api/admin/audit/prune', summary: '清理过期操作日志', tag: '操作日志', permission: 'audit:prune', input: json(inputJsonSchema(auditPruneSchema) as O.SchemaObject), output: obj({ deleted: integer, before: stamp, batchLimit: integer }) },
  { method: 'GET', path: '/api/admin/openapi.json', summary: '下载 OpenAPI 文档', tag: 'API 中心', permission: 'api:read', output: { type: 'object', description: 'OpenAPI 3.1 文档' } },
  { method: 'GET', path: '/api/admin/api-keys', summary: '查看访问令牌', tag: 'API 中心', permission: 'api:tokens', parameters: pageQuery, output: obj({ items: arr(key), total: integer, page: integer, pageSize: integer, grantablePermissions: arr(str) }) },
  { method: 'POST', path: '/api/admin/api-keys', summary: '创建访问令牌', tag: 'API 中心', permission: 'api:issue', input: json(inputJsonSchema(apiKeyInputSchema) as O.SchemaObject), output: obj({ token: { ...str, description: '仅在此响应中显示一次，请立即保存' }, key }), status: 201 },
  { method: 'DELETE', path: '/api/admin/api-keys/:id', summary: '撤销访问令牌', tag: 'API 中心', permission: 'api:revoke', status: 204, description: '幂等撤销，保留元数据和审计记录。' },
  { method: 'POST', path: '/api/admin/echo', summary: '认证写请求探测', tag: '运行', permission: 'overview:read', token: true, output: obj({ ok: bool }) },
];
export const tokenPermissions = [...new Set(endpoints.filter((entry) => entry.token && entry.permission).map((entry) => entry.permission!))];
export function tokenEndpoint(method: string, path: string) {
  return endpoints.some((entry) => entry.token && entry.method === method && new RegExp(`^${entry.path.replace(/:[a-z]+/g, '[^/]+')}$`).test(path));
}
function errorStatuses(entry: Endpoint) {
  const result = new Set([500, 503]);
  if (entry.path === '/health') return [...result];
  result.add(401); result.add(403);
  if (entry.parameters?.length || entry.input) result.add(400);
  if (entry.token || entry.path.endsWith('/login')) result.add(429);
  if (entry.input) result.add(413);
  if (entry.path.includes(':id') || entry.path.endsWith('/download') || entry.method === 'DELETE') result.add(404);
  if (entry.input && (entry.path.includes('/resources') && !entry.path.endsWith('/batch') || entry.path.endsWith('/settings') || entry.path.endsWith('/api-keys'))) result.add(422);
  if (entry.path.endsWith('/prune')) result.add(409);
  return [...result].sort();
}
export function installApiDescriptions(app: Hono<WorkerEnv<Bindings>>, activePermissions?: readonly string[]) {
  for (const entry of endpoints) {
    const spec: DescribeRouteOptions & { 'x-permission'?: string; 'x-token-allowed': boolean } = {
      hide: !!entry.permission && !!activePermissions && !activePermissions.includes(entry.permission),
      summary: entry.summary, tags: [entry.tag], operationId: `${entry.method.toLowerCase()}_${entry.path.replace(/[^a-zA-Z0-9]+/g, '_')}`,
      description: entry.description ?? (entry.public ? '公开接口，无需身份验证。' : entry.path.startsWith('/api/admin/resources') && ['POST', 'PUT'].includes(entry.method) ? '支持 Cookie 或 Token；请求体上限 16KB，字段错误返回 422。' : entry.token ? '支持 Cookie 登录或 Bearer Token。Cookie 写操作要求同源 Origin；Token 不授予管理员会话。' : '仅支持浏览器会话；写操作要求同源 Origin。'),
      security: entry.public ? [] : entry.token ? [{ cookieAuth: [] }, { bearerAuth: [] }] : [{ cookieAuth: [] }],
      'x-permission': entry.permission, 'x-token-allowed': entry.token ?? false,
      ...(entry.input ? { requestBody: entry.input } : {}), parameters: [...(entry.parameters ?? []), ...(entry.path.includes(':id') ? [{ name: 'id', in: 'path' as const, required: true, schema: str }] : [])],
      responses: { [entry.status ?? 200]: entry.status === 204 ? { description: '成功，无响应体' } : entry.binary ? { description: '文件内容', content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } } } : response(entry.output!), ...Object.fromEntries(errorStatuses(entry).map((status) => [status, { description: `请求失败 ${status}`, content: { 'application/json': { schema: error } }, ...(status === 429 ? { headers: { 'Retry-After': { schema: str, description: '建议等待秒数' } } } : {}) }])) },
    };
    app.on(entry.method, entry.path, describeRoute(spec));
  }
}
