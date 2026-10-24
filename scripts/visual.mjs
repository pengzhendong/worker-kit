import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const result = spawnSync('docker', [
  'run', '--rm', '--platform=linux/amd64', '--ipc=host',
  '-e', 'CI=1', '-e', 'WORKERKIT_VISUAL_ENV=playwright-linux-amd64',
  '--mount', `type=bind,source=${root},target=/work`,
  '--mount', 'type=volume,target=/work/node_modules',
  '--mount', 'type=volume,target=/work/examples/dashboard/node_modules',
  '-w', '/work', 'mcr.microsoft.com/playwright:v1.64.1-noble@sha256:47b510dd9230bf0b9bfc9b20102241e577ea7a99334ab4c3ca19f19770e9b8ea',
  'bash', '-lc', 'npm ci && npm run test:ui:run -- "$@"', '--', ...process.argv.slice(2),
], { stdio: 'inherit' });
if (result.error) console.error('UI screenshots require Docker. Start Docker and rerun npm run test:ui.', result.error.message);
process.exit(result.status ?? 1);
