import { createSonicJSApp, registerCollections } from '@sonicjs-cms/core'
import { sonicNotes } from './sonic-collection'
import { demoUsername, demoPassword, demoEmail, isLocalPreview } from './demo-login'
import { sonicOperations } from './sonic-operations'

registerCollections([sonicNotes])
const app = createSonicJSApp({
  name: 'WorkerKit · SonicJS',
  // Core's /api catch-all precedes config.routes. The public afterAuth hook gives
  // this adapter the verified native principal before that catch-all is reached.
  middleware: { afterAuth: [async (c, next) => {
    const path = new URL(c.req.url).pathname
    if (path === '/api/workerkit' || path.startsWith('/api/workerkit/')) {
      const session = c.get('session') as { userId: string } | undefined
      c.res = await sonicOperations.fetch(c.req.raw, { ...c.env, operationsIdentity: session ? { userId: session.userId } : undefined }, c.executionCtx)
      return
    }
    await next()
  }] },
  // A real delivery adapter can be configured later. Never log reset links or email bodies.
  email: { provider: {
    name: 'not-configured', isConfigured: () => false,
    send: async () => ({ ok: false, provider: 'not-configured', error: 'Email is not configured in this preview' }),
  } },
  auth: { extendBetterAuth: options => ({ ...options, logger: { disabled: true } }) },
})

export async function serveSonic(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
  if (!env.SONIC_AUTH_SECRET || !env.SONIC_DB || !env.SONIC_CACHE || !env.SONIC_MEDIA) {
    return new Response('SonicJS configuration is incomplete', { status: 503 })
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.headers.get('Origin') !== new URL(env.SONIC_ORIGIN).origin) {
    return Response.json({ error: 'Request origin is not allowed' }, { status: 403 })
  }
  const local = (isLocalPreview(env.WORKERKIT_ORIGIN) && isLocalPreview(env.SONIC_ORIGIN)) || ('WORKERKIT_DEMO' in env && env.WORKERKIT_DEMO === '1')
  const path = new URL(request.url).pathname
  if (local && request.method === 'POST' && path === '/auth/login/form') {
    const data = await request.clone().formData()
    if (String(data.get('email') ?? '').trim().toLowerCase() === demoUsername) {
      data.set('email', demoEmail)
      const headers = new Headers(request.headers)
      headers.delete('Content-Type'); headers.delete('Content-Length')
      request = new Request(request, { headers, body: data })
    }
  }
  const response = await app.fetch(request, {
    DB: env.SONIC_DB, CACHE_KV: env.SONIC_CACHE, MEDIA_BUCKET: env.SONIC_MEDIA, ASSETS: env.ASSETS,
    JWT_SECRET: env.SONIC_AUTH_SECRET, BETTER_AUTH_SECRET: env.SONIC_AUTH_SECRET,
    TASKS: env.TASKS,
    BETTER_AUTH_URL: env.SONIC_ORIGIN, CORS_ORIGINS: env.SONIC_ORIGIN,
    ENVIRONMENT: 'production', BUCKET_NAME: 'workerkit-sonic-local',
  }, ctx)
  // Native routes/links/cookies stay untouched. Permit framing only by our comparison UI.
  const headers = new Headers(response.headers)
  headers.delete('X-Frame-Options')
  const csp = (headers.get('Content-Security-Policy') ?? '').split(';').map(part => part.trim()).filter(part => part && !part.startsWith('frame-ancestors'))
  csp.push(`frame-ancestors 'self' ${new URL(env.WORKERKIT_ORIGIN).origin}`)
  headers.set('Content-Security-Policy', csp.join('; '))
  headers.set('Cache-Control', 'no-store')
  let result = new Response(response.body, { status: response.status, statusText: response.statusText, headers })
  if (local && path === '/auth/login' && (headers.get('Content-Type') ?? '').includes('text/html')) {
    result = new HTMLRewriter()
      .on('form#login-form label[for="email"]', { element(element) { element.setInnerContent('Username') } })
      .on('form#login-form input#email', { element(element) { element.setAttribute('type', 'text'); element.setAttribute('autocomplete', 'username'); element.setAttribute('placeholder', 'Enter your username or email') } })
      .on('form#login-form', { element(element) { element.prepend(`<p class="mb-6 text-sm text-zinc-400">演示账号：<code>${demoUsername}</code> · 密码：<code>${demoPassword}</code></p>`, { html: true }) } })
      .transform(result)
  }
  return result
}
