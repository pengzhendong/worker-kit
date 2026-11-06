import { access, chmod, cp } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { build } from 'vite';
const run = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn('npm', args, { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 ? resolve() : reject(new Error('npm exited ' + code)),
    );
  });
async function setup() {
  try {
    await access('.dev.vars');
  } catch {
    await cp('.dev.vars.example', '.dev.vars');
    await chmod('.dev.vars', 0o600);
  }
  await run([
    'exec',
    '--',
    'wrangler',
    'd1',
    'migrations',
    'apply',
    'DB',
    '--local',
  ]);
}
async function compile() {
  await build({
    configFile: false,
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    build: {
      outDir: 'public/management-assets',
      lib: {
        entry: 'scripts/reference.ts',
        formats: ['es'],
        fileName: () => 'reference.js',
        cssFileName: 'reference',
      },
    },
  });
  await run(['exec', '--', 'nuxt', 'build']);
}
const action = process.argv[2];
if (action === 'setup') await setup();
else if (action === 'build') await compile();
else if (action === 'dev') {
  await setup();
  await compile();
  await run([
    'exec',
    '--',
    'wrangler',
    'dev',
    '--local',
    '--ip',
    '127.0.0.1',
    '--port',
    '8787',
  ]);
} else if (action === 'check') {
  await run(['exec', '--', 'nuxt', 'typecheck']);
  await compile();
  await run(['exec', '--', 'wrangler', 'types']);
  await run(['exec', '--', 'wrangler', 'deploy', '--dry-run']);
} else throw new Error('Unknown project action');
