import test from 'node:test';
import assert from 'node:assert/strict';
import { needsVisual, needsIntegration } from '../../scripts/ci-changes.mjs';

test('backend-only changes skip visual work, while UI, API contracts and dependencies retain it', () => {
  assert.equal(
    needsVisual([
      'src/server/health.ts',
      'test/runtime.test.ts',
      'docs/runtime-status.md',
    ]),
    false,
  );
  for (const file of [
    'src/web/layout.tsx',
    'src/client/api.ts',
    'src/client/session.ts',
    'src/contracts/runtime.ts',
    'src/modules/index.ts',
    'examples/dashboard/server/api-description.ts',
    'e2e/layout.spec.ts',
    'package-lock.json',
    '.github/workflows/check.yml',
  ])
    assert.equal(needsVisual([file]), true, file);
});

test('native examples, shared auth, starter code and preview checks select real integration tests', () => {
  for (const file of [
    'examples/ui-suite/preview.js',
    'examples/ui-suite/preview-protocol.js',
    'examples/ui-demo/operations.js',
    'examples/docs/architecture.md',
    'examples/nuxthub-dashboard/app/app/app.vue',
    'src/server/management.ts',
    'src/vue/index.ts',
    'src/tooling/hub-template.mjs',
    'scripts/check-native-hub.mjs',
    'scripts/browser.mjs',
    'scripts/local-worker.mjs',
    'test/management.test.ts',
  ])
    assert.equal(needsIntegration([file]), true, file);
  assert.equal(needsIntegration(['docs/notes.md', 'README.md']), false);
});
