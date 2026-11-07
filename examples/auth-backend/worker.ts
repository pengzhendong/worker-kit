import { Hono } from 'hono';
import { readBytesLimited } from '@pengzhendong/worker-kit/http';
import { bodyLimit } from 'hono/body-limit';
import {
  createManagementRoutes,
  adminManagementPermissions,
} from '@pengzhendong/worker-kit/management';
import {
  createOperationsRoutes,
  type TaskNamespace,
} from '@pengzhendong/worker-kit/operations';
export { WorkerKitAuthService } from './service';
export { WorkerKitStandardTasks } from './tasks';
export type StandardBindings = {
  ASSETS?: Fetcher;
  AUTH_DB: D1Database;
  AUTH_SERVICE: DurableObjectNamespace;
  STANDARD_TASKS: TaskNamespace;
  NATIVE_STORE: KVNamespace;
  NATIVE_LOGIN_RATE_LIMITER: RateLimit;
  STANDARD_AUTH_SECRET?: string;
  STANDARD_ADMIN_PASSWORD?: string;
  STANDARD_DEMO_MODE?: string;
};
type Session = {
  user: { id: string; name: string; username?: string; role?: string };
  session: { id: string };
};
const authFetch = (
  request: Request,
  env: StandardBindings,
  path: string,
  body?: string,
) => {
  const url = new URL(path, request.url),
    headers = new Headers(request.headers);
  headers.delete('content-length');
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  return env.AUTH_SERVICE.get(env.AUTH_SERVICE.idFromName('auth')).fetch(
    new Request(url, {
      method: body === undefined ? 'GET' : 'POST',
      headers,
      ...(body === undefined ? {} : { body }),
    }),
  );
};
const principal = async (request: Request, env: StandardBindings) => {
  const response = await authFetch(request, env, '/standard/auth/get-session');
  if (!response.ok) return null;
  const value = await response.json<Session | null>();
  return value?.user && value.session
    ? {
        id: value.user.id,
        name: value.user.username || value.user.name,
        role: value.user.role || 'user',
        permissions:
          value.user.role === 'admin'
            ? [...adminManagementPermissions]
            : ['runtime:read', 'tasks:read'],
      }
    : null;
};
const runtime = (env: StandardBindings) => ({
  application: { name: 'Hono + Better Auth', version: '0.4.0' },
  environment: 'cloudflare',
  checks: [
    {
      name: 'D1',
      kind: 'database' as const,
      description: 'Better Auth 原生用户和会话',
      check: () => env.AUTH_DB.prepare('SELECT 1').first(),
    },
  ],
});
const management = createManagementRoutes<StandardBindings>({
  store: (env) => env.NATIVE_STORE,
  prefix: 'workerkit:standard:',
  apiRoot: '/standard/api',
  sessionHours: 12,
  authentication: 'Better Auth 原生 D1 会话',
  settings: { siteTitle: 'WorkerKit', refreshSeconds: 30, maintenance: false },
  tasks: true,
  principal: (c) => principal(c.req.raw, c.env),
  runtime: (c) => runtime(c.env),
});
const api = new Hono<{ Bindings: StandardBindings }>();
api.use('*', bodyLimit({ maxSize: 16384 }));
api.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(c.req.method) &&
    c.req.header('Origin') !== new URL(c.req.url).origin
  )
    return c.json(
      { error: { code: 'origin_mismatch', message: '请求来源不符' } },
      403,
    );
  await next();
});
api.post('/auth/login', async (c) => {
  const allowed = await c.env.NATIVE_LOGIN_RATE_LIMITER.limit({
    key: 'standard:' + (c.req.header('CF-Connecting-IP') || 'local'),
  });
  if (!allowed.success)
    return c.json(
      { error: { code: 'rate_limited', message: '登录过于频繁，请稍后重试' } },
      429,
    );
  const body = await c.req.text();
  const response = await authFetch(
    c.req.raw,
    c.env,
    '/standard/auth/sign-in/username',
    body,
  );
  if (!response.ok) return response;
  const result = await response.json<{ user: Session['user'] }>();
  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'application/json');
  return new Response(
    JSON.stringify({
      username: result.user.username || result.user.name,
      role: result.user.role || 'user',
    }),
    { status: response.status, headers },
  );
});
api.get('/auth/session', async (c) => {
  const user = await principal(c.req.raw, c.env);
  return user
    ? c.json({ username: user.name, role: user.role })
    : c.json({ error: { code: 'unauthorized', message: '请先登录' } }, 401);
});
api.post('/auth/logout', (c) =>
  authFetch(c.req.raw, c.env, '/standard/auth/sign-out', '{}'),
);
api.route(
  '/',
  createOperationsRoutes<StandardBindings>({
    backend: 'standard',
    principal: (c) => principal(c.req.raw, c.env),
    tasks: (c) =>
      c.env.STANDARD_TASKS.get(c.env.STANDARD_TASKS.idFromName('standard')),
    runtime: (c) => runtime(c.env),
    management: { service: management },
  }),
);
export async function serveStandard(
  request: Request,
  env: StandardBindings,
  ctx: ExecutionContext,
): Promise<Response | undefined> {
  const url = new URL(request.url);
  if (url.pathname !== '/standard' && !url.pathname.startsWith('/standard/'))
    return undefined;
  if (url.pathname.startsWith('/standard/api/')) {
    url.pathname = url.pathname.slice('/standard/api'.length);
    return api.fetch(new Request(url, request), env, ctx);
  }
  if (url.pathname.startsWith('/standard/auth/')) {
    if (
      env.STANDARD_DEMO_MODE === '1' &&
      ![
        '/standard/auth/get-session',
        '/standard/auth/sign-in/username',
        '/standard/auth/sign-out',
      ].includes(url.pathname)
    )
      return new Response(
        'Public demo identity is managed by the site operator',
        { status: 403 },
      );
    if (!['GET', 'HEAD'].includes(request.method)) {
      if (request.headers.get('Origin') !== url.origin)
        return new Response('Invalid origin', { status: 403 });
      if (
        url.pathname.startsWith('/standard/auth/sign-in/') &&
        !(
          await env.NATIVE_LOGIN_RATE_LIMITER.limit({
            key:
              'standard:' +
              (request.headers.get('CF-Connecting-IP') || 'local'),
          })
        ).success
      )
        return new Response('Too many requests', { status: 429 });
    }
    if (!['GET', 'HEAD'].includes(request.method)) {
      try {
        const bytes = await readBytesLimited(
          request.body,
          16384,
          request.signal,
        );
        request = new Request(request, {
          body: bytes.slice().buffer as ArrayBuffer,
        });
      } catch {
        return new Response('Request body too large', { status: 413 });
      }
    }
    return env.AUTH_SERVICE.get(env.AUTH_SERVICE.idFromName('auth')).fetch(
      request,
    );
  }
  if (!['GET', 'HEAD'].includes(request.method))
    return new Response(null, { status: 405 });
  if (url.pathname === '/standard')
    return Response.redirect(new URL('/standard/', url).href, 308);
  // The same native Nuxt UI frontend is selected at runtime through data-api-root.
  url.pathname =
    url.pathname === '/standard/'
      ? '/native/index.html'
      : url.pathname.replace(/^\/standard\//, '/native/');
  if (!env.ASSETS)
    return new Response('Assets not configured', { status: 503 });
  const response = await env.ASSETS.fetch(new Request(url, request));
  if (!(response.headers.get('Content-Type') || '').includes('text/html'))
    return response;
  return new HTMLRewriter()
    .on('body', {
      element: (el) => {
        el.setAttribute('data-api-root', '/standard');
        el.setAttribute('data-login-redirect', 'true');
      },
    })
    .transform(response);
}
export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (!env.ASSETS)
      return new Response('Assets not configured', { status: 503 });
    if (path === '/')
      return Response.redirect(new URL('/standard/', request.url).href, 302);
    if (
      ['GET', 'HEAD'].includes(request.method) &&
      (path.startsWith('/native/assets/') || path === '/native/favicon.svg')
    )
      return env.ASSETS.fetch(request);
    if (
      ['GET', 'HEAD'].includes(request.method) &&
      path.startsWith('/management-assets/')
    ) {
      const url = new URL(request.url);
      url.pathname = url.pathname.replace(
        '/management-assets/',
        '/native/assets/',
      );
      return env.ASSETS.fetch(new Request(url, request));
    }
    return (
      (await serveStandard(request, env, ctx)) ??
      new Response('Not found', { status: 404 })
    );
  },
} satisfies ExportedHandler<StandardBindings>;
