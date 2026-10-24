import { ApiError } from './app';
import type { ApiKeyInfo } from '../contracts';
export type { ApiKeyInfo } from '../contracts';

export interface ApiKeyRecord extends ApiKeyInfo { hash: string }
export interface ApiKeyStore {
  insert(record: ApiKeyRecord): Promise<void>;
  findByHash(hash: string): Promise<ApiKeyRecord | null>;
  touch(id: string, at: string): Promise<void>;
}
export function apiKeyInfo(key: ApiKeyRecord): ApiKeyInfo {
  return { id: key.id, owner: key.owner, name: key.name, prefix: key.prefix, permissions: key.permissions, createdAt: key.createdAt, expiresAt: key.expiresAt, revokedAt: key.revokedAt, lastUsedAt: key.lastUsedAt };
}
export async function hashApiKey(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
/** Opaque high-entropy keys. Authentication never creates an administrator session. */
export function createApiKeys(options: { store: ApiKeyStore; now?: () => number }) {
  const now = options.now ?? Date.now;
  return {
    async issue(input: { owner: string; name: string; permissions: readonly string[]; expiresInDays: number }, allowed: readonly string[]) {
      if (!input.owner || typeof input.name !== 'string' || !input.name.trim() || input.name.length > 80 || !Number.isInteger(input.expiresInDays) || input.expiresInDays < 1 || input.expiresInDays > 365 || !Array.isArray(input.permissions) || !input.permissions.length || input.permissions.length > 100 || input.permissions.some((permission) => typeof permission !== 'string' || !allowed.includes(permission))) throw new ApiError(422, 'invalid_api_key', '请填写名称、1–365 天有效期，并选择已授权的业务权限');
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      const token = `wk_${btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
      const timestamp = now();
      const record: ApiKeyRecord = { id: crypto.randomUUID(), owner: input.owner, name: input.name.trim(), prefix: token.slice(0, 10), hash: await hashApiKey(token), permissions: [...new Set(input.permissions)], createdAt: new Date(timestamp).toISOString(), expiresAt: new Date(timestamp + input.expiresInDays * 86_400_000).toISOString(), revokedAt: null, lastUsedAt: null };
      await options.store.insert(record);
      return { token, key: apiKeyInfo(record) };
    },
    async verify(authorization: string | undefined) {
      const token = /^Bearer (wk_[A-Za-z0-9_-]{43})$/i.exec(authorization ?? '')?.[1];
      if (!token) throw new ApiError(401, 'invalid_api_key', '访问令牌无效或已失效');
      const record = await options.store.findByHash(await hashApiKey(token));
      if (!record || record.revokedAt !== null || !Number.isFinite(Date.parse(record.expiresAt)) || Date.parse(record.expiresAt) <= now() || !Array.isArray(record.permissions) || record.permissions.some((value) => typeof value !== 'string')) throw new ApiError(401, 'invalid_api_key', '访问令牌无效或已失效');
      return apiKeyInfo(record);
    },
    async used(id: string) {
      // Usage timestamps are auxiliary; failures must not expose data or invalidate a completed request.
      try { await options.store.touch(id, new Date(now()).toISOString()); }
      catch { console.error(JSON.stringify({ event: 'api_key_usage_write_failed', keyId: id })); }
    },
  };
}
