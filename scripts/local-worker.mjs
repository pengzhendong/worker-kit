import { spawn } from 'node:child_process';
import { connect } from 'node:net';
import path from 'node:path';

/** Start only a local workerd process owned by this check. Never attach to an existing service. */
export async function startLocalWorker({
  cwd,
  port,
  readyUrl,
  stderr = 'inherit',
}) {
  const occupied = await new Promise((resolve) => {
    const socket = connect({ host: '127.0.0.1', port });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
  if (occupied) throw new Error(`Local check port ${port} is already in use`);
  const child = spawn(
    process.execPath,
    [
      path.join(cwd, 'node_modules/wrangler/bin/wrangler.js'),
      'dev',
      '--local',
      '--ip',
      '127.0.0.1',
      '--port',
      String(port),
      '--inspector-port',
      String(port + 100),
    ],
    { cwd, stdio: ['ignore', 'ignore', stderr] },
  );
  let exited = false;
  const stopped = new Promise((resolve) =>
    child.once('exit', () => {
      exited = true;
      resolve();
    }),
  );
  const stop = async () => {
    if (exited) return;
    child.kill('SIGINT');
    const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
    await stopped;
    clearTimeout(timer);
  };
  try {
    const deadline = Date.now() + 60000;
    while (true) {
      if (exited) throw new Error('Local Worker exited before readiness');
      try {
        if (
          (await fetch(readyUrl, { signal: AbortSignal.timeout(2000) }))
            .status === 401
        )
          break;
      } catch {
        /* starting */
      }
      if (Date.now() > deadline)
        throw new Error('Local Worker did not become ready');
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return { stop };
  } catch (error) {
    await stop();
    throw error;
  }
}
