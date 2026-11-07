import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  readFile,
  writeFile,
  rm,
  access,
  readdir,
  cp,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  createProject,
  syncKit,
  rollbackKit,
} from '../../src/tooling/create.mjs';
const kit = path.resolve('.');
const read = async (...p) =>
  JSON.parse(await readFile(path.join(...p), 'utf8'));
const has = async (file) => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};
test('creates all component-library and native frontend/backend combinations without copying local state or the other CMS', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'workerkit-create-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  t.mock.method(console, 'log', () => {});
  for (const frontend of [
    'nuxt',
    'prime',
    'element',
    'naive',
    'shadcn',
    'vuetify',
    'quasar',
    'mui',
    'mantine',
    'vben',
    'pro',
    'refine',
    'tabler',
    'adminlte',
    'docs',
  ])
    for (const backend of ['payload', 'sonic']) {
      const target = path.join(root, frontend + '-' + backend);
      await createProject([
        target,
        '--frontend',
        frontend,
        '--backend',
        backend,
      ]);
      const pkg = await read(target, 'server/package.json');
      assert.equal(Boolean(pkg.dependencies.payload), backend === 'payload');
      assert.equal(
        Boolean(pkg.dependencies['@sonicjs-cms/core']),
        backend === 'sonic',
      );
      const config = await read(target, 'server/wrangler.jsonc');
      assert.equal(config.d1_databases.length, 1);
      assert.equal(config.r2_buckets.length, 1);
      assert.equal(config.durable_objects.bindings.length, 1);
      assert.equal((await read(target, 'workerkit.json')).frontend, frontend);
      assert.equal(
        (await read(target, 'vendor/worker-kit/source.json')).digest.length,
        64,
      );
      assert.equal(
        await has(path.join(target, 'vendor/worker-kit/src/web')),
        false,
      );
      assert.equal(
        await has(path.join(target, 'vendor/worker-kit/src/tooling/vite.ts')),
        false,
      );
      assert.equal(
        await has(path.join(target, 'vendor/worker-kit/src/client/index.ts')),
        true,
      );
      for (const file of [
        'fixtures.json',
        'store.js',
        'data.ts',
        'component-pages.json',
      ])
        assert.equal(await has(path.join(target, 'shared', file)), false);
      assert.equal(await has(path.join(target, 'web/public/media')), false);
      assert.equal(
        await has(path.join(target, 'web/public/favicon.svg')),
        true,
      );
      if (frontend !== 'vben')
        assert.equal(
          Boolean(
            (await read(target, 'web/package.json')).dependencies?.echarts,
          ),
          false,
        );
      for (const file of [
        '.env',
        '.dev.vars',
        '.wrangler',
        '.open-next',
        'node_modules',
        'package-lock.json',
      ])
        assert.equal(await has(path.join(target, 'server', file)), false);
      execFileSync(
        process.execPath,
        ['--check', path.join(target, 'scripts/project.mjs')],
        { stdio: 'pipe' },
      );
      if (backend === 'payload') {
        assert.equal(pkg.scripts.build, 'next build --webpack');
        assert.equal(
          pkg.scripts['build:worker'],
          'opennextjs-cloudflare build',
        );
      }
    }
});
test('refuses invalid selections and existing destinations, and keeps source sync separate from business code', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'workerkit-sync-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  t.mock.method(console, 'log', () => {});
  const target = path.join(root, 'app');
  await assert.rejects(
    createProject([
      path.join(kit, '..inside-fixture'),
      '--frontend',
      'nuxt',
      '--backend',
      'native',
    ]),
    /outside/,
  );
  await assert.rejects(
    createProject([target, '--frontend', 'unknown', '--backend', 'payload']),
    /Usage/,
  );
  await createProject([target, '--frontend', 'nuxt', '--backend', 'sonic']);
  await assert.rejects(
    createProject([target, '--frontend', 'nuxt', '--backend', 'sonic']),
    /already exists/,
  );
  const vendor = path.join(
    target,
    'vendor/worker-kit/src/server/task-manager.ts',
  );
  const original = await readFile(vendor, 'utf8');
  await writeFile(vendor, original + '\n// local edit');
  await assert.rejects(
    syncKit([target, '--source', kit]),
    /Vendor file changed/,
  );
  assert.equal(await readFile(vendor, 'utf8'), original + '\n// local edit');
  await writeFile(vendor, original);
  const business = path.join(target, 'server/src/business/tasks.ts');
  const custom = '// business owned by the consuming application';
  await writeFile(business, custom);
  await syncKit([target, '--source', kit]);
  assert.equal(await readFile(business, 'utf8'), custom);
  assert.equal(await readFile(vendor, 'utf8'), original);
});
test('creates a CMS-free native starter, preserving explicit frontend support and source ownership', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'workerkit-native-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  t.mock.method(console, 'log', () => {});
  const app = path.join(root, 'app');
  await createProject([app, '--frontend', 'nuxt', '--backend', 'native']);
  const pkg = await read(app, 'package.json');
  assert.equal(pkg.dependencies.payload, undefined);
  assert.equal(pkg.dependencies['@sonicjs-cms/core'], undefined);
  const config = await read(app, 'wrangler.jsonc');
  assert.equal(config.kv_namespaces.length, 1);
  assert.equal(config.d1_databases, undefined);
  assert.equal(config.r2_buckets, undefined);
  assert.equal((await read(app, 'workerkit.json')).backend, 'native');
  assert.equal(await has(path.join(app, 'web/src/pages/keys.vue')), true);
  execFileSync(
    process.execPath,
    ['--check', path.join(app, 'scripts/project.mjs')],
    { stdio: 'pipe' },
  );
  await assert.rejects(
    createProject([
      path.join(root, 'other'),
      '--frontend',
      'vben',
      '--backend',
      'native',
    ]),
    /currently supports/,
  );
});

test('creates a complete NuxtHub application with one Worker and app-owned storage schema', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'workerkit-hub-create-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  t.mock.method(console, 'log', () => {});
  const target = path.join(root, 'app');
  await createProject([target, '--frontend', 'nuxt', '--backend', 'hub']);
  const pkg = await read(target, 'package.json'),
    config = await read(target, 'wrangler.jsonc');
  assert.equal(pkg.dependencies.payload, undefined);
  assert.equal(pkg.dependencies['@sonicjs-cms/core'], undefined);
  assert.equal(pkg.dependencies['@nuxthub/core'], '0.10.12');
  assert.equal(config.d1_databases.length, 1);
  assert.equal(config.kv_namespaces.length, 3);
  assert.equal(
    config.durable_objects.bindings[0].class_name,
    'WorkerKitHubTasks',
  );
  assert.equal(
    await has(path.join(target, 'server/db/migrations/sqlite/0001_notes.sql')),
    true,
  );
  assert.equal(
    await has(path.join(target, 'shared/ui/NuxtWorkspace.vue')),
    true,
  );
  for (const file of [
    'node_modules',
    '.nuxt',
    '.output',
    '.wrangler',
    '.data',
    '.env',
    '.dev.vars',
    'package-lock.json',
  ])
    assert.equal(await has(path.join(target, file)), false);
  execFileSync(
    process.execPath,
    ['--check', path.join(target, 'scripts/project.mjs')],
    { stdio: 'pipe' },
  );
});

test('snapshot upgrade and rollback preserve business and refuse modified vendor files or unsafe backups', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'workerkit-rollback-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  t.mock.method(console, 'log', () => {});
  const app = path.join(root, 'app'),
    reviewed = path.join(root, 'reviewed');
  await createProject([app, '--frontend', 'nuxt', '--backend', 'native']);
  const before = await read(app, 'vendor/worker-kit/source.json');
  await cp(path.join(kit, 'src'), path.join(reviewed, 'src'), {
    recursive: true,
  });
  await cp(path.join(kit, 'package.json'), path.join(reviewed, 'package.json'));
  const shared = path.join(reviewed, 'src/client/openapi.ts');
  await writeFile(
    shared,
    (await readFile(shared, 'utf8')) + '\n// reviewed upgrade fixture\n',
  );
  const business = path.join(app, 'worker.ts'),
    custom = '// application-owned worker\n';
  await writeFile(business, custom);
  await syncKit([app, '--source', reviewed]);
  assert.notEqual(
    (await read(app, 'vendor/worker-kit/source.json')).digest,
    before.digest,
  );
  const backup = (await readdir(path.join(app, 'vendor'))).find((file) =>
    file.startsWith('worker-kit.previous-'),
  );
  const vendor = path.join(app, 'vendor/worker-kit/src/client/openapi.ts'),
    upgraded = await readFile(vendor, 'utf8');
  await writeFile(vendor, upgraded + '\n// local edit');
  await assert.rejects(
    rollbackKit([app, '--backup', backup]),
    /Vendor file changed/,
  );
  await writeFile(vendor, upgraded);
  await assert.rejects(
    rollbackKit([app, '--backup', '../../outside']),
    /Usage/,
  );
  await rollbackKit([app, '--backup', backup]);
  assert.equal(
    (await read(app, 'vendor/worker-kit/source.json')).digest,
    before.digest,
  );
  assert.equal(await readFile(business, 'utf8'), custom);
});
