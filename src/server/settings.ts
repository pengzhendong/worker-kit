import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { Context, MiddlewareHandler } from 'hono';
import { ApiError } from './app';
import type { WorkerEnv } from './app';

export type SettingValue = string | number | boolean;
export type SettingsValues = Record<string, SettingValue>;

/** Mount behind application authentication. Stores non-secret settings only. */
export function createSettingsRoutes<B extends object>(options: {
  store: (bindings: B) => KVNamespace;
  defaults: SettingsValues;
  key?: string;
  onChange?: (context: Context<WorkerEnv<B>>, event: { action: string; target: string }) => Promise<void>;
}) {
  const app = new Hono<WorkerEnv<B>>();
  type C = Context<WorkerEnv<B>>;
  const key = options.key ?? 'workerkit:settings';
  const limit: MiddlewareHandler<WorkerEnv<B>> = bodyLimit({ maxSize: 16_384, onError: () => { throw new ApiError(413, 'body_too_large', '设置内容过大'); } });
  async function read(c: C) {
    const stored = await options.store(c.env).get<{ values: SettingsValues; updatedAt: string }>(key, 'json');
    return stored ?? { values: { ...options.defaults }, updatedAt: null };
  }
  app.get('/', async (c: C) => c.json(await read(c)));
  app.put('/', limit, async (c: C) => {
    let input: unknown;
    try { input = await c.req.json(); } catch { throw new ApiError(400, 'invalid_json', '请求 JSON 无效'); }
    const values = input && typeof input === 'object' ? (input as { values?: unknown }).values : null;
    if (!values || typeof values !== 'object' || Array.isArray(values)) throw new ApiError(400, 'invalid_settings', '设置格式无效');
    const patch = values as Record<string, unknown>;
    for (const [name, value] of Object.entries(patch)) {
      if (!Object.hasOwn(options.defaults, name) || typeof value !== typeof options.defaults[name] ||
          (typeof value === 'string' && value.length > 2000) ||
          (typeof value === 'number' && (!Number.isFinite(value) || value < 0 || value > 10000))) {
        throw new ApiError(400, 'invalid_settings', `设置项 ${name.slice(0, 40)} 无效`);
      }
    }
    const previous = await read(c);
    const result = { values: { ...options.defaults, ...previous.values, ...patch } as SettingsValues, updatedAt: new Date().toISOString() };
    await options.store(c.env).put(key, JSON.stringify(result));
    await options.onChange?.(c, { action: 'settings.update', target: Object.keys(patch).join(', ') });
    return c.json(result);
  });
  return app;
}
