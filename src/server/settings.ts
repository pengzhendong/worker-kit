import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { Context, MiddlewareHandler } from 'hono';
import { ApiError } from './app';
import type { WorkerEnv } from './app';

export type SettingValue = string | number | boolean;
export type SettingsValues = Record<string, SettingValue>;

/** Read only currently declared fields and fill defaults when an app adds a setting. */
export async function readSettingsSnapshot(
  store: KVNamespace,
  key: string,
  defaults: SettingsValues,
) {
  const stored = await store.get<{
    values?: Record<string, unknown>;
    updatedAt?: string;
  }>(key, 'json');
  const values = Object.fromEntries(
    Object.entries(defaults).map(([name, fallback]) => {
      const value = stored?.values?.[name];
      const valid =
        typeof value === typeof fallback &&
        (typeof value !== 'number' ||
          (Number.isFinite(value) && value >= 0 && value <= 10000)) &&
        (typeof value !== 'string' || value.length <= 2000);
      return [name, valid ? (value as SettingValue) : fallback];
    }),
  );
  return {
    values,
    updatedAt: typeof stored?.updatedAt === 'string' ? stored.updatedAt : null,
  };
}

/** Mount behind application authentication. Stores non-secret settings only. */
export function createSettingsRoutes<B extends object>(options: {
  store: (bindings: B) => KVNamespace;
  defaults: SettingsValues;
  key?: string;
  /** Application-owned constraints, evaluated on the merged values before persisting. */
  validate?: (values: SettingsValues) => void;
  onChange?: (
    context: Context<WorkerEnv<B>>,
    event: { action: string; target: string },
  ) => Promise<void>;
}) {
  const app = new Hono<WorkerEnv<B>>();
  type C = Context<WorkerEnv<B>>;
  const key = options.key ?? 'workerkit:settings';
  const limit: MiddlewareHandler<WorkerEnv<B>> = bodyLimit({
    maxSize: 16_384,
    onError: () => {
      throw new ApiError(413, 'body_too_large', '设置内容过大');
    },
  });
  async function read(c: C) {
    return readSettingsSnapshot(options.store(c.env), key, options.defaults);
  }
  app.get('/', async (c: C) => c.json(await read(c)));
  app.put('/', limit, async (c: C) => {
    let input: unknown;
    try {
      input = await c.req.json();
    } catch {
      throw new ApiError(400, 'invalid_json', '请求 JSON 无效');
    }
    const values =
      input && typeof input === 'object'
        ? (input as { values?: unknown }).values
        : null;
    if (!values || typeof values !== 'object' || Array.isArray(values))
      throw new ApiError(400, 'invalid_settings', '设置格式无效');
    const patch = values as Record<string, unknown>;
    for (const [name, value] of Object.entries(patch)) {
      if (
        !Object.hasOwn(options.defaults, name) ||
        typeof value !== typeof options.defaults[name] ||
        (typeof value === 'string' && value.length > 2000) ||
        (typeof value === 'number' &&
          (!Number.isFinite(value) || value < 0 || value > 10000))
      ) {
        throw new ApiError(
          400,
          'invalid_settings',
          `设置项 ${name.slice(0, 40)} 无效`,
        );
      }
    }
    const previous = await read(c);
    const result = {
      values: {
        ...options.defaults,
        ...previous.values,
        ...patch,
      } as SettingsValues,
      updatedAt: new Date().toISOString(),
    };
    options.validate?.(result.values);
    await options.store(c.env).put(key, JSON.stringify(result));
    await options.onChange?.(c, {
      action: 'settings.update',
      target: Object.keys(patch).join(', '),
    });
    return c.json(result);
  });
  return app;
}
