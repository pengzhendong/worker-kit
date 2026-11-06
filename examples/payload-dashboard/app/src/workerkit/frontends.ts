import { readBytesLimited } from '@pengzhendong/worker-kit/http';
// Deployment composition only. The UI builds remain independent upstream apps.
const frontends = new Set([
  'nuxt',
  'prime',
  'vben',
  'pro',
  'refine',
  'tabler',
  'adminlte',
  'docs',
]);
export async function serveFrontend(
  request: Request,
  env: Pick<CloudflareEnv, 'ASSETS' | 'SONIC_ORIGIN'>,
): Promise<Response | undefined> {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/management-assets/'))
    return env.ASSETS.fetch(request);
  const mount = url.pathname.split('/')[1];
  const shell = url.pathname === '/' || url.pathname === '/index.html';
  if (!shell && !frontends.has(mount)) return undefined;
  if (!['GET', 'HEAD'].includes(request.method))
    return new Response('Method not allowed', {
      status: 405,
      headers: { Allow: 'GET, HEAD' },
    });
  if (!shell && url.pathname === `/${mount}`) {
    url.pathname += '/';
    return Response.redirect(url.href, 308);
  }
  const asset = async (pathname: string) => {
    const target = new URL(url);
    target.pathname = pathname;
    const response = await env.ASSETS.fetch(new Request(target, request));
    const range = request.headers.get('Range');
    const etag = response.headers.get('ETag');
    // Static Assets ignores Range. Delegate slicing to the native Cache API,
    // only for public, build-owned audio/video. No private R2 responses enter here.
    if (
      request.method === 'GET' &&
      range &&
      response.status === 200 &&
      etag &&
      /^(audio|video)\//.test(response.headers.get('Content-Type') ?? '')
    ) {
      const ifRange = request.headers.get('If-Range');
      if (ifRange && ifRange !== etag) return response;
      const versioned = new URL(target);
      versioned.search = '';
      versioned.searchParams.set('__wk_asset_etag', etag);
      const key = new Request(versioned);
      const partial = new Request(key, { headers: { Range: range } });
      const cache = await caches.open('workerkit-public-assets');
      const cached = await cache.match(partial);
      if (cached) {
        await response.body?.cancel();
        return cached;
      }
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'public, max-age=86400');
      headers.set('Accept-Ranges', 'bytes');
      // Demo media is capped at build time. ASSETS omits Content-Length internally;
      // provide the actual byte count required by the production Cache API.
      const bytes = await readBytesLimited(
        response.body,
        2 * 1024 * 1024,
        request.signal,
      );
      headers.set('Content-Length', String(bytes.byteLength));
      await cache.put(
        key,
        new Response(bytes.buffer as ArrayBuffer, { headers }),
      );
      return (
        (await cache.match(partial)) ??
        new Response(bytes.buffer as ArrayBuffer, { headers })
      );
    }
    return response;
  };
  const backend =
    url.origin === new URL(env.SONIC_ORIGIN).origin ? 'sonic' : 'payload';
  const decorate = (response: Response) =>
    new HTMLRewriter()
      .on('body', {
        element(element) {
          element.setAttribute('data-workerkit-backend', backend);
        },
      })
      .transform(response);
  if (shell)
    return new HTMLRewriter()
      .on('body', {
        element(element) {
          element.setAttribute(
            'data-sonic-origin',
            new URL(env.SONIC_ORIGIN).origin,
          );
        },
      })
      .transform(await asset('/index.html'));
  if (url.pathname.endsWith('/'))
    return decorate(await asset(url.pathname + 'index.html'));
  const response = await asset(url.pathname);
  if (response.status !== 404)
    return (response.headers.get('Content-Type') ?? '').includes('text/html')
      ? decorate(response)
      : response;
  // A missing .js/.css/media file must stay 404, never return a SPA document.
  if (url.pathname.split('/').at(-1)!.includes('.')) return response;
  if (mount === 'docs') return decorate(await asset(url.pathname + '.html'));
  return decorate(await asset(`/${mount}/index.html`));
}
