export class ApiClientError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly requestId?: string) {
    super(message);
    this.name = 'ApiClientError';
  }
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
      const failure = data as { error?: { code?: unknown; message?: unknown }; requestId?: unknown } | null;
      throw new ApiClientError(response.status,
        typeof failure?.error?.code === 'string' ? failure.error.code : 'request_failed',
        typeof failure?.error?.message === 'string' ? failure.error.message : '请求失败',
        typeof failure?.requestId === 'string' ? failure.requestId : undefined);
    }
    return data as T;
  };
}
