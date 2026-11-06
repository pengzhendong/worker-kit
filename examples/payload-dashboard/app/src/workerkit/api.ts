import { getPayload, type Payload } from 'payload'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { bodyLimit } from 'hono/body-limit'
import { ApiError, createServer, createModuleAccess, requireSameOrigin, readPageQuery, inspectRuntime } from '@pengzhendong/worker-kit/server'
import config from '@/payload.config'
import type { User } from '@/payload-types'
import { modules, grants } from './permissions'
import { listOperations, runOperation } from './operations'
import { payloadOperations } from './payload-operations'
import { isLocalPreview } from './demo-login'

type Bindings = CloudflareEnv & { payload: Payload; principal: User | null }
const app = createServer<Bindings>().basePath('/api/workerkit')
app.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store')
  const { user } = await c.env.payload.auth({ headers: c.req.raw.headers })
  if (!user) throw new ApiError(401, 'unauthorized', '请先登录')
  // The dispatcher creates a fresh bindings object for every request.
  c.env.principal = user
  c.set('adminUser', String(user.id))
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) requireSameOrigin(c.req.raw)
  await next()
})
const access = createModuleAccess<Bindings, typeof modules>({ modules, resolvePermissions: c => c.env.principal ? grants(c.env.principal) : null })
app.route('/', payloadOperations)
app.get('/session', async c => c.json({ user: { id: c.env.principal!.id, email: c.env.principal!.email, username: c.env.principal!.username ?? null, role: c.env.principal!.role }, permissions: await access.permissions(c) }))
app.get('/overview', access.require('runtime:read'), async c => {
  const [runtime, notes, media, runs] = await Promise.all([
    inspectRuntime({ application: { name: 'WorkerKit + Payload', version: '0.2.0' }, environment: isLocalPreview(c.req.url) ? 'local' : 'production', checks: [
      { name: 'D1', kind: 'database', description: '验证 D1 数据库可访问', check: () => c.env.D1.prepare('SELECT 1').first() },
      { name: 'R2', kind: 'storage', description: '验证 R2 对象存储可访问', check: () => c.env.R2.head('__workerkit_health_check__') },
    ] }),
    c.env.payload.find({ collection: 'notes', user: c.env.principal!, overrideAccess: false, depth: 0, limit: 5, sort: '-updatedAt', select: { title: true, status: true, updatedAt: true } }),
    c.env.payload.count({ collection: 'media', user: c.env.principal!, overrideAccess: false }),
    listOperations(c.env),
  ])
  return c.json({ user: { id: c.env.principal!.id, email: c.env.principal!.email, username: c.env.principal!.username ?? null, role: c.env.principal!.role }, permissions: await access.permissions(c), runtime, notes: { items: notes.docs, total: notes.totalDocs }, media: { total: media.totalDocs }, runs })
})
app.get('/notes', access.require('notes:read'), async c => {
  const { page, pageSize } = readPageQuery(new URL(c.req.url).searchParams)
  const result = await c.env.payload.find({ collection: 'notes', user: c.env.principal!, overrideAccess: false, page, limit: pageSize, depth: 0, sort: '-updatedAt' })
  return c.json({ items: result.docs, total: result.totalDocs, page, pageSize })
})
app.use('/notes', bodyLimit({ maxSize: 8192 }))
app.use('/notes/*', bodyLimit({ maxSize: 8192 }))
async function noteInput(request: Request, create: boolean) {
  let data: unknown
  try { data = await request.json() } catch { throw new ApiError(400, 'invalid_json', '请求格式无效') }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new ApiError(400, 'invalid_note', '记录格式无效')
  const body = data as Record<string, unknown>, result: { title?: string; body?: string; status?: 'draft' | 'published' } = {}
  if (create || body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 160) throw new ApiError(422, 'invalid_title', '请填写 1–160 字的标题', [{ path: ['title'], message: '请填写 1–160 字的标题' }])
    result.title = body.title.trim()
  }
  if (body.body !== undefined) {
    if (typeof body.body !== 'string' || body.body.length > 2000) throw new ApiError(422, 'invalid_body', '正文不能超过 2000 字')
    result.body = body.body
  }
  if (body.status !== undefined) {
    if (!['draft', 'published'].includes(String(body.status))) throw new ApiError(422, 'invalid_status', '状态无效')
    result.status = body.status as 'draft' | 'published'
  }
  return result
}
app.post('/notes', access.require('notes:create'), async c => {
  const data = await noteInput(c.req.raw, true)
  const doc = await c.env.payload.create({ collection: 'notes', user: c.env.principal!, overrideAccess: false, data: { ...data, title: data.title!, status: data.status ?? 'draft' } })
  return c.json({ item: doc }, 201)
})
app.patch('/notes/:id', access.require('notes:update'), async c => {
  const id = Number(c.req.param('id'))
  if (!Number.isSafeInteger(id) || id < 1) throw new ApiError(400, 'invalid_id', '记录编号无效')
  const data = await noteInput(c.req.raw, false)
  try {
    const doc = await c.env.payload.update({ collection: 'notes', id, user: c.env.principal!, overrideAccess: false, overrideLock: false, data })
    return c.json({ item: doc })
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) throw new ApiError(404, 'not_found', '记录不存在')
    throw error
  }
})
app.post('/operations/check', access.require('runtime:run'), async c => c.json(await runOperation(c.env, 'manual'), 201))

export async function workerKitHandler(request: Request) {
  const { env, ctx } = await getCloudflareContext({ async: true })
  const payload = await getPayload({ config })
  // Next/OpenNext may rewrite the internal request origin. Use a configured public
  // origin, never client-controlled Host / X-Forwarded-* headers, for CSRF checks.
  const origin = new URL(env.WORKERKIT_ORIGIN).origin
  const incoming = new URL(request.url)
  const normalized = new Request(new URL(incoming.pathname + incoming.search, origin), request)
  return app.fetch(normalized, { ...env, payload, principal: null }, ctx)
}
