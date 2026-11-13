import { access, readFile, writeFile, chmod } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const app = fileURLToPath(new URL('./app/', import.meta.url));
const root = fileURLToPath(new URL('../../', import.meta.url));
const exists = async file => { try { await access(file); return true; } catch { return false; } };
const run = (args, cwd = app) => new Promise((resolve, reject) => {
  const child = spawn('npm', args, { cwd, stdio: 'inherit' });
  child.on('error', reject);
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`npm ${args.join(' ')} exited ${code}`)));
});
if (!await exists(app + 'node_modules/payload/package.json') || !await exists(app + 'node_modules/@sonicjs-cms/core/package.json')) await run(['ci', '--workspaces=false', '--no-audit', '--no-fund']);
let text = await exists(app + '.env') ? await readFile(app + '.env', 'utf8') : '';
const env = Object.fromEntries(text.split('\n').filter(line => line.includes('=')).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
for (const [key, value] of Object.entries({ PAYLOAD_SECRET: randomBytes(32).toString('hex'), SONIC_AUTH_SECRET: randomBytes(32).toString('hex'), NATIVE_ADMIN_PASSWORD: 'password', HUB_ADMIN_PASSWORD: 'password', DASHBOARD_ADMIN_PASSWORD: randomBytes(18).toString('base64url'), DASHBOARD_SESSION_SECRET: randomBytes(32).toString('hex'), STANDARD_AUTH_SECRET: randomBytes(32).toString('hex'), STANDARD_ADMIN_PASSWORD: 'password', NEXT_TELEMETRY_DISABLED: '1', PAYLOAD_DEMO_EMAIL: 'admin@workerkit.test', PAYLOAD_DEMO_USERNAME: 'admin', PAYLOAD_DEMO_PASSWORD: 'password' })) {
  if (!env[key]) { text = text.replace(new RegExp(`^${key}=.*$`, 'm'), '').trimEnd() + `\n${key}=${value}\n`; env[key] = value; }
}
await writeFile(app + '.env', text.trimStart(), { mode: 0o600 });
await writeFile(app + '.dev.vars', `DASHBOARD_ADMIN_PASSWORD=${env.DASHBOARD_ADMIN_PASSWORD}\nDASHBOARD_SESSION_SECRET=${env.DASHBOARD_SESSION_SECRET}\nPAYLOAD_SECRET=${env.PAYLOAD_SECRET}\nSONIC_AUTH_SECRET=${env.SONIC_AUTH_SECRET}\nNATIVE_ADMIN_PASSWORD=${env.NATIVE_ADMIN_PASSWORD}\nHUB_ADMIN_PASSWORD=${env.HUB_ADMIN_PASSWORD}\nSTANDARD_AUTH_SECRET=${env.STANDARD_AUTH_SECRET}\nSTANDARD_ADMIN_PASSWORD=${env.STANDARD_ADMIN_PASSWORD}\n`, { mode: 0o600 });
await chmod(app + '.env', 0o600); await chmod(app + '.dev.vars', 0o600);
await run(['run', 'migrate:local']);
await run(['exec', '--', 'wrangler', 'd1', 'migrations', 'apply', 'SONIC_DB', '--local']);
await run(['exec','--','wrangler','d1','migrations','apply','AUTH_DB','--local']);
await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['sonic-seed.mjs'], { cwd: app, stdio: 'inherit' });
  child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error('SonicJS local provisioning failed')));
});
await run(['exec', '--', 'wrangler', 'd1', 'migrations', 'apply', 'DASHBOARD_DB', '--local']);
if (process.argv.includes('--build') || !await exists(app + '.open-next/worker.js') || !await exists(app + '.open-next/assets/showcase.html')) {
  await run(['ci', '--workspaces=false', '--no-audit', '--no-fund'], fileURLToPath(new URL('../nuxthub-dashboard/app', import.meta.url)));
  await run(['run', 'build:native'], fileURLToPath(new URL('../../', import.meta.url)));
  await run(['run', 'build:hub'], fileURLToPath(new URL('../../', import.meta.url)));
  await run(['exec', '--', 'wrangler', 'd1', 'migrations', 'apply', 'DB', '--local']);
  await run(['run','build:frameworks'], fileURLToPath(new URL('../../', import.meta.url)));
  await run(['run', 'demo:build'], fileURLToPath(new URL('../../', import.meta.url)));
  await run(['run', 'payload', '--', 'generate:importmap']);
  await run(['run', 'types']);
  await run(['run', 'payload', '--', 'generate:types']);
  await run(['run', 'build:worker']);
  await run(['run', 'build', '--workspace', '@worker-kit/dashboard', '--', '--base=/dashboard/'], root);
  const { spawn: spawnNode } = await import('node:child_process');
  await new Promise((resolve, reject) => {
    const child = spawnNode(process.execPath, [fileURLToPath(new URL('./assemble-frontends.mjs', import.meta.url))], { stdio: 'inherit' });
    child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error('Frontend assembly failed')));
  });
  await run(['run', 'dry-run']);
}
if (process.argv.includes('--preview')) await run(['run', 'preview:worker']);
console.log('Single Worker preview: http://kit.localhost:5184/ — Payload and SonicJS run in this same Worker. Dashboard and CMS credentials: examples/payload-dashboard/app/.env.');
