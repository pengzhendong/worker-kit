import { access, chmod, cp, mkdir, readFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const exists = async (file) => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};
const run = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn('npm', args, { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 ? resolve() : reject(new Error('npm exited ' + code)),
    );
  });
const action = process.argv[2];
async function setup() {
  if (!(await exists('.dev.vars'))) {
    await cp('.dev.vars.example', '.dev.vars');
    await chmod('.dev.vars', 0o600);
  }
}
async function build() {
  await run(['run', 'build', '--workspace', '@app/web']);
  await mkdir('public', { recursive: true });
  await rm('public/native', { recursive: true, force: true });
  await cp('web/dist/native', 'public/native', { recursive: true });
}
if (action === 'setup') await setup();
else if (action === 'build') await build();
else if (action === 'dev') {
  await setup();
  await build();
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
  await run(['exec', '--', 'wrangler', 'types']);
  await run(['exec', '--', 'tsc', '--noEmit']);
  await build();
  await run(['run', 'check', '--workspace', '@app/web']);
  await run(['exec', '--', 'wrangler', 'deploy', '--dry-run']);
} else throw new Error('Unknown project action');
