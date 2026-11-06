import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  cp,
  rm,
  readFile,
  writeFile,
  readdir,
  open,
} from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { request, chromium, expect } from '@playwright/test';
import { browserOptions } from './browser.mjs';
import { createProject, syncKit, rollbackKit } from '../src/tooling/create.mjs';
import { startLocalWorker } from './local-worker.mjs';
const kit = fileURLToPath(new URL('../', import.meta.url));
const scratch = await mkdtemp(path.join(tmpdir(), 'workerkit-generated-'));
await mkdir('test-results/generated', { recursive: true });
const run = async (cwd, args, output) => {
  const log = await open(output, 'a');
  try {
    await new Promise((resolve, reject) => {
      const child = spawn('npm', args, {
        cwd,
        stdio: ['ignore', log.fd, log.fd],
      });
      child.once('error', reject);
      child.once('exit', (code) =>
        code === 0
          ? resolve()
          : reject(
              new Error(
                'Generated app failed: npm ' +
                  args.join(' ') +
                  '; inspect ' +
                  output,
              ),
            ),
      );
    });
  } finally {
    await log.close();
  }
};
try {
  const selected = process.env.WORKERKIT_GENERATED_BACKENDS?.split(',') || [
    'native',
    'hub',
  ];
  assert(
    selected.length &&
      selected.every((item) => ['native', 'hub'].includes(item)),
    'Unsupported generated backend',
  );
  for (const [backend, port] of [
    ['native', 18786],
    ['hub', 18787],
  ]) {
    if (!selected.includes(backend)) continue;
    const project = path.join(scratch, backend),
      log = path.join(kit, 'test-results/generated', backend + '.log');
    console.log('Creating a fresh ' + backend + ' application');
    await createProject([project, '--frontend', 'nuxt', '--backend', backend]);
    await run(project, ['install', '--no-audit', '--no-fund'], log);
    await run(project, ['run', 'setup'], log);
    const variables = await readFile(path.join(project, '.dev.vars'), 'utf8');
    await run(project, ['run', 'setup'], log);
    assert.equal(
      await readFile(path.join(project, '.dev.vars'), 'utf8'),
      variables,
    );
    await run(project, ['run', 'check'], log);
    const origin = 'http://127.0.0.1:' + port,
      prefix = backend === 'hub' ? '/hub/api/admin' : '/native/api';
    const server = await startLocalWorker({
      cwd: project,
      port,
      readyUrl: origin + prefix + '/auth/session',
    });
    const api = await request.newContext();
    let plan;
    try {
      const headers = { Origin: origin };
      assert.equal(
        (
          await api.post(origin + prefix + '/auth/login', {
            headers,
            data: { username: 'admin', password: 'password' },
          })
        ).status(),
        200,
      );
      const workspace = await (
        await api.get(origin + prefix + '/workspace')
      ).json();
      assert.equal(workspace.management.capabilities.tasks.manage, true);
      assert.equal(workspace.management.capabilities.keys.manage, true);
      const created = await api.post(origin + prefix + '/managed-tasks', {
        headers,
        data: {
          task: 'check-bindings',
          inputs: {},
          schedule: { kind: 'interval', minutes: 60 },
        },
      });
      assert.equal(created.status(), 201);
      plan = (await created.json()).id;
      assert.equal(
        (
          await api.post(origin + prefix + '/managed-tasks/run', {
            headers,
            data: { id: plan },
          })
        ).status(),
        200,
      );
      assert.equal(
        (
          await (await api.get(origin + prefix + '/workspace')).json()
        ).runs.some((run) => run.planId === plan && run.status === 'succeeded'),
        true,
      );
      assert.equal(
        (await api.get(origin + prefix + '/reference')).status(),
        200,
      );
      assert.equal(
        (await api.get(origin + '/management-assets/reference.js')).status(),
        200,
      );
      if (backend === 'native')
        assert.equal(
          (await api.get(origin + '/native/assets/reference.js')).status(),
          200,
        );
      const browser = await chromium.launch(browserOptions);
      try {
        const context = await browser.newContext({
          storageState: await api.storageState(),
        });
        const page = await context.newPage();
        await page.goto(
          origin + (backend === 'native' ? '/native/#/tasks' : '/hub/'),
        );
        await expect(page.locator('[data-workspace]')).toContainText(
          '依赖正常',
          { timeout: 30000 },
        );
        if (backend === 'hub')
          await expect(page.locator('[data-management]')).toBeVisible();
        else {
          await page
            .getByRole('link', { name: 'KV 设置', exact: true })
            .click();
          await expect(
            page.getByLabel('站点名称', { exact: true }),
          ).toBeVisible();
        }
      } finally {
        await browser.close();
      }
      console.log(
        'PASS fresh ' +
          backend +
          ': install, repeated setup, types, build, dry-run, real session and persistent task',
      );
    } finally {
      if (plan)
        await api
          .post(origin + prefix + '/managed-tasks/pause', {
            headers: { Origin: origin },
            data: { id: plan },
          })
          .catch(() => {});
      await api.dispose();
      await server.stop();
    }
    if (backend === 'native') {
      const before = JSON.parse(
        await readFile(
          path.join(project, 'vendor/worker-kit/source.json'),
          'utf8',
        ),
      );
      const business = await readFile(path.join(project, 'worker.ts'), 'utf8'),
        reviewed = path.join(scratch, 'reviewed');
      await cp(path.join(kit, 'src'), path.join(reviewed, 'src'), {
        recursive: true,
      });
      await cp(
        path.join(kit, 'package.json'),
        path.join(reviewed, 'package.json'),
      );
      const file = path.join(reviewed, 'src/client/openapi.ts');
      await writeFile(
        file,
        (await readFile(file, 'utf8')) + '\n// reviewed SDK upgrade fixture\n',
      );
      await syncKit([project, '--source', reviewed]);
      await run(project, ['install', '--no-audit', '--no-fund'], log);
      await run(project, ['run', 'check'], log);
      const backup = (await readdir(path.join(project, 'vendor'))).find(
        (name) => name.startsWith('worker-kit.previous-'),
      );
      await rollbackKit([project, '--backup', backup]);
      await run(project, ['install', '--no-audit', '--no-fund'], log);
      await run(project, ['run', 'check'], log);
      assert.equal(
        JSON.parse(
          await readFile(
            path.join(project, 'vendor/worker-kit/source.json'),
            'utf8',
          ),
        ).digest,
        before.digest,
      );
      assert.equal(
        await readFile(path.join(project, 'worker.ts'), 'utf8'),
        business,
      );
      console.log(
        'PASS native snapshot upgrade and rollback: app source and local variables preserved',
      );
    }
  }
} finally {
  if (process.env.WORKERKIT_KEEP_GENERATED !== '1')
    await rm(scratch, { recursive: true, force: true });
  else console.log('Generated fixtures retained at ' + scratch);
}
