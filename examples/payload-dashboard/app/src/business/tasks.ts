import type { TaskDefinition } from '@pengzhendong/worker-kit/task-manager';
import { runHealthChecks } from '@pengzhendong/worker-kit/runtime';

/** Add business tasks here. Never store passwords or access tokens in plan inputs. */
export function taskDefinitions(
  env: CloudflareEnv,
  backend: 'payload' | 'sonic' | 'native' | 'hub',
): Record<string, TaskDefinition> {
  const db =
    backend === 'hub' ? env.DB : backend === 'sonic' ? env.SONIC_DB : env.D1;
  const bucket =
    backend === 'hub'
      ? env.BLOB
      : backend === 'sonic'
        ? env.SONIC_MEDIA
        : env.R2;
  const checks =
    backend === 'native'
      ? [
          {
            name: 'KV',
            check: () => env.NATIVE_STORE.get('__workerkit_health_check__'),
          },
        ]
      : [
          { name: 'D1', check: () => db.prepare('SELECT 1').first() },
          {
            name: 'R2',
            check: () => bucket.head('__workerkit_health_check__'),
          },
        ];
  return {
    'check-bindings': {
      label: '依赖检查',
      target: 'cloudflare',
      fields: [],
      async run(_inputs, { report }) {
        report({ completed: 0, total: checks.length, message: '检查存储依赖' });
        const result = await runHealthChecks(checks);
        report({
          completed: checks.length,
          total: checks.length,
          message: result.ok ? '依赖正常' : '依赖异常',
        });
        // Output is deliberately limited to safe check metadata.
        if (!result.ok) throw new Error('Dependency check failed');
        return {
          state: 'succeeded',
          output: {
            logs: [
              `后端：${{ sonic: 'SonicJS', payload: 'Payload', native: 'Native', hub: 'NuxtHub' }[backend]}`,
              ...result.checks.map(
                (check) =>
                  `${check.name}: ${check.status} (${check.durationMs} ms)`,
              ),
            ],
          },
        };
      },
    },
  };
}
