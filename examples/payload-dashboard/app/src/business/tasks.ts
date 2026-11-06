import type { TaskDefinition } from '@pengzhendong/worker-kit/task-manager'
import { runHealthChecks } from '@pengzhendong/worker-kit/runtime'

/** Add business tasks here. Never store passwords or access tokens in plan inputs. */
export function taskDefinitions(env: CloudflareEnv, backend: 'payload' | 'sonic'): Record<string, TaskDefinition> {
  const db = backend === 'sonic' ? env.SONIC_DB : env.D1
  const bucket = backend === 'sonic' ? env.SONIC_MEDIA : env.R2
  return { 'check-bindings': {
    label: '依赖检查', target: 'cloudflare', fields: [],
    async run(_inputs, { report }) {
      report({ completed: 0, total: 2, message: '检查 D1 与 R2' })
      const result = await runHealthChecks([
        { name: 'D1', check: () => db.prepare('SELECT 1').first() },
        { name: 'R2', check: () => bucket.head('__workerkit_health_check__') },
      ])
      report({ completed: 2, total: 2, message: result.ok ? '依赖正常' : '依赖异常' })
      // Output is deliberately limited to safe check metadata.
      if (!result.ok) throw new Error('Dependency check failed')
      return { state: 'succeeded', output: { logs: [`后端：${backend === 'sonic' ? 'SonicJS' : 'Payload'}`, ...result.checks.map(check => `${check.name}: ${check.status} (${check.durationMs} ms)`)] } }
    },
  } }
}
