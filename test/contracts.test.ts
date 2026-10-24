import { env, exports as workersExports } from 'cloudflare:workers';
import { beforeAll, describe, expect, it } from 'vitest';
import { ApiError, createServer, readPageQuery, readCursorQuery } from '../src/server';
import { createApiClient, getFormErrors } from '../src/web/api';
import type { AdminBindings } from '../src/server';
import type { ApiFailure, BatchResult, CursorList, PageList } from '../src/contracts';

describe('bounded list queries', () => {
  const read = (query: string) => readPageQuery(new URLSearchParams(query), {
    sortFields: ['name', 'updated_at'] as const, filterFields: ['status'] as const,
    defaultSort: { field: 'updated_at', order: 'desc' },
  });
  it('reads declared filters and a stable page offset', () => {
    expect(read('page=3&pageSize=25&q=hello&status=enabled&sort=name&order=asc')).toEqual({
      page: 3, pageSize: 25, offset: 50, q: 'hello', filters: { status: 'enabled' }, sort: { field: 'name', order: 'asc' },
    });
    expect(read('')).toMatchObject({ page: 1, pageSize: 20, offset: 0, sort: { field: 'updated_at', order: 'desc' } });
  });
  it.each(['page=0', 'page=1.5', 'page=1e2', 'page=10001', 'pageSize=101', 'pageSize=', 'page=1&page=2', 'sort=name&order=DROP', 'sort=name%20DESC&order=asc', 'sort=name', 'unrecognized=1', `q=${'a'.repeat(101)}`])('rejects invalid query %s', (query) => {
    expect(() => read(query)).toThrowError(ApiError);
    try { read(query); } catch (error) { expect(error).toMatchObject({ status: 400, code: 'invalid_query' }); }
  });
  it('keeps cursor pagination separate and opaque', () => {
    expect(readCursorQuery(new URLSearchParams('cursor=a%2B%2F%3D&pageSize=2'))).toEqual({ cursor: 'a+/=', pageSize: 2 });
    for (const query of ['page=2', 'pageSize=101', 'cursor=a&cursor=b', `cursor=${'x'.repeat(2049)}`]) expect(() => readCursorQuery(new URLSearchParams(query))).toThrowError(ApiError);
    expect(() => readPageQuery(new URLSearchParams(), { defaultPageSize: 101 })).toThrow('configuration');
  });
});

describe('validation errors across the HTTP boundary', () => {
  it('preserves nested paths and groups multiple messages for form.setFields', async () => {
    const app = createServer({ log: () => {} });
    app.post('/form', () => { throw new ApiError(422, 'validation_failed', '请检查表单内容', [
      { path: ['sources', 0, 'name'], message: '名称不能为空' }, { path: ['sources', 0, 'name'], message: '名称不能重复' },
    ]); });
    const client = createApiClient({ fetcher: ((input: string | URL | Request, init?: RequestInit) => app.request(String(input), init, {})) as typeof fetch });
    try { await client('/form', { method: 'POST' }); throw new Error('Expected failure'); }
    catch (error) {
      expect(error).toMatchObject({ status: 422, code: 'validation_failed', requestId: expect.any(String) });
      expect(getFormErrors(error)).toEqual([{ name: ['sources', 0, 'name'], errors: ['名称不能为空', '名称不能重复'] }]);
    }
  });
  it('does not expose server internals as field errors or map auth errors into a form', async () => {
    const app = createServer({ log: () => {} });
    app.get('/failure', () => { throw new ApiError(500, 'storage_failure', 'private', [{ path: ['secret'], message: 'private' }]); });
    const response = await app.request('/failure', {}, {});
    expect(JSON.stringify(await response.json())).not.toContain('private');
    const client = createApiClient({ fetcher: (async () => Response.json({ error: { code: 'unauthorized', message: '请先登录', fields: [{ path: ['name'], message: 'ignored' }] } }, { status: 401, headers: { 'X-Request-Id': 'header-id' } })) as typeof fetch });
    try { await client('/form'); } catch (error) { expect(getFormErrors(error)).toEqual([]); expect(error).toMatchObject({ requestId: 'header-id' }); }
  });
  it('ignores malformed or unsafe field paths in a response', async () => {
    const client = createApiClient({ fetcher: (async () => Response.json({ error: { code: 'validation_failed', message: 'invalid', fields: [
      null, { path: [], message: 'empty' }, { path: ['__proto__'], message: 'unsafe' }, { path: ['items', -1], message: 'negative' },
      { path: 'name', message: 'not an array' }, { path: ['name'], message: ['not text'] }, { path: ['name'], message: '有效错误' },
    ] } }, { status: 422 })) as typeof fetch });
    try { await client('/form'); } catch (error) { expect(getFormErrors(error)).toEqual([{ name: ['name'], errors: ['有效错误'] }]); }
  });
});

describe('dashboard contract using real D1 and R2', () => {
  const origin = 'https://contracts.example';
  let cookie = '';
  beforeAll(async () => {
    const bindings = env as unknown as AdminBindings;
    const response = await workersExports.default.fetch(`${origin}/api/auth/login`, {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': crypto.randomUUID() },
      body: JSON.stringify({ username: bindings.ADMIN_USERNAME, password: bindings.ADMIN_PASSWORD }),
    });
    cookie = response.headers.get('Set-Cookie')!.split(';')[0]!;
  });
  const request = (path: string, method = 'GET', body?: unknown) => workersExports.default.fetch(`${origin}/api/admin${path}`, {
    method, headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
  });
  const values = (name: string) => ({ name, kind: '配置', status: 'enabled', address: '', description: '' });
  it('filters, sorts and pages data with an accurate total', async () => {
    for (const name of ['contract-list-B', 'contract-list-A', 'contract-list-C']) expect((await request('/resources', 'POST', values(name))).status).toBe(201);
    const response = await request('/resources?q=contract-list-&status=enabled&sort=name&order=asc&page=2&pageSize=1');
    expect(response.status).toBe(200);
    const result = await response.json<PageList<{ name: string }>>();
    expect(result).toMatchObject({ total: 3, page: 2, pageSize: 1 });
    expect(result.items.map((item) => item.name)).toEqual(['contract-list-B']);
    expect((await request('/resources?sort=name%3BDROP%20TABLE%20resources&order=asc')).status).toBe(400);
    expect((await request('/resources?status=unknown')).status).toBe(400);
  });
  it('returns field errors without persisting invalid resources', async () => {
    const response = await request('/resources', 'POST', { ...values(''), address: 'ftp://invalid' });
    expect(response.status).toBe(422);
    const result = await response.json<ApiFailure>();
    expect(result.error.code).toBe('validation_failed');
    expect(result.error.fields?.map((issue) => issue.path)).toEqual([['name'], ['address']]);
    expect(result.requestId).toBe(response.headers.get('X-Request-Id'));
  });
  it('reports missing IDs and only counts actually updated rows', async () => {
    const created = await (await request('/resources', 'POST', values('contract-batch'))).json<{ id: string }>();
    const response = await request('/resources/batch', 'POST', { ids: [created.id, 'missing-id', created.id], status: 'disabled' });
    const result = await response.json<BatchResult & { updated: number }>();
    expect(result).toEqual({ succeeded: [created.id], failed: [{ id: 'missing-id', code: 'resource_not_found', message: '资源不存在或已被删除' }], updated: 1 });
    expect(await (await request('/resources?q=contract-batch&status=disabled')).json()).toMatchObject({ total: 1 });
  });
  it('walks R2 cursors without a made-up total and bounds the requested page size', async () => {
    const keys: string[] = [];
    for (let index = 0; index < 3; index++) {
      const form = new FormData(); form.set('file', new File(['contract'], `contract-${index}.txt`));
      const response = await workersExports.default.fetch(`${origin}/api/admin/files`, { method: 'POST', headers: { Cookie: cookie, Origin: origin }, body: form });
      expect(response.status).toBe(201); keys.push((await response.json<{ key: string }>()).key);
    }
    const seen: string[] = []; let cursor: string | null = null;
    for (let page = 0; page < 20; page++) {
      const response = await request(`/files?pageSize=1${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
      expect(response.status).toBe(200);
      const result = await response.json<CursorList<{ key: string }>>();
      expect(result).not.toHaveProperty('total'); expect(result.items.length).toBeLessThanOrEqual(1);
      seen.push(...result.items.map((item) => item.key)); cursor = result.cursor;
      if (!cursor) break;
    }
    expect(cursor).toBeNull(); expect(new Set(seen).size).toBe(seen.length);
    for (const key of keys) expect(seen).toContain(key);
    expect((await request('/files?pageSize=1000')).status).toBe(400);
  });
});
