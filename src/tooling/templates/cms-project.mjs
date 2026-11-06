import {
  access,
  chmod,
  cp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const config = JSON.parse(
  await readFile(path.join(root, 'workerkit.json'), 'utf8'),
);
const server = path.join(root, 'server');
const exists = async (file) => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};
const run = (command, args, cwd = root, env = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, ...env },
    });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(Error(command + ' exited ' + code)),
    );
  });
const npm = (args) => run('npm', args, server);
async function setup() {
  if (
    !(await exists(
      path.join(
        server,
        'node_modules',
        config.backend === 'payload'
          ? 'payload/package.json'
          : '@sonicjs-cms/core/package.json',
      ),
    ))
  )
    await npm([
      (await exists(path.join(server, 'package-lock.json'))) ? 'ci' : 'install',
      '--workspaces=false',
      '--no-audit',
      '--no-fund',
    ]);
  let text = (await exists(path.join(server, '.env')))
    ? await readFile(path.join(server, '.env'), 'utf8')
    : await readFile(path.join(server, '.env.example'), 'utf8');
  const settings = Object.fromEntries(
    text
      .split('\n')
      .filter((x) => x.includes('='))
      .map((x) => {
        const i = x.indexOf('=');
        return [x.slice(0, i), x.slice(i + 1)];
      }),
  );
  const secret =
    config.backend === 'payload' ? 'PAYLOAD_SECRET' : 'SONIC_AUTH_SECRET';
  if (!settings[secret]) {
    settings[secret] = randomBytes(32).toString('hex');
    text = text.replace(
      new RegExp('^' + secret + '=.*$', 'm'),
      secret + '=' + settings[secret],
    );
  }
  await writeFile(path.join(server, '.env'), text, { mode: 0o600 });
  await writeFile(
    path.join(server, '.dev.vars'),
    secret + '=' + settings[secret] + '\n',
    { mode: 0o600 },
  );
  await chmod(path.join(server, '.env'), 0o600);
  await chmod(path.join(server, '.dev.vars'), 0o600);
  await npm(['run', 'migrate']);
  await npm(['run', 'bootstrap']);
  await npm(['run', 'types']);
}
async function build() {
  let output;
  if (config.frontend === 'vben') {
    await run(
      process.execPath,
      ['vendor/worker-kit/examples/vben-dashboard/setup.mjs', '--build'],
      root,
      {
        WORKERKIT_DEMO_BASE: '/app/',
        WORKERKIT_VBEN_APP: path.join(root, 'web'),
        WORKERKIT_SHARED: path.join(root, 'shared'),
        WORKERKIT_PUBLIC: path.join(root, 'web/public'),
      },
    );
    const paths = await import(
      path.join(root, 'vendor/worker-kit/examples/vben-dashboard/paths.mjs')
    );
    output = paths.vbenBuildDirectory;
  } else {
    await run('npm', ['run', 'build', '--workspace', '@app/web'], root, {
      WORKERKIT_DEMO_BASE: '/app/',
      WORKERKIT_DEMO_KIND: config.frontend,
    });
    output = path.join(
      root,
      'web',
      config.frontend === 'docs'
        ? '.vitepress/dist'
        : ['pro', 'refine', 'tabler', 'adminlte'].includes(config.frontend)
          ? 'dist/' + config.frontend
          : 'dist',
    );
  }
  // This fixed directory is build-owned; never remove CMS files or user uploads.
  const assets = path.join(server, 'public/app');
  await rm(assets, { recursive: true, force: true });
  await mkdir(assets, { recursive: true });
  await cp(output, assets, { recursive: true });
  const { build: buildReference } = await import('vite');
  await buildReference({
    configFile: false,
    root,
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    build: {
      outDir: path.join(server, 'public/management-assets'),
      lib: {
        entry: path.join(root, 'shared/reference.ts'),
        formats: ['es'],
        fileName: () => 'reference.js',
        cssFileName: 'reference',
      },
    },
  });
  if (config.backend === 'payload') {
    await npm(['run', 'payload', '--', 'generate:importmap']);
    await npm(['run', 'payload', '--', 'generate:types']);
    await npm(['run', 'build:worker']);
  }
}
const action = process.argv[2];
if (action === 'setup') await setup();
else if (action === 'build') await build();
else if (action === 'dev') {
  await setup();
  await build();
  await npm(['run', 'preview']);
} else if (action === 'check') {
  await npm(['run', 'types']);
  await run('npx', ['tsc', '--noEmit'], server);
  await build();
  await npm(['run', 'dry-run']);
} else throw Error('Unknown project command');
