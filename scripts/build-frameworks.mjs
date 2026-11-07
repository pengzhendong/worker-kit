import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
for (const name of ['sveltekit', 'astro', 'react-router']) {
  const cwd = path.join(root, 'examples', name + '-dashboard');
  for (const args of [
    ['ci', '--workspaces=false', '--include=dev', '--no-audit', '--no-fund'],
    ['run', 'build'],
  ])
    await new Promise((resolve, reject) => {
      const child = spawn('npm', args, { cwd, stdio: 'inherit' });
      child.once('error', reject);
      child.once('exit', (c) =>
        c === 0
          ? resolve()
          : reject(Error(name + ' failed: ' + args.join(' '))),
      );
    });
}
