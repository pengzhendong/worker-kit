import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'vite';

test('native backend exports bundle without resolving Hono, React or OpenAPI peers', async () => {
  const result = await build({ configFile: false, logLevel: 'silent', build: { write: false, minify: false,
    lib: { entry: { runtime: 'src/server/runtime-entry.ts', http: 'src/server/streams.ts' }, formats: ['es'] },
  } });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap(result => result.output);
  const chunks = outputs.filter(output => output.type === 'chunk');
  assert.ok(chunks.some(chunk => chunk.code.includes('readBytesLimited')));
  assert.ok(chunks.every(chunk => Object.keys(chunk.modules).every(path => !path.includes('node_modules'))));
  // Also exercise native Node TypeScript resolution, outside a bundler.
  const { inspectRuntime } = await import('@pengzhendong/worker-kit/runtime');
  assert.equal((await inspectRuntime({ application: { name: 'native', version: '1' }, environment: 'test', checks: [] })).ok, true);
});
