import type { FieldIssue } from '../contracts';

export class ApiClientError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly requestId?: string, public readonly fields: FieldIssue[] = []) {
    super(message);
    this.name = 'ApiClientError';
  }
}

function readFields(value: unknown): FieldIssue[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).flatMap((issue: unknown) => {
    if (!issue || typeof issue !== 'object') return [];
    const { path, message } = issue as Record<string, unknown>;
    if (!Array.isArray(path) || !path.length || path.length > 20 || !path.every((part) =>
      (typeof part === 'string' && part.length > 0 && part.length <= 100 && !['__proto__', 'prototype', 'constructor'].includes(part))
      || (typeof part === 'number' && Number.isSafeInteger(part) && part >= 0))
      || typeof message !== 'string' || !message.length || message.length > 1000) return [];
    return [{ path: path as (string | number)[], message }];
  });
}

/** Compatible with Ant Design form.setFields; leaves authentication and global errors to the caller. */
export function getFormErrors(error: unknown): { name: (string | number)[]; errors: string[] }[] {
  if (!(error instanceof ApiClientError) || ![400, 422].includes(error.status)) return [];
  const fields = new Map<string, { name: (string | number)[]; errors: string[] }>();
  for (const issue of error.fields) {
    const key = JSON.stringify(issue.path);
    const field = fields.get(key) ?? { name: issue.path, errors: [] };
    field.errors.push(issue.message);
    fields.set(key, field);
  }
  return [...fields.values()];
}

export function createApiClient(options: { baseUrl?: string; fetcher?: typeof fetch } = {}) {
  const fetcher = options.fetcher ?? globalThis.fetch;
  const baseUrl = (options.baseUrl ?? '').replace(/\/$/, '');
  return async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!path.startsWith('/') || path.startsWith('//')) throw new Error('API path must start with a single slash');
    const response = await fetcher(`${baseUrl}${path}`, { credentials: 'same-origin', cache: 'no-store', ...init });
    if (response.status === 204) return undefined as T;
    let data: unknown;
    try { data = await response.json(); }
    catch { throw new ApiClientError(response.status, 'invalid_response', '服务器返回了无效响应', response.headers.get('X-Request-Id') ?? undefined); }
    if (!response.ok) {
      const failure = data as { error?: { code?: unknown; message?: unknown; fields?: unknown }; requestId?: unknown } | null;
      throw new ApiClientError(response.status,
        typeof failure?.error?.code === 'string' ? failure.error.code : 'request_failed',
        typeof failure?.error?.message === 'string' ? failure.error.message : '请求失败',
        typeof failure?.requestId === 'string' ? failure.requestId : response.headers.get('X-Request-Id') ?? undefined,
        readFields(failure?.error?.fields));
    }
    return data as T;
  };
}
