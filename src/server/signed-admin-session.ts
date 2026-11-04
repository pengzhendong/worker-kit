const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encodeSessionBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function decodeSessionBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), character => character.charCodeAt(0));
}

export async function equalAdminSecret(provided: string, expected: string): Promise<boolean> {
  const [left, right] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(provided)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const providedHash = new Uint8Array(left);
  const expectedHash = new Uint8Array(right);
  let difference = 0;
  for (let index = 0; index < providedHash.length; index++) {
    difference |= providedHash[index]! ^ expectedHash[index]!;
  }
  return difference === 0;
}

export function createSignedAdminSession(options: {
  cookieName: string;
  sessionSeconds: number;
  usernameField: 'user' | 'username';
  nonce?: boolean;
  alwaysSecure?: boolean;
}) {
  async function signature(payload: string, secret: string) {
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return encodeSessionBytes(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(payload))));
  }

  async function create(username: string, secret: string, now = Date.now()) {
    const payload = encodeSessionBytes(encoder.encode(JSON.stringify({
      [options.usernameField]: username,
      expiresAt: Math.floor(now / 1000) + options.sessionSeconds,
      ...(options.nonce ? { nonce: crypto.randomUUID() } : {}),
    })));
    return payload + '.' + await signature(payload, secret);
  }

  async function isAuthenticated(request: Request, username?: string, secret?: string, now = Date.now()) {
    if (!username || !secret || secret.length < 32) return false;
    const pair = (request.headers.get('cookie') ?? '').split(';')
      .map(part => part.trim()).find(part => part.startsWith(options.cookieName + '='));
    const token = pair?.slice(options.cookieName.length + 1).trim();
    if (!token || token.length > 2048) return false;
    const parts = token.split('.');
    if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]!) || !/^[A-Za-z0-9_-]{43}$/.test(parts[1]!)) return false;
    try {
      if (!await equalAdminSecret(parts[1]!, await signature(parts[0]!, secret))) return false;
      const payload = JSON.parse(decoder.decode(decodeSessionBytes(parts[0]!)));
      return payload?.[options.usernameField] === username &&
        Number.isSafeInteger(payload.expiresAt) && payload.expiresAt > Math.floor(now / 1000);
    } catch {
      return false;
    }
  }

  function cookie(request: Request, value: string, maxAge = options.sessionSeconds) {
    const secure = options.alwaysSecure || new URL(request.url).protocol === 'https:';
    return `${options.cookieName}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Strict${secure ? '; Secure' : ''}`;
  }

  return { create, isAuthenticated, cookie };
}
