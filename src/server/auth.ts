import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { timingSafeEqual } from 'hono/utils/buffer';
import type { Context, MiddlewareHandler } from 'hono';
import { ApiError } from './app';
import type { WorkerEnv } from './app';

export interface LoginRateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface AdminBindings {
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
  ADMIN_SESSION_SECRET: string;
  ADMIN_LOGIN_RATE_LIMITER: LoginRateLimiter;
}

interface Session { user: string; expiresAt: number }

/** Require an explicit same-origin browser mutation. GETs are not affected. */
export function requireSameOrigin(request: Request): void {
  if (request.headers.get('Origin') !== new URL(request.url).origin) {
    throw new ApiError(403, 'invalid_origin', '请求来源无效');
  }
}

/** Single administrator only. Applications opt into protection per route. */
export function createAdminAuth<Bindings extends AdminBindings>(options: {
  cookieName?: string;
  sessionSeconds?: number;
  now?: () => number;
  /** Only applies to HTTP loopback requests, never public HTTPS deployments. */
  allowWeakLocalPassword?: boolean;
} = {}) {
  const cookieName = options.cookieName ?? 'workerkit_session';
  const sessionSeconds = options.sessionSeconds ?? 12 * 60 * 60;
  const now = options.now ?? Date.now;
  if (!Number.isInteger(sessionSeconds) || sessionSeconds < 1 || sessionSeconds > 30 * 24 * 60 * 60) {
    throw new Error('sessionSeconds must be between 1 and 2592000');
  }
  type C = Context<WorkerEnv<Bindings>>;

  function settings(c: C) {
    const env = c.env;
    const url = new URL(c.req.url);
    const localPreview = url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    const minimumLength = options.allowWeakLocalPassword && localPreview ? 1 : 12;
    if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < minimumLength ||
        !env.ADMIN_SESSION_SECRET || env.ADMIN_SESSION_SECRET.length < 32 || !env.ADMIN_LOGIN_RATE_LIMITER) {
      throw new ApiError(503, 'auth_unconfigured', '管理员认证未配置');
    }
    const secure = url.protocol === 'https:';
    if (!secure && !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
      throw new ApiError(503, 'https_required', '管理员认证需要 HTTPS');
    }
    // Hono performs HMAC signing. Changing either credential invalidates all old cookies.
    const key = JSON.stringify([env.ADMIN_SESSION_SECRET, env.ADMIN_USERNAME, env.ADMIN_PASSWORD]);
    return { env, secure, key };
  }

  async function readSession(c: C): Promise<Session | null> {
    const { key, env } = settings(c);
    let value: string | false | undefined;
    try { value = await getSignedCookie(c, key, cookieName); }
    catch { return null; }
    if (!value || value.length > 2048) return null;
    try {
      const data: unknown = JSON.parse(value);
      if (!data || typeof data !== 'object') return null;
      const session = data as Partial<Session>;
      if (session.user !== env.ADMIN_USERNAME || typeof session.expiresAt !== 'number' ||
          !Number.isSafeInteger(session.expiresAt) || session.expiresAt <= Math.floor(now() / 1000)) return null;
      return session as Session;
    } catch { return null; }
  }

  const requireAdmin = createMiddleware<WorkerEnv<Bindings>>(async (c, next) => {
    c.header('Cache-Control', 'no-store');
    const session = await readSession(c);
    if (!session) throw new ApiError(401, 'unauthorized', '请先登录');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) requireSameOrigin(c.req.raw);
    c.set('adminUser', session.user);
    await next();
  });

  const routes = new Hono<WorkerEnv<Bindings>>();
  routes.use('*', async (c, next) => { c.header('Cache-Control', 'no-store'); await next(); });
  const loginBodyLimit: MiddlewareHandler<WorkerEnv<Bindings>> = bodyLimit({ maxSize: 4096, onError: () => { throw new ApiError(413, 'body_too_large', '请求过大'); } });
  routes.post('/login', loginBodyLimit, async (c: C) => {
    requireSameOrigin(c.req.raw);
    const { env, secure, key } = settings(c);
    // CF supplies this header in production. Local requests share a local bucket.
    const result = await env.ADMIN_LOGIN_RATE_LIMITER.limit({ key: `login:${c.req.header('CF-Connecting-IP') ?? 'local'}` });
    if (!result.success) {
      c.header('Retry-After', '60');
      throw new ApiError(429, 'login_limited', '登录尝试过于频繁');
    }
    let body: unknown;
    try { body = await c.req.json(); }
    catch { throw new ApiError(400, 'invalid_json', '请求 JSON 无效'); }
    if (!body || typeof body !== 'object') throw new ApiError(400, 'invalid_credentials', '请填写用户名和密码');
    const { username, password } = body as Record<string, unknown>;
    if (typeof username !== 'string' || typeof password !== 'string' || username.length > 256 || password.length > 1024) {
      throw new ApiError(400, 'invalid_credentials', '请填写有效的用户名和密码');
    }
    const [userMatches, passwordMatches] = await Promise.all([
      timingSafeEqual(username, env.ADMIN_USERNAME), timingSafeEqual(password, env.ADMIN_PASSWORD),
    ]);
    if (!userMatches || !passwordMatches) throw new ApiError(401, 'invalid_credentials', '用户名或密码错误');
    const session: Session = { user: env.ADMIN_USERNAME, expiresAt: Math.floor(now() / 1000) + sessionSeconds };
    await setSignedCookie(c, cookieName, JSON.stringify(session), key, {
      httpOnly: true, secure, sameSite: 'Strict', path: '/', maxAge: sessionSeconds,
    });
    return c.json(session);
  });
  routes.get('/session', requireAdmin, async (c: C) => c.json(await readSession(c)));
  routes.post('/logout', (c) => {
    requireSameOrigin(c.req.raw);
    const { secure } = settings(c);
    deleteCookie(c, cookieName, { path: '/', httpOnly: true, secure, sameSite: 'Strict' });
    return c.body(null, 204);
  });

  return { routes, requireAdmin };
}
