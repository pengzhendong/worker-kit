import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { timingSafeEqual } from 'hono/utils/buffer';
import type { Context, MiddlewareHandler } from 'hono';
import { ApiError } from './app';
import {hashAdminPassword, verifyAdminPassword} from './password-store';
import type {AdminPasswordStore} from './password-store';
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
  minimumPasswordLength?: number;
  passwordStore?: (bindings: Bindings) => AdminPasswordStore;
} = {}) {
  const cookieName = options.cookieName ?? 'workerkit_session';
  const sessionSeconds = options.sessionSeconds ?? 12 * 60 * 60;
  const now = options.now ?? Date.now;
  if (!Number.isInteger(sessionSeconds) || sessionSeconds < 1 || sessionSeconds > 30 * 24 * 60 * 60) {
    throw new Error('sessionSeconds must be between 1 and 2592000');
  }
  const minimumPasswordLength = options.minimumPasswordLength ?? 12;
  if (!Number.isInteger(minimumPasswordLength) || minimumPasswordLength < 8 || minimumPasswordLength > 1024) throw new Error('minimumPasswordLength must be between 8 and 1024');
  type C = Context<WorkerEnv<Bindings>>;

  async function settings(c: C) {
    const env = c.env;
    const url = new URL(c.req.url);
    const localPreview = url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    const minimumLength = options.allowWeakLocalPassword && localPreview ? 1 : minimumPasswordLength;
    if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < minimumLength ||
        !env.ADMIN_SESSION_SECRET || env.ADMIN_SESSION_SECRET.length < 32 || !env.ADMIN_LOGIN_RATE_LIMITER) {
      throw new ApiError(503, 'auth_unconfigured', '管理员认证未配置');
    }
    const secure = url.protocol === 'https:';
    if (!secure && !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
      throw new ApiError(503, 'https_required', '管理员认证需要 HTTPS');
    }
    // Hono performs HMAC signing. Changing either credential invalidates all old cookies.
    const store = options.passwordStore?.(env);
    const passwordHash = store ? await store.read() : null;
    const key = JSON.stringify([env.ADMIN_SESSION_SECRET, env.ADMIN_USERNAME, env.ADMIN_PASSWORD, ...(options.passwordStore ? [passwordHash] : [])]);
    return { env, secure, key, store, passwordHash };
  }

  async function readSession(c: C): Promise<Session | null> {
    const { key, env } = await settings(c);
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
    const { env, secure, key, passwordHash } = await settings(c);
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
      timingSafeEqual(username, env.ADMIN_USERNAME), passwordHash ? verifyAdminPassword(password, passwordHash) : timingSafeEqual(password, env.ADMIN_PASSWORD),
    ]);
    if (!userMatches || !passwordMatches) throw new ApiError(401, 'invalid_credentials', '用户名或密码错误');
    const session: Session = { user: env.ADMIN_USERNAME, expiresAt: Math.floor(now() / 1000) + sessionSeconds };
    await setSignedCookie(c, cookieName, JSON.stringify(session), key, {
      httpOnly: true, secure, sameSite: 'Strict', path: '/', maxAge: sessionSeconds,
    });
    return c.json(session);
  });
  routes.get('/session', requireAdmin, async (c: C) => c.json(await readSession(c)));
  if (options.passwordStore) routes.post('/password', loginBodyLimit, requireAdmin, async (c: C) => {
    const {env, store, passwordHash, secure} = await settings(c);
    const limited = await env.ADMIN_LOGIN_RATE_LIMITER.limit({key: `password:${c.req.header('CF-Connecting-IP') ?? 'local'}:${env.ADMIN_USERNAME}`});
    if (!limited.success) {c.header('Retry-After','60');throw new ApiError(429,'password_limited','修改尝试过于频繁，请稍后再试');}
    let body: unknown;
    try {body = await c.req.json();} catch {throw new ApiError(400,'invalid_json','请求 JSON 无效');}
    const {currentPassword, newPassword} = (body && typeof body === 'object' ? body : {}) as Record<string,unknown>;
    if (typeof currentPassword !== 'string' || currentPassword.length > 1024 || typeof newPassword !== 'string' || newPassword.length < minimumPasswordLength || newPassword.length > 1024) throw new ApiError(422,'invalid_password',`新密码须为 ${minimumPasswordLength}–1024 个字符`);
    if (!(passwordHash ? await verifyAdminPassword(currentPassword,passwordHash) : await timingSafeEqual(currentPassword,env.ADMIN_PASSWORD))) throw new ApiError(422,'wrong_password','旧密码不正确');
    if (currentPassword === newPassword) throw new ApiError(422,'unchanged_password','新密码不能与旧密码相同');
    if (!await store!.replace(passwordHash,await hashAdminPassword(newPassword))) throw new ApiError(409,'password_changed','密码已发生变化，请重新登录');
    deleteCookie(c,cookieName,{path:'/',httpOnly:true,secure,sameSite:'Strict'});
    return c.body(null,204);
  });
  routes.post('/logout', async (c) => {
    requireSameOrigin(c.req.raw);
    const { secure } = await settings(c);
    deleteCookie(c, cookieName, { path: '/', httpOnly: true, secure, sameSite: 'Strict' });
    return c.body(null, 204);
  });

  return { routes, requireAdmin };
}
