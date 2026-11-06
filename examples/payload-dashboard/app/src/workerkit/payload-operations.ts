import { isLocalPreview } from './demo-login'
import { createOperationsRoutes } from '@pengzhendong/worker-kit/operations'
import type { Payload } from 'payload'
import type { User } from '../payload-types'
import { grants } from './permissions'

export const payloadOperations = createOperationsRoutes<CloudflareEnv & { payload: Payload; principal: User | null }>({
  backend: 'payload',
  principal: c => c.env.principal ? { id: String(c.env.principal.id), name: c.env.principal.username || c.env.principal.email, permissions: grants(c.env.principal) } : null,
  tasks: c => c.env.TASKS.get(c.env.TASKS.idFromName('payload')),
  runtime: c => ({ application: { name: 'WorkerKit', version: '0.2.0' }, environment: isLocalPreview(c.req.url) ? 'local' : 'production', checks: [
    { name: 'D1', kind: 'database', description: '验证数据库可访问', check: () => c.env.D1.prepare('SELECT 1').first() },
    { name: 'R2', kind: 'storage', description: '验证对象存储可访问', check: () => c.env.R2.head('__workerkit_health_check__') },
  ] }),
})
