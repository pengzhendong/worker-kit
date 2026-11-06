import { bodyLimit } from 'hono/body-limit';
import type { Context } from 'hono';
import { ApiError, createServer, type WorkerEnv } from './app';
import { requireSameOrigin } from './auth';
import { inspectRuntime } from './runtime';

export type OperationsPrincipal = { id: string; name: string; permissions: readonly string[] };
export interface OperationsOptions<E extends object> {
  backend: string;
  principal(c: Context<WorkerEnv<E>>): Promise<OperationsPrincipal | null> | OperationsPrincipal | null;
  tasks(c: Context<WorkerEnv<E>>): Pick<Fetcher, 'fetch'>;
  runtime(c: Context<WorkerEnv<E>>): Parameters<typeof inspectRuntime>[0];
}

/** Compose below the host's native authentication. No user store or login implementation. */
export function createOperationsRoutes<E extends object>(options: OperationsOptions<E>) {
  const app = createServer<E>();
  // Reuse the principal already checked for this request. A new Hono context
  // still resolves live permissions; nothing is cached across requests.
  const authenticated = new WeakMap<Context<WorkerEnv<E>>, OperationsPrincipal>();
  const taskRequest = (path: string, request?: Request) => {
    const headers = new Headers({ 'X-WorkerKit-Backend': options.backend });
    if (request?.headers.has('Content-Type')) headers.set('Content-Type', request.headers.get('Content-Type')!);
    return new Request(new Request('https://tasks.internal/api/managed-tasks' + path, request), { headers });
  };
  app.use('/managed-tasks', bodyLimit({ maxSize: 8192 }));
  app.use('/managed-tasks/*', bodyLimit({ maxSize: 8192 }));
  app.use('*', async (c, next) => {
    const path = new URL(c.req.url).pathname;
    if (!path.endsWith('/workspace') && !path.includes('/managed-tasks')) return next();
    c.header('Cache-Control', 'no-store');
    const user = await options.principal(c);
    if (!user) throw new ApiError(401, 'unauthorized', '请先登录');
    const write = !['GET', 'HEAD', 'OPTIONS'].includes(c.req.method);
    if (write) requireSameOrigin(c.req.raw);
    if (!user.permissions.includes(write ? 'tasks:manage' : 'tasks:read')) throw new ApiError(403, 'forbidden', '没有执行此操作的权限');
    authenticated.set(c, user);
    await next();
  });
  const inventory = async (c: Context<WorkerEnv<E>>) => {
    const response = await options.tasks(c).fetch(taskRequest(''));
    if (!response.ok) throw new ApiError(503, 'tasks_unavailable', '任务服务暂时不可用');
    return response.json() as Promise<{ definitions: unknown[]; plans: unknown[]; runs: unknown[] }>;
  };
  app.get('/workspace', async c => {
    const user = authenticated.get(c);
    if (!user) throw new ApiError(401, 'unauthorized', '请先登录');
    const [tasks, runtime] = await Promise.all([inventory(c), inspectRuntime(options.runtime(c))]);
    return c.json({ backend: options.backend, user, runtime, ...tasks });
  });
  app.get('/managed-tasks', async c => c.json(await inventory(c)));
  const actions = new Set(['', '/edit', '/run', '/preview', '/pause', '/resume']);
  app.post('/managed-tasks/*', async c => {
    const suffix = new URL(c.req.url).pathname.split('/managed-tasks')[1];
    if (!actions.has(suffix)) throw new ApiError(404, 'not_found', '操作不存在');
    return options.tasks(c).fetch(taskRequest(suffix, c.req.raw));
  });
  app.post('/managed-tasks', c => options.tasks(c).fetch(taskRequest('', c.req.raw)));
  return app;
}
