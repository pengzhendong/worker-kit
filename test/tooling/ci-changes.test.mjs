import test from 'node:test';
import assert from 'node:assert/strict';
import { needsVisual } from '../../scripts/ci-changes.mjs';

test('backend-only changes skip visual work, while UI, API contracts and dependencies retain it', () => {
  assert.equal(needsVisual(['src/server/health.ts', 'test/runtime.test.ts', 'docs/runtime-status.md']), false);
  for (const file of ['src/web/layout.tsx', 'src/contracts/runtime.ts', 'src/modules/index.ts', 'examples/dashboard/server/api-description.ts', 'e2e/layout.spec.ts', 'package-lock.json', '.github/workflows/check.yml']) assert.equal(needsVisual([file]), true, file);
});
