import { readFile } from 'node:fs/promises';
import { getPlatformProxy } from 'wrangler';
import { hashPassword } from 'better-auth/crypto';
import { bootstrapDocumentTypes, RbacService } from '@sonicjs-cms/core';
const settings = Object.fromEntries((await readFile(new URL('./.env', import.meta.url), 'utf8')).split('\n').filter(line => line.includes('=')).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
if (!settings.PAYLOAD_DEMO_EMAIL || !settings.PAYLOAD_DEMO_PASSWORD) throw Error('Local preview credentials are missing');
// This script provisions local Wrangler state only. It is never part of an HTTP route.
const proxy = await getPlatformProxy({ remoteBindings: false });
try {
  const db = proxy.env.SONIC_DB, kv = proxy.env.SONIC_CACHE;
  const { count } = await db.prepare('SELECT COUNT(*) AS count FROM auth_user').first();
  if (!count) {
    const id = crypto.randomUUID(), now = Date.now(), hash = await hashPassword(settings.PAYLOAD_DEMO_PASSWORD);
    await db.batch([
      db.prepare("INSERT INTO auth_user (id, name, email, email_verified, first_name, last_name, role, created_at, updated_at, is_active) VALUES (?, ?, ?, 1, ?, ?, 'admin', ?, ?, 1)").bind(id, settings.PAYLOAD_DEMO_USERNAME || 'admin', settings.PAYLOAD_DEMO_EMAIL, 'WorkerKit', 'Admin', now, now),
      db.prepare("INSERT INTO auth_account (id, user_id, account_id, provider_id, password, created_at, updated_at) VALUES (?, ?, ?, 'credential', ?, ?, ?)").bind(crypto.randomUUID(), id, id, hash, now, now),
    ]);
    await bootstrapDocumentTypes(db);
    const rbac = new RbacService(db, kv);
    await rbac.ensureSystemRbacSeed();
    await rbac.setUserRoles(id, ['role-admin']);
    console.log('Created the first local SonicJS administrator with native Better Auth hashing and SonicJS RBAC. Credentials remain in .env.');
  } else console.log('Existing SonicJS users and credentials preserved.');
} finally { await proxy.dispose(); }
