import 'dotenv/config'
import { readFile, writeFile } from 'node:fs/promises'
import { getPayload } from 'payload'
import { getPlatformProxy } from 'wrangler'
import { AuthManager } from '@sonicjs-cms/core/middleware'
import config from './src/payload.config'
import { demoUsername, demoPassword, demoEmail } from './src/workerkit/demo-login'

// Explicit local provisioning command; no HTTP endpoint and no login bypass.
const payload = await getPayload({ config })
try {
  const result = await payload.find({ collection: 'users', where: { email: { equals: demoEmail } }, limit: 1, overrideAccess: true })
  const user = result.docs[0]
  if (user) {
    if (user.role !== 'admin') throw Error('The local preview identity is not an administrator')
    await payload.update({ collection: 'users', id: user.id, overrideAccess: true, data: { username: demoUsername, password: demoPassword, sessions: [] } })
  } else if (result.totalDocs === 0 && (await payload.count({ collection: 'users', overrideAccess: true })).totalDocs === 0) {
    await payload.create({ collection: 'users', overrideAccess: true, data: { email: demoEmail, username: demoUsername, password: demoPassword, role: 'admin' } })
  } else throw Error('The local preview administrator was not found')
} finally { await payload.destroy() }
const proxy = await getPlatformProxy<CloudflareEnv>({ remoteBindings: false })
try {
  const user = await proxy.env.SONIC_DB.prepare('SELECT id, role FROM auth_user WHERE email = ?').bind(demoEmail).first<{ id: string; role: string }>()
  if (!user || user.role !== 'admin') throw Error('The SonicJS preview administrator was not found')
  const hash = await AuthManager.hashPassword(demoPassword)
  await proxy.env.SONIC_DB.batch([
    proxy.env.SONIC_DB.prepare('UPDATE auth_user SET name = ?, password_hash = ?, failed_login_count = 0, locked_until = NULL, updated_at = ? WHERE id = ?').bind(demoUsername, hash, Date.now(), user.id),
    proxy.env.SONIC_DB.prepare("UPDATE auth_account SET password = ?, updated_at = ? WHERE user_id = ? AND provider_id = 'credential'").bind(hash, Date.now(), user.id),
    proxy.env.SONIC_DB.prepare('DELETE FROM auth_session WHERE user_id = ?').bind(user.id),
  ])
  console.log('Local comparison credentials updated with native password hashing. Existing content and files are preserved.')
} finally { await proxy.dispose() }

const envFile = new URL('./.env', import.meta.url)
let text = await readFile(envFile, 'utf8')
for (const [key, value] of Object.entries({ PAYLOAD_DEMO_USERNAME: demoUsername, PAYLOAD_DEMO_PASSWORD: demoPassword })) {
  const pattern = new RegExp(`^${key}=.*$`, 'm')
  text = pattern.test(text) ? text.replace(pattern, `${key}=${value}`) : text.trimEnd() + `\n${key}=${value}\n`
}
await writeFile(envFile, text, { mode: 0o600 })
// Payload's CLI config owns a Wrangler proxy; all writes are awaited before exit.
process.exit(0)
