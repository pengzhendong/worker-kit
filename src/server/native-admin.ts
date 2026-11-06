import { bodyLimit } from 'hono/body-limit';
import { createServer, ApiError } from './app';
import { createKvAdminAuth } from './kv-auth';
import {
  createManagementRoutes,
  adminManagementPermissions,
} from './management';
import { createOperationsRoutes } from './operations';
import type { SettingsValues } from './settings';
import type { inspectRuntime } from './runtime';

/** Optional single-administrator composition. CMS hosts keep their own authentication. */
export function createNativeAdmin<E extends object>(options: {
  store(env: E): KVNamespace;
  username(env: E): string;
  password(env: E): string | undefined;
  rateLimit(env: E, request: Request): Promise<boolean>;
  cookieName: string;
  prefix?: string;
  apiRoot: string;
  runtime(env: E): Parameters<typeof inspectRuntime>[0];
  settings: SettingsValues;
  backend?: string;
  tasks?(env: E): Pick<Fetcher, 'fetch'>;
}) {
  const prefix = options.prefix ?? 'workerkit:native:';
  const auth = createKvAdminAuth({
    cookieName: options.cookieName,
    keyPrefix: prefix + 'session:',
    authScope: options.cookieName,
    sessionSeconds: 43200,
  });
  const app = createServer<E>();
  const user = (env: E) => options.username(env) || 'admin';
  const password = (env: E) => options.password(env) || '';
  const isAuthenticated = (request: Request, env: E) =>
    auth.isAuthenticated(request, options.store(env), user(env), password(env));
  const principal = async (c: { req: { raw: Request }; env: E }) =>
    (await isAuthenticated(c.req.raw, c.env))
      ? {
          id: user(c.env),
          name: user(c.env),
          permissions: [...adminManagementPermissions],
        }
      : null;
  const management = createManagementRoutes<E>({
    ...options,
    prefix,
    sessionHours: 12,
    principal,
    tasks: !!options.tasks,
    runtime: (c) => options.runtime(c.env),
  });
  const audit = (env: E, action: string, target: string) =>
    management.audit(env, action, target, user(env));
  app.use('*', bodyLimit({ maxSize: 16384 }));
  app.use('*', async (c, next) => {
    c.header('Cache-Control', 'no-store');
    if (!password(c.env))
      throw new ApiError(503, 'not_configured', '管理员凭据未配置');
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(c.req.method) &&
      !auth.isSameOrigin(c.req.raw)
    )
      throw new ApiError(403, 'origin_mismatch', '请求来源不符');
    await next();
  });
  app.post('/auth/login', async (c) => {
    if (!(await options.rateLimit(c.env, c.req.raw)))
      throw new ApiError(429, 'rate_limited', '登录过于频繁，请稍后重试');
    let input: unknown;
    try {
      input = await c.req.json();
    } catch {
      throw new ApiError(400, 'invalid_json', '请求 JSON 无效');
    }
    const value = input as Record<string, unknown> | null;
    if (
      typeof value?.username !== 'string' ||
      typeof value?.password !== 'string' ||
      !(await auth.verifyCredentials(
        value.username,
        value.password,
        user(c.env),
        password(c.env),
      ))
    )
      throw new ApiError(401, 'invalid_credentials', '用户名或密码错误');
    c.header(
      'Set-Cookie',
      await auth.createSession(
        options.store(c.env),
        user(c.env),
        password(c.env),
        c.req.raw,
      ),
    );
    await audit(c.env, 'session.login', 'current');
    return c.json({ username: user(c.env) });
  });
  app.use('/auth/*', async (c, next) => {
    if (!(await isAuthenticated(c.req.raw, c.env)))
      throw new ApiError(401, 'unauthorized', '请先登录');
    await next();
  });
  app.get('/auth/session', (c) => c.json({ username: user(c.env) }));
  app.post('/auth/logout', async (c) => {
    c.header(
      'Set-Cookie',
      await auth.deleteSession(c.req.raw, options.store(c.env)),
    );
    await audit(c.env, 'session.logout', 'current');
    return c.json({ ok: true });
  });
  if (options.tasks)
    app.route(
      '/',
      createOperationsRoutes<E>({
        backend: options.backend ?? 'native',
        principal,
        tasks: (c) => options.tasks!(c.env),
        runtime: (c) => options.runtime(c.env),
        management: { service: management },
      }),
    );
  else app.route('/', management.routes);
  return { routes: app, isAuthenticated, audit };
}
