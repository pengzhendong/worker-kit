import type { TaskNamespace } from '@pengzhendong/worker-kit/operations';
export { WorkerKitNativeTasks } from './tasks';
import { Hono } from 'hono';
import { createNativeAdmin } from '@pengzhendong/worker-kit/native';
export type NativeBindings = {
  TASKS: TaskNamespace;
  ASSETS?: Fetcher;
  NATIVE_STORE: KVNamespace;
  NATIVE_LOGIN_RATE_LIMITER: RateLimit;
  NATIVE_ADMIN_PASSWORD?: string;
  NATIVE_ADMIN_USERNAME?: string;
};
export const nativeAdmin = createNativeAdmin<NativeBindings>({
  store: (env) => env.NATIVE_STORE,
  username: (env) => env.NATIVE_ADMIN_USERNAME || 'admin',
  password: (env) => env.NATIVE_ADMIN_PASSWORD,
  rateLimit: async (env, request) =>
    !!env.NATIVE_LOGIN_RATE_LIMITER &&
    (
      await env.NATIVE_LOGIN_RATE_LIMITER.limit({
        key: request.headers.get('CF-Connecting-IP') || 'local',
      })
    ).success,
  backend: 'native',
  tasks: (env) => env.TASKS.get(env.TASKS.idFromName('native')),
  cookieName: 'workerkit_native',
  apiRoot: '/native/api',
  settings: { siteTitle: 'WorkerKit', refreshSeconds: 30, maintenance: false },
  runtime: (env) => ({
    application: { name: 'WorkerKit Native', version: '0.4.0' },
    environment: 'cloudflare',
    checks: [
      {
        name: 'KV',
        kind: 'kv',
        description: '配置、会话与受限令牌',
        check: () => env.NATIVE_STORE.get('__health__'),
      },
    ],
  }),
});
const app = new Hono<{ Bindings: NativeBindings }>().route(
  '/native/api',
  nativeAdmin.routes,
);
export async function serveNative(
  request: Request,
  env: NativeBindings,
  ctx: ExecutionContext,
): Promise<Response | undefined> {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/management-assets/')) {
    if (!['GET', 'HEAD'].includes(request.method))
      return new Response(null, { status: 405 });
    url.pathname =
      '/native/assets/' + url.pathname.slice('/management-assets/'.length);
    return (
      env.ASSETS?.fetch(new Request(url, request)) ??
      new Response('Static assets unavailable', { status: 503 })
    );
  }
  if (!url.pathname.startsWith('/native')) return undefined;
  if (url.pathname.startsWith('/native/api/'))
    return app.fetch(request, env, ctx);
  if (!['GET', 'HEAD'].includes(request.method))
    return new Response(null, { status: 405 });
  if (url.pathname === '/native') {
    url.pathname += '/';
    return Response.redirect(url.href, 308);
  }
  if (url.pathname === '/native/' || url.pathname === '/native/reference')
    url.pathname =
      url.pathname === '/native/'
        ? '/native/index.html'
        : '/native/reference.html';
  if (!env.ASSETS)
    return new Response('Static assets unavailable', { status: 503 });
  const response = await env.ASSETS.fetch(new Request(url, request));
  if (!(response.headers.get('Content-Type') || '').includes('text/html'))
    return response;
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'",
  );
  return new Response(response.body, { status: response.status, headers });
}
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/')
      return Response.redirect(new URL('/native/', url).href, 302);
    return (
      (await serveNative(request, env, ctx)) ??
      new Response('Not found', { status: 404 })
    );
  },
} satisfies ExportedHandler<NativeBindings>;
