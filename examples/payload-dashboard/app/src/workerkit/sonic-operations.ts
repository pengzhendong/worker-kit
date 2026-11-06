import type { TaskNamespace } from '@pengzhendong/worker-kit/operations';
import { isLocalPreview } from './demo-login';
import { createOperationsRoutes } from '@pengzhendong/worker-kit/operations';
import { RbacService } from '@sonicjs-cms/core';
import { adminManagementPermissions } from '@pengzhendong/worker-kit/management';
import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  CACHE_KV: KVNamespace;
  MEDIA_BUCKET: R2Bucket;
  TASKS: TaskNamespace;
  ADMIN_STORE: KVNamespace;
  operationsIdentity?: { userId: string };
};
export const sonicOperations = new Hono<{ Bindings: Bindings }>().route(
  '/api/workerkit',
  createOperationsRoutes<Bindings>({
    backend: 'sonic',
    management: {
      store: (env) => env.ADMIN_STORE,
      prefix: 'workerkit:sonic:',
      cookieName: 'auth_token',
      apiRoot: '/api/workerkit',
      settings: {
        siteTitle: 'WorkerKit',
        refreshSeconds: 30,
        maintenance: false,
      },
    },
    async principal(c) {
      // SonicJS has already verified its native Better Auth session before this route.
      const identity = c.env.operationsIdentity;
      if (!identity) return null;
      const user = await c.env.DB.prepare(
        'SELECT id, name, is_active FROM auth_user WHERE id = ?',
      )
        .bind(identity.userId)
        .first<{ id: string; name: string; is_active: number }>();
      if (!user?.is_active) return null;
      const rbac = new RbacService(c.env.DB as never, c.env.CACHE_KV as never);
      const [read, manage] = await Promise.all([
        rbac.can(user.id, 'portal', 'access'),
        rbac.can(user.id, 'settings', 'manage'),
      ]);
      return {
        id: user.id,
        name: user.name,
        permissions: [
          ...(read ? ['tasks:read', 'runtime:read'] : []),
          ...(manage ? adminManagementPermissions : []),
        ],
      };
    },
    tasks: (c) => c.env.TASKS.get(c.env.TASKS.idFromName('sonic')),
    runtime: (c) => ({
      application: { name: 'WorkerKit', version: '0.4.0' },
      environment: isLocalPreview(c.req.url) ? 'local' : 'production',
      checks: [
        {
          name: 'D1',
          kind: 'database',
          description: '验证数据库可访问',
          check: () => c.env.DB.prepare('SELECT 1').first(),
        },
        {
          name: 'KV',
          kind: 'kv',
          description: '验证缓存可访问',
          check: () => c.env.CACHE_KV.get('__workerkit_health_check__'),
        },
        {
          name: 'R2',
          kind: 'storage',
          description: '验证对象存储可访问',
          check: () => c.env.MEDIA_BUCKET.head('__workerkit_health_check__'),
        },
      ],
    }),
  }),
);
