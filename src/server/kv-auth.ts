/** Revocable native KV sessions, adapted from PT Runner's existing session protocol. */
export function createKvAdminAuth(options: { cookieName: string; keyPrefix: string; authScope: string; sessionSeconds?: number }) {
  const ttl = options.sessionSeconds ?? 7 * 24 * 60 * 60;
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(options.cookieName) || !options.keyPrefix || !options.authScope || !Number.isInteger(ttl) || ttl < 1 || ttl > 30 * 24 * 60 * 60) throw new Error('Invalid KV session configuration');
  interface Store { get(key: string, type: 'json'): Promise<unknown>; put(key: string, value: string, options: { expirationTtl: number }): Promise<unknown>; delete(key: string): Promise<unknown> }
  const encode = (bytes: Uint8Array) => { let value = ''; for (const byte of bytes) value += String.fromCharCode(byte); return btoa(value).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, ''); };
  const digest = async (text: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
  const equal = (left: Uint8Array, right: Uint8Array) => { if (left.length !== right.length) return false; let mismatch = 0; for (let i = 0; i < left.length; i++) mismatch |= left[i]! ^ right[i]!; return mismatch === 0; };
  const version = async (username: string, password: string) => encode(await digest(`${options.authScope}:${username}\u0000${password}`)).slice(0, 24);
  const sessionKey = async (token: string) => `${options.keyPrefix}${encode(await digest(token))}`;
  function token(request: Request) {
    for (const item of (request.headers.get('cookie') ?? '').split(';')) { const pos = item.indexOf('='); if (pos > 0 && item.slice(0, pos).trim() === options.cookieName) return item.slice(pos + 1).trim(); }
    return '';
  }
  function cookie(request: Request, value: string, maxAge: number) {
    const url = new URL(request.url);
    if (url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Administrator sessions require HTTPS');
    return `${options.cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${url.protocol === 'https:' ? '; Secure' : ''}`;
  }
  async function verifyCredentials(username: string, password: string, expectedUsername: string, expectedPassword: string) {
    if (!expectedUsername || !expectedPassword || username.length > 256 || password.length > 1024) return false;
    const [left, right] = await Promise.all([digest(`${username}\u0000${password}`), digest(`${expectedUsername}\u0000${expectedPassword}`)]);
    return equal(left, right);
  }
  async function createSession(store: Store, username: string, password: string, request: Request) {
    if (!username || !password) throw new Error('Administrator credentials are not configured');
    const value = encode(crypto.getRandomValues(new Uint8Array(32)));
    const result = cookie(request, value, ttl);
    await store.put(await sessionKey(value), JSON.stringify({ authVersion: await version(username, password), createdAt: new Date().toISOString() }), { expirationTtl: ttl });
    return result;
  }
  async function isAuthenticated(request: Request, store: Store, username: string, password: string) {
    if (!username || !password) return false;
    const url = new URL(request.url);
    if (url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return false;
    const value = token(request); if (!value || value.length > 128) return false;
    let session: unknown;
    try { session = await store.get(await sessionKey(value), 'json'); } catch { return false; }
    if (!session || typeof session !== 'object' || !('authVersion' in session) || typeof session.authVersion !== 'string' || !('createdAt' in session) || typeof session.createdAt !== 'string') return false;
    const age = Date.now() - Date.parse(session.createdAt);
    if (!Number.isFinite(age) || age < 0 || age >= ttl * 1000) return false;
    return equal(new TextEncoder().encode(session.authVersion), new TextEncoder().encode(await version(username, password)));
  }
  async function deleteSession(request: Request, store: Store) {
    const result = cookie(request, '', 0), value = token(request);
    if (value && value.length <= 128) await store.delete(await sessionKey(value));
    return result;
  }
  return { verifyCredentials, createSession, isAuthenticated, deleteSession, isSameOrigin: (request: Request) => request.headers.get('origin') === new URL(request.url).origin };
}
