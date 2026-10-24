/** Public metadata only. Lists must not include a token or its digest. */
export interface ApiKeyInfo {
  id: string; owner: string; name: string; prefix: string; permissions: string[];
  createdAt: string; expiresAt: string; revokedAt: string | null; lastUsedAt: string | null;
}
