import { createTaskWorker } from '@pengzhendong/worker-kit/task-worker';
import type { StandardBindings } from './worker';
export class WorkerKitStandardTasks extends createTaskWorker<StandardBindings>({
  backends: ['standard'],
  definitions: (env) => ({
    'check-bindings': {
      label: '依赖检查',
      target: 'cloudflare',
      fields: [],
      async run(_inputs, { report }) {
        report({ completed: 0, total: 1, message: '检查 D1' });
        await env.AUTH_DB.prepare('SELECT 1').first();
        report({ completed: 1, total: 1, message: '依赖正常' });
        return { state: 'succeeded', output: { logs: ['D1: ok'] } };
      },
    },
  }),
}) {}
