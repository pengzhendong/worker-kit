// Native framework handlers share Better Auth's D1 identity, never a second
// password/session implementation. Business storage remains namespaced per app.
export type FrameworkEnv = {
  AUTH_SERVICE: DurableObjectNamespace;
  NATIVE_STORE: KVNamespace;
};
export async function frameworkUser(request: Request, env: FrameworkEnv) {
  const headers = new Headers();
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;
  headers.set('Cookie', cookie);
  const response = await env.AUTH_SERVICE.get(
    env.AUTH_SERVICE.idFromName('auth'),
  ).fetch(
    new Request(new URL('/standard/auth/get-session', request.url), {
      headers,
    }),
  );
  if (!response.ok) return null;
  const value = await response.json<{
    user?: { id: string; name: string; username?: string; role?: string };
    session?: unknown;
  }>();
  return value?.session && value.user ? value.user : null;
}
export async function verification(
  request: Request,
  env: FrameworkEnv,
  framework: string,
) {
  const user = await frameworkUser(request, env);
  if (!user)
    return Response.json(
      { error: '请先登录 Hono + Better Auth' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  if (request.method !== 'GET') {
    if (request.headers.get('Origin') !== new URL(request.url).origin)
      return Response.json({ error: '请求来源不符' }, { status: 403 });
    if (user.role !== 'admin')
      return Response.json({ error: '需要管理员权限' }, { status: 403 });
    const body = (await request.json().catch((): null => null)) as {
      label?: unknown;
    } | null;
    if (typeof body?.label !== 'string' || body.label.length > 80)
      return Response.json({ error: '名称应为 0–80 个字符' }, { status: 400 });
    await env.NATIVE_STORE.put('workerkit:framework:' + framework, body.label);
  }
  return Response.json(
    {
      framework,
      user: user.username || user.name,
      label:
        (await env.NATIVE_STORE.get('workerkit:framework:' + framework)) || '',
      runtime: 'Cloudflare Workers',
      renderedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
