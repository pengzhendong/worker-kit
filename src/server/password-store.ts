/** Optional single-administrator credentials; reads must be strongly consistent. */
export interface AdminPasswordStore {
  read(): Promise<string | null>;
  /** Atomic compare-and-set prevents competing password changes overwriting one another. */
  replace(previous: string | null, next: string): Promise<boolean>;
}

export function d1AdminPasswordStore(db: D1Database, key = 'administrator'): AdminPasswordStore {
  return {
    async read() {
      const row = await db.withSession('first-primary').prepare('SELECT password_hash FROM workerkit_admin_passwords WHERE id = ?').bind(key).first<{password_hash: string}>();
      return row?.password_hash ?? null;
    },
    async replace(previous, next) {
      const result = previous === null
        ? await db.prepare('INSERT INTO workerkit_admin_passwords (id, password_hash) VALUES (?, ?) ON CONFLICT(id) DO NOTHING').bind(key, next).run()
        : await db.prepare('UPDATE workerkit_admin_passwords SET password_hash = ? WHERE id = ? AND password_hash = ?').bind(next, key, previous).run();
      return result.meta.changes === 1;
    },
  };
}

const iterations = 100000;
const hex = (bytes: Uint8Array) => [...bytes].map(v => v.toString(16).padStart(2, '0')).join('');
async function derive(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(new Uint8Array(await crypto.subtle.deriveBits({name: 'PBKDF2', hash: 'SHA-256', salt: salt as Uint8Array<ArrayBuffer>, iterations}, key, 256)));
}
export async function hashAdminPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256$${iterations}$${hex(salt)}$${await derive(password, salt)}`;
}
export async function verifyAdminPassword(password: string, encoded: string) {
  const {timingSafeEqual} = await import('hono/utils/buffer');
  const match = /^pbkdf2-sha256\$100000\$([a-f0-9]{32})\$([a-f0-9]{64})$/.exec(encoded);
  if (!match) throw new Error('Invalid stored administrator password');
  const salt = Uint8Array.from(match[1].match(/../g)!, value => Number.parseInt(value, 16));
  return timingSafeEqual(await derive(password, salt), match[2]);
}
