import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderPreviewShell } from '../../scripts/render-preview-shell.mjs';

test('both preview builds publish a self-contained shell with the same controller', async () => {
  const standalone = await renderPreviewShell();
  const integrated = await renderPreviewShell({ integrated: true });
  assert.equal(
    integrated,
    standalone.replace('<body>', '<body data-workerkit-mode="integrated">'),
  );
  assert.doesNotMatch(
    standalone,
    /<script[^>]*\bsrc=|<link[^>]*rel="stylesheet"/,
  );
  assert.match(standalone, /<style>[\s\S]+<\/style>/);
  assert.match(standalone, /<script type="module">[\s\S]+<\/script>/);
  for (const view of [
    'nuxt',
    'prime',
    'vben',
    'pro',
    'refine',
    'tabler',
    'adminlte',
    'docs',
  ]) {
    assert.match(standalone, new RegExp(`data-view="${view}"`));
  }
});
