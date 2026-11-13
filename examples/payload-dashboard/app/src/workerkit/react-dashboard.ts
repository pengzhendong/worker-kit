import { createDashboard } from '../../../../dashboard/server';
import type { Bindings } from '../../../../dashboard/server';

const base = '/dashboard';
const dashboard = createDashboard({ apiBase: base });
const demoDashboard = createDashboard({ apiBase: base, publicDemo: true });

type DashboardEnv = Pick<CloudflareEnv,
  'ASSETS' | 'DASHBOARD_DB' | 'DASHBOARD_SETTINGS' | 'DASHBOARD_FILES'
  | 'DASHBOARD_LOGIN_RATE_LIMITER' | 'DASHBOARD_API_KEY_RATE_LIMITER'> & {
  WORKERKIT_DEMO?: string;
  DASHBOARD_ADMIN_PASSWORD?: string;
  DASHBOARD_SESSION_SECRET?: string;
};

export async function serveDashboard(request: Request, env: DashboardEnv, ctx: ExecutionContext) {
  const url = new URL(request.url);
  if (url.pathname.startsWith(base + '/api/')) {
    url.pathname = url.pathname.slice(base.length);
    const bindings: Bindings = {
      ADMIN_USERNAME: 'admin',
      ADMIN_PASSWORD: env.DASHBOARD_ADMIN_PASSWORD ?? '',
      ADMIN_SESSION_SECRET: env.DASHBOARD_SESSION_SECRET ?? '',
      ADMIN_LOGIN_RATE_LIMITER: env.DASHBOARD_LOGIN_RATE_LIMITER,
      API_KEY_RATE_LIMITER: env.DASHBOARD_API_KEY_RATE_LIMITER,
      DB: env.DASHBOARD_DB,
      SETTINGS: env.DASHBOARD_SETTINGS,
      FILES: env.DASHBOARD_FILES,
    };
    const app = env.WORKERKIT_DEMO === '1' ? demoDashboard : dashboard;
    return app.fetch(new Request(url, request), bindings, ctx);
  }
  if (['/compat', '/pro-layout', '/showcase', '/showcase/'].includes(url.pathname)) {
    url.pathname = url.pathname.startsWith('/showcase') ? '/' : url.pathname + '/';
    return Response.redirect(url.href, 302);
  }
  if (!['/pro-layout/', '/compat/'].includes(url.pathname)) return undefined;
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  url.pathname = url.pathname === '/compat/' ? base + '/compat/index.html' : base + '/index.html';
  if (!env.ASSETS) return new Response('Static assets unavailable', { status: 503 });
  const response = await env.ASSETS.fetch(new Request(url, request));
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');
  return new Response(response.body, { status: response.status, headers });
}
