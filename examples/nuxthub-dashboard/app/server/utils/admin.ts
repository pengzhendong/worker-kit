import type { TaskNamespace } from '@pengzhendong/worker-kit/operations';
import type { H3Event } from 'h3';
import { createNativeAdmin } from '@pengzhendong/worker-kit/native';
export type HubEnv = {
  TASKS: TaskNamespace;
  DB: D1Database;
  KV: KVNamespace;
  CACHE: KVNamespace;
  BLOB: R2Bucket;
  NATIVE_STORE: KVNamespace;
  NATIVE_LOGIN_RATE_LIMITER: RateLimit;
  HUB_ADMIN_PASSWORD?: string;
  HUB_ADMIN_USERNAME?: string;
};
export const admin = createNativeAdmin<HubEnv>({
  store: (env) => env.NATIVE_STORE,
  username: (env) => env.HUB_ADMIN_USERNAME || 'admin',
  password: (env) => env.HUB_ADMIN_PASSWORD,
  rateLimit: async (env, request) =>
    !!env.NATIVE_LOGIN_RATE_LIMITER &&
    (
      await env.NATIVE_LOGIN_RATE_LIMITER.limit({
        key: 'hub:' + (request.headers.get('CF-Connecting-IP') || 'local'),
      })
    ).success,
  backend: 'hub',
  tasks: (env) => env.TASKS.get(env.TASKS.idFromName('hub')),
  cookieName: 'workerkit_hub',
  prefix: 'workerkit:hub:',
  apiRoot: '/hub/api/admin',
  settings: { siteTitle: 'NuxtHub', refreshSeconds: 30, maintenance: false },
  runtime: (env) => ({
    application: { name: 'WorkerKit NuxtHub', version: '0.4.0' },
    environment: 'cloudflare',
    checks: [
      {
        name: 'D1',
        kind: 'database',
        description: 'NuxtHub SQL 数据库',
        check: () => env.DB.prepare('SELECT 1').first(),
      },
      {
        name: 'KV',
        kind: 'kv',
        description: 'NuxtHub 键值存储',
        check: () => env.KV.get('__health__'),
      },
      {
        name: 'R2',
        kind: 'storage',
        description: 'NuxtHub Blob',
        check: () => env.BLOB.head('__health__'),
      },
    ],
  }),
});
export function hubEnv(event: H3Event): HubEnv {
  const env = event.context.cloudflare?.env;
  if (!env?.NATIVE_STORE)
    throw createError({ statusCode: 503, message: 'Cloudflare 绑定未配置' });
  return env;
}

export function hubRequest(event: H3Event): Request {
  const platform: Request | undefined = event.context.cloudflare?.request;
  // Nitro 2 buffers POST/PUT/PATCH, but leaves DELETE bodies on the original
  // platform request. Its synthetic Node stream never receives that body.
  if (event.method === 'DELETE' && platform) return platform;
  const request = toWebRequest(event);
  // Preserve the platform request origin, including the local preview port.
  return new Request(platform?.url || request.url, request);
}
