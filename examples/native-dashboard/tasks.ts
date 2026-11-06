import { createTaskWorker } from '@pengzhendong/worker-kit/task-worker';
import { runHealthChecks } from '@pengzhendong/worker-kit/runtime';
import type { NativeBindings } from './worker';
export class WorkerKitNativeTasks extends createTaskWorker<NativeBindings>({
  backends: ['native'],
  definitions: (env) => ({
    'check-bindings': {
      label: '依赖检查',
      target: 'cloudflare',
      fields: [],
      async run(_inputs, { report }) {
        report({ completed: 0, total: 1, message: '检查 KV' });
        const result = await runHealthChecks([
          { name: 'KV', check: () => env.NATIVE_STORE.get('__health__') },
        ]);
        if (!result.ok) throw new Error('Dependency check failed');
        report({ completed: 1, total: 1, message: '依赖正常' });
        return {
          state: 'succeeded',
          output: {
            logs: result.checks.map(
              (check) => `${check.name}: ${check.status}`,
            ),
          },
        };
      },
    },
  }),
}) {}
