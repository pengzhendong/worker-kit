import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { ApiFailure, FieldIssue } from '../contracts';

export type WorkerEnv<Bindings extends object = Record<string, unknown>> = {
  Bindings: Bindings;
  Variables: { requestId: string; adminUser?: string };
};

export class ApiError extends Error {
  constructor(
    public readonly status: ContentfulStatusCode,
    public readonly code: string,
    message: string,
    public readonly fields?: FieldIssue[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RequestLog {
  event: 'request';
  requestId: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
}

export function createServer<Bindings extends object>(options: {
  log?: (entry: RequestLog) => void;
} = {}) {
  const app = new Hono<WorkerEnv<Bindings>>();
  // Generate our own ID rather than logging an arbitrary user-supplied header.
  app.use('*', requestId({ headerName: '', generator: () => crypto.randomUUID() }));
  app.use('*', secureHeaders());
  app.use('*', async (c, next) => {
    const started = performance.now();
    await next();
    c.header('X-Request-Id', c.get('requestId'));
    const entry: RequestLog = {
      event: 'request', requestId: c.get('requestId'), method: c.req.method,
      path: new URL(c.req.url).pathname, status: c.res.status,
      durationMs: Math.round(performance.now() - started),
    };
    try { (options.log ?? ((record) => console.log(JSON.stringify(record))))(entry); }
    catch { console.error(JSON.stringify({ event: 'log_sink_failed', requestId: c.get('requestId') })); }
  });
  app.onError((error, c) => {
    const status = error instanceof ApiError || error instanceof HTTPException ? error.status : 500;
    const code = error instanceof ApiError ? error.code : status < 500 ? 'request_failed' : 'internal_error';
    // Error messages, URLs, bodies and bindings may contain credentials.
    if (status >= 500) console.error(JSON.stringify({ event: 'request_error', code, requestId: c.get('requestId') }));
    c.header('Cache-Control', 'no-store');
    const fields = status < 500 && error instanceof ApiError && error.fields?.length ? error.fields : undefined;
    return c.json({ error: { code, message: status < 500 ? error.message : '服务暂时不可用', ...(fields ? { fields } : {}) }, requestId: c.get('requestId') } satisfies ApiFailure, status);
  });
  app.notFound((c) => c.json({ error: { code: 'not_found', message: '接口不存在' }, requestId: c.get('requestId') }, 404));
  return app;
}
