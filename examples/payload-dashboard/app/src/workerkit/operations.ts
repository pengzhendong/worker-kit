import { runHealthChecks } from '@pengzhendong/worker-kit/runtime'

export type OperationBindings = Pick<CloudflareEnv, 'D1' | 'R2'>
export async function checkBindings(env: OperationBindings) {
  return runHealthChecks([
    { name: 'D1', check: () => env.D1.prepare('SELECT 1').first() },
    { name: 'R2', check: () => env.R2.head('__workerkit_health_check__') },
  ])
}
export async function runOperation(env: OperationBindings, trigger: 'manual' | 'scheduled', scheduledAt?: number) {
  const id = crypto.randomUUID(), startedAt = new Date().toISOString()
  const result = await checkBindings(env)
  const finishedAt = new Date().toISOString()
  await env.D1.prepare('INSERT INTO workerkit_operation_runs (id, trigger, status, started_at, finished_at, checks, scheduled_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, trigger, result.ok ? 'ok' : 'error', startedAt, finishedAt, JSON.stringify(result.checks), scheduledAt ? new Date(scheduledAt).toISOString() : null).run()
  return { id, trigger, status: result.ok ? 'ok' : 'error', startedAt, finishedAt, checks: result.checks }
}
export async function listOperations(env: OperationBindings) {
  const { results } = await env.D1.prepare('SELECT id, trigger, status, started_at AS startedAt, finished_at AS finishedAt, checks FROM workerkit_operation_runs ORDER BY started_at DESC LIMIT 8').all<{ id: string; trigger: string; status: string; startedAt: string; finishedAt: string; checks: string }>()
  return results.map(row => ({ ...row, checks: JSON.parse(row.checks) as { name: string; status: string; durationMs: number }[] }))
}
