import { readBytesLimited } from '@pengzhendong/worker-kit/http'
// Nuxt/Nitro owns this route. It is bundled into the same Worker, never proxied.
// @ts-ignore Built by the optional NuxtHub example before the unified Worker build.
import hub from '../../../../nuxthub-dashboard/app/.output/server/index.mjs'
export async function serveHub(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
 // Nitro's Cloudflare adapter buffers a request before H3 handlers run. Enforce
 // the public workbench limit before entering that adapter, including bad routes.
 if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
  try {
   const bytes = await readBytesLimited(request.body, 16384, request.signal)
   request = new Request(request, { body: bytes.slice().buffer as ArrayBuffer })
  } catch { return Response.json({ error: { code: 'body_too_large', message: '请求内容过大或不可读取' } }, { status: 413 }) }
 }
 return hub.fetch(request, env, ctx)
}
