import type { FieldIssue } from '../contracts';
import { isRequestCancelled, requestCancelled } from './session';
import type { SessionScope } from './session';

export class ApiClientError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly requestId?: string, public readonly fields: FieldIssue[] = [], public readonly retryAfterSeconds?: number) {
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

export type ApiRequestInit = RequestInit & { responseType?: 'json' | 'blob' };
export function createApiClient(options: { baseUrl?: string; fetcher?: typeof fetch; scope?: SessionScope } = {}) {
  const fetcher = options.fetcher ?? globalThis.fetch;
  const baseUrl = (options.baseUrl ?? '').replace(/\/$/, '');
  return async function request<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
    if (!path.startsWith('/') || path.startsWith('//')) throw new Error('API path must start with a single slash');
    const started = options.scope?.version;
    const { responseType, ...requestInit } = init;
    const execute = async (signal?: AbortSignal): Promise<T> => {
      if (signal?.aborted) throw requestCancelled();
      const response = await fetcher(`${baseUrl}${path}`, { credentials: 'same-origin', cache: 'no-store', ...requestInit, ...(signal ? { signal } : {}) });
      if (signal?.aborted) throw requestCancelled();
      if (response.status === 204) return undefined as T;
      if (response.ok && responseType === 'blob') return await response.blob() as T;
      let data: unknown;
      try { data = await response.json(); }
      catch { throw new ApiClientError(response.status, 'invalid_response', '服务器返回了无效响应', response.headers.get('X-Request-Id') ?? undefined); }
      if (signal?.aborted) throw requestCancelled();
      if (!response.ok) {
        const retryHeader = response.headers.get('Retry-After');
        const retryAfter = retryHeader === null ? undefined : /^\d+$/.test(retryHeader) ? Number(retryHeader) : Math.ceil((Date.parse(retryHeader) - Date.now()) / 1000);
        const failure = data as { error?: { code?: unknown; message?: unknown; fields?: unknown }; requestId?: unknown } | null;
        throw new ApiClientError(response.status,
          typeof failure?.error?.code === 'string' ? failure.error.code : 'request_failed',
          typeof failure?.error?.message === 'string' ? failure.error.message : '请求失败',
          typeof failure?.requestId === 'string' ? failure.requestId : response.headers.get('X-Request-Id') ?? undefined,
          readFields(failure?.error?.fields), retryAfter !== undefined && Number.isFinite(retryAfter) ? Math.min(3600, Math.max(0, retryAfter)) : undefined);
      }
      return data as T;
    };
    try { return options.scope ? await options.scope.run(execute, init.signal) : await execute(init.signal ?? undefined); }
    catch (error) {
      if (!isRequestCancelled(error) && error instanceof ApiClientError && error.status === 401 && options.scope) {
        if (started === options.scope.version) options.scope.expire(started);
        throw requestCancelled();
      }
      throw error;
    }
  };
}
