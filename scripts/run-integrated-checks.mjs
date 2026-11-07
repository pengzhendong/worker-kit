import { spawn } from 'node:child_process';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startLocalWorker } from './local-worker.mjs';

const app = fileURLToPath(
  new URL('../examples/payload-dashboard/app/', import.meta.url),
);
const persistTo = await mkdtemp(join(tmpdir(), 'workerkit-integration-'));
let server;
try {
  // Reuse provisioned local accounts and schemas. Task objects and the
  // rest of the writable test state start empty in this isolated Worker.
  await cp(join(app, '.wrangler/state/v3/d1'), join(persistTo, 'v3/d1'), {
    recursive: true,
  });
  server = await startLocalWorker({
    cwd: app,
    port: 5184,
    readyUrl: 'http://kit.localhost:5184/native/api/auth/session',
    persistTo,
  });
  for (const script of [
    'check-composition.mjs',
    'check-preview-switching.mjs',
    'check-preview-preloading.mjs',
    'check-workspace-layout.mjs',
    'check-native-hub.mjs',
    'check-management-parity.mjs',
  ]) {
    console.log('Checking ' + script);
    await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [fileURLToPath(new URL(script, import.meta.url))],
        { stdio: 'inherit' },
      );
      child.once('error', reject);
      child.once('exit', (code) =>
        code === 0 ? resolve() : reject(new Error(script + ' exited ' + code)),
      );
    });
  }
} finally {
  await server?.stop();
  await rm(persistTo, { recursive: true, force: true });
}
