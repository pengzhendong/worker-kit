import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const app = fileURLToPath(
  new URL('../examples/payload-dashboard/app/', import.meta.url),
);
import { startLocalWorker } from './local-worker.mjs';
const server = await startLocalWorker({
  cwd: app,
  port: 5184,
  readyUrl: 'http://kit.localhost:5184/native/api/auth/session',
});
try {
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
  await server.stop();
}
