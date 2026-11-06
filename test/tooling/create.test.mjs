import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createProject, syncKit } from '../../src/tooling/create.mjs';
const kit = path.resolve('.');
const read = async (...p) => JSON.parse(await readFile(path.join(...p), 'utf8'));
const has = async file => { try { await access(file); return true; } catch { return false; } };
test('creates all sixteen native frontend/backend combinations without copying local state or the other CMS', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'workerkit-create-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  t.mock.method(console, 'log', () => {});
  for (const frontend of ['nuxt', 'prime', 'vben', 'pro', 'refine', 'tabler', 'adminlte', 'docs']) for (const backend of ['payload', 'sonic']) {
    const target = path.join(root, frontend + '-' + backend);
    await createProject([target, '--frontend', frontend, '--backend', backend]);
    const pkg = await read(target, 'server/package.json');
    assert.equal(Boolean(pkg.dependencies.payload), backend === 'payload');
    assert.equal(Boolean(pkg.dependencies['@sonicjs-cms/core']), backend === 'sonic');
    const config = await read(target, 'server/wrangler.jsonc');
    assert.equal(config.d1_databases.length, 1); assert.equal(config.r2_buckets.length, 1);
    assert.equal(config.durable_objects.bindings.length, 1);
    assert.equal((await read(target, 'workerkit.json')).frontend, frontend);
    assert.equal((await read(target, 'vendor/worker-kit/source.json')).digest.length, 64);
    for (const file of ['.env', '.dev.vars', '.wrangler', '.open-next', 'node_modules', 'package-lock.json']) assert.equal(await has(path.join(target, 'server', file)), false);
    execFileSync(process.execPath, ['--check', path.join(target, 'scripts/project.mjs')], { stdio: 'pipe' });
    if (backend === 'payload') { assert.equal(pkg.scripts.build, 'next build --webpack'); assert.equal(pkg.scripts['build:worker'], 'opennextjs-cloudflare build'); }
  }
});
test('refuses invalid selections and existing destinations, and keeps source sync separate from business code', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'workerkit-sync-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  t.mock.method(console, 'log', () => {});
  const target = path.join(root, 'app');
  await assert.rejects(createProject([target, '--frontend', 'unknown', '--backend', 'payload']), /Usage/);
  await createProject([target, '--frontend', 'nuxt', '--backend', 'sonic']);
  await assert.rejects(createProject([target, '--frontend', 'nuxt', '--backend', 'sonic']), /already exists/);
  const vendor = path.join(target, 'vendor/worker-kit/src/server/task-manager.ts');
  const original = await readFile(vendor, 'utf8'); await writeFile(vendor, original + '\n// local edit');
  await assert.rejects(syncKit([target, '--source', kit]), /Vendor file changed/);
  assert.equal(await readFile(vendor, 'utf8'), original + '\n// local edit');
  await writeFile(vendor, original);
  const business = path.join(target, 'server/src/business/tasks.ts');
  const custom = '// business owned by the consuming application'; await writeFile(business, custom);
  await syncKit([target, '--source', kit]);
  assert.equal(await readFile(business, 'utf8'), custom);
  assert.equal(await readFile(vendor, 'utf8'), original);
});
