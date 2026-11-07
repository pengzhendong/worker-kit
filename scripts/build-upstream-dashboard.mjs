import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureSource, pins } from './ui-upstreams.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export async function prepareReviewedDashboard(
  name,
  work,
  { comparison = false } = {},
) {
  if (!['pure', 'soybean'].includes(name))
    throw Error('Choose pure or soybean');
  const source = await ensureSource(name);
  await mkdir(work, { recursive: true });
  // Refresh reviewed upstream source, retain only its dependency cache.
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (
      ['node_modules', '.git', '.workerkit-verified.json'].includes(entry.name)
    )
      continue;
    const target = path.join(work, entry.name);
    await rm(target, { recursive: true, force: true });
    await cp(path.join(source, entry.name), target, { recursive: true });
  }
  const bridge = path.join(work, 'src/workerkit');
  await mkdir(bridge, { recursive: true });
  for (const file of [
    'useWorkspace.ts',
    'DemoFiles.vue',
    ...(comparison
      ? [
          'LibraryDemos.vue',
          name === 'pure' ? 'ElementDemos.vue' : 'NaiveDemos.vue',
        ]
      : []),
    name === 'pure' ? 'ElementWorkspace.vue' : 'NaiveWorkspace.vue',
    'style.css',
  ]) {
    const content = (
      await readFile(
        path.join(root, 'examples/vue-components/src', file),
        'utf8',
      )
    )
      .replace('../../ui-demo/operations', './operations')
      .replace('../../ui-demo/demo-settings', './demo-settings')
      .replace('../../ui-demo/component-fixtures', './component-fixtures');
    await writeFile(path.join(bridge, file), content);
  }
  for (const file of [
    'operations.js',
    'operations.d.ts',
    'backend-session.ts',
    ...(comparison
      ? ['demo-settings.ts', 'component-fixtures.ts', 'fixtures.json']
      : []),
  ]) {
    const content = (
      await readFile(path.join(root, 'examples/ui-demo', file), 'utf8')
    ).replaceAll('../../src/', path.join(root, 'src/'));
    await writeFile(path.join(bridge, file), content);
  }
  await cp(
    path.join(root, 'examples/nuxt-dashboard/public/favicon.svg'),
    path.join(work, 'public/favicon.svg'),
  );
  const { adapt } = await import(`../examples/${name}-dashboard/adapter.mjs`);
  await adapt(work, { comparison });
  if (comparison)
    await cp(
      path.join(root, 'examples/nuxt-dashboard/public/media'),
      path.join(work, 'public/media'),
      { recursive: true },
    );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const name = process.argv[2],
    work = path.join(root, '.wrangler/ui-build', name + '-dashboard');
  await prepareReviewedDashboard(name, work, { comparison: true });
  const run = (args, command = 'pnpm') =>
    new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: work,
        stdio: 'inherit',
        env: {
          ...process.env,
          VITE_PUBLIC_PATH: `/${name}/`,
          VITE_ROUTER_HISTORY: `h5,/${name}/`,
          VITE_BASE_URL: `/${name}/`,
          VITE_AUTH_ROUTE_MODE: 'static',
          VITE_CDN: 'false',
          WORKERKIT_DEMO_BASE: `/${name}/`,
        },
      });
      child.once('error', reject);
      child.once('exit', (code) =>
        code === 0
          ? resolve()
          : reject(
              Error('Upstream ' + name + ' command failed: ' + args.join(' ')),
            ),
      );
    });
  await run(['install', '--frozen-lockfile', '--ignore-scripts']);
  if (name === 'soybean')
    await run(
      [
        '--input-type=module',
        '-e',
        "import{build}from'vite-plus';await build({mode:'prod'});",
      ],
      'node',
    );
  else await run(['exec', 'vite', 'build', '--mode', 'production']);
  await cp(path.join(work, 'LICENSE'), path.join(work, 'dist/LICENSE.txt'));
  await writeFile(
    path.join(work, 'dist/workerkit-source.json'),
    JSON.stringify({ name, ...pins[name] }, null, 2),
  );
  console.log(
    'Built reviewed ' +
      name +
      ' native dashboard at ' +
      path.join(work, 'dist'),
  );
}
