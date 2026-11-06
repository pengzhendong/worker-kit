import { access, cp, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const exec = promisify(execFile);
export const root = fileURLToPath(new URL('../', import.meta.url));
export const pins = JSON.parse(await readFile(path.join(root, 'ui-upstreams.json'), 'utf8'));
const exists = async file => { try { await access(file); return true; } catch { return false; } };
const sha256 = async file => createHash('sha256').update(await readFile(file)).digest('hex');

export async function ensureSource(name) {
  const pin = pins[name];
  if (!pin || !/^[a-f0-9]{40}$/.test(pin.commit) || !/^[a-f0-9]{64}$/.test(pin.sha256)) throw new Error(`Invalid upstream pin: ${name}`);
  const cache = path.join(root, '.wrangler/ui-upstreams', `${name}-${pin.commit}`);
  const archive = `${cache}.tar.gz`;
  await mkdir(path.dirname(cache), { recursive: true });
  if (!await exists(archive)) {
    const tmp = `${archive}.download`;
    console.log(`Downloading ${name}@${pin.commit.slice(0, 8)}`);
    await exec('curl', ['-fL', '--retry', '2', '--max-time', '300', `https://codeload.github.com/${pin.repository}/tar.gz/${pin.commit}`, '-o', tmp]);
    if (await sha256(tmp) !== pin.sha256) throw new Error(`Archive checksum mismatch: ${name}`);
    await rename(tmp, archive);
  }
  if (await sha256(archive) !== pin.sha256) throw new Error(`Cached archive checksum mismatch: ${name}`);
  if (!await exists(path.join(cache, '.workerkit-verified.json'))) {
    const staging = `${cache}.extract-${process.pid}`;
    await mkdir(staging, { recursive: true });
    await exec('tar', ['-xzf', archive, '-C', staging, '--strip-components=1']);
    await writeFile(path.join(staging, '.workerkit-verified.json'), JSON.stringify(pin, null, 2));
    await rename(staging, cache);
  }
  return cache;
}

export async function syncSakai() {
  const upstream = await ensureSource('sakai');
  const assets = await ensureSource('sakai-assets');
  const destination = path.join(root, 'examples/prime-dashboard/src');
  const files = ['AppLayout.vue', 'AppSidebar.vue', 'AppMenuItem.vue', 'AppConfigurator.vue', 'composables/layout.js'];
  for (const file of files) {
    const target = path.join(destination, 'layout', file);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(path.join(upstream, 'src/layout', file), target);
  }
  // Keep this small accessibility adaptation explicit; fail on incompatible upstream markup.
  const menu = path.join(destination, 'layout/AppMenuItem.vue');
  let code = await readFile(menu, 'utf8');
  for (const anchor of [':href="item.url"', ':to="item.to"']) {
    if (!code.includes(anchor)) throw new Error(`Sakai navigation changed; review adapter: ${anchor}`);
    code = code.replace(anchor, `${anchor} :aria-label="item.label"`);
  }
  await writeFile(menu, code);
  await cp(path.join(assets, 'layout'), path.join(destination, 'assets/layout'), { recursive: true });
  await cp(path.join(upstream, 'LICENSE.md'), path.join(root, 'examples/prime-dashboard/LICENSE.sakai.md'));
  console.log('Sakai synced; local brand, menu and demo pages preserved.');
}

async function check() {
  const results = await Promise.allSettled(Object.entries(pins).map(async ([name, pin]) => {
    const { stdout } = await exec('curl', ['-fsSL', '--max-time', '20', `https://api.github.com/repos/${pin.repository}/commits/HEAD`], { maxBuffer: 2 * 1024 * 1024 });
    const latest = JSON.parse(stdout);
    console.log(`${name}: pinned ${pin.commit.slice(0, 8)}; upstream ${latest.sha.slice(0, 8)}${latest.sha === pin.commit ? ' (current)' : ' (review available changes)'}`);
  }));
  for (const result of results) if (result.status === 'rejected') { console.error(result.reason.message); process.exitCode = 1; }
}
async function pin(name, commit) {
  if (!pins[name] || !/^[a-f0-9]{40}$/.test(commit || '')) throw new Error('Specify a known upstream and full 40-character commit SHA.');
  const location = path.join(root, '.wrangler/ui-upstreams');
  await mkdir(location, { recursive: true });
  const archive = path.join(location, `${name}-${commit}.tar.gz`);
  const temporary = `${archive}.download`;
  await exec('curl', ['-fL', '--retry', '2', '--max-time', '300', `https://codeload.github.com/${pins[name].repository}/tar.gz/${commit}`, '-o', temporary]);
  const checksum = await sha256(temporary);
  await rename(temporary, archive);
  pins[name] = { ...pins[name], commit, sha256: checksum };
  await writeFile(path.join(root, 'ui-upstreams.json'), JSON.stringify(pins, null, 2) + '\n');
  console.log(`Pinned ${name}@${commit}; review the manifest diff, sync, and run compatibility checks.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv[2] === 'check') await check();
    else if (process.argv[2] === 'sync') { await syncSakai(); await ensureSource('vben'); }
    else if (process.argv[2] === 'pin') await pin(process.argv[3], process.argv[4]);
    else throw new Error('Usage: node scripts/ui-upstreams.mjs check|sync|pin <name> <commit>');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
