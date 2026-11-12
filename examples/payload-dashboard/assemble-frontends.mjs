import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { assembleSonicAssets } from './assemble-sonic-assets.mjs';
import { frontendViews, previewCategory } from '../ui-suite/catalog.js';
import { renderPreviewShell } from '../../scripts/render-preview-shell.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const source = path.join(root, 'dist/ui-suite');
const target = fileURLToPath(
  new URL('./app/.open-next/assets/', import.meta.url),
);
await mkdir(target, { recursive: true });
for (const name of frontendViews) {
  // Fail if a UI build is missing. Never silently publish a partial application.
  await readFile(path.join(source, name, 'index.html'));
  if (previewCategory(name) === 'components')
    await readFile(path.join(source, name, 'gallery/index.html'));
  for (const file of await readdir(path.join(source, name), {
    recursive: true,
  })) {
    if (
      /\.(mp4|webm|wav|mp3|ogg|m4a)$/i.test(file) &&
      (await stat(path.join(source, name, file))).size > 2 * 1024 * 1024
    )
      throw new Error(
        'Demo static media must fit 2 MiB; use the native R2 backend for larger files.',
      );
  }
}
for (const name of frontendViews) {
  await rm(path.join(target, name), { recursive: true, force: true });
  await cp(path.join(source, name), path.join(target, name), {
    recursive: true,
  });
}
await rm(path.join(target, 'pro-components'), { recursive: true, force: true });
await cp(path.join(source, 'pro-components'), path.join(target, 'pro-components'), { recursive: true });
for (const [name, directory] of [
  ['native', path.join(root, 'examples/native-dashboard/dist/native')],
  ['hub', path.join(root, 'examples/nuxthub-dashboard/app/.output/public/hub')],
]) {
  await readFile(
    path.join(directory, name === 'native' ? 'index.html' : '_headers'),
  );
  await rm(path.join(target, name), { recursive: true, force: true });
  await cp(directory, path.join(target, name), { recursive: true });
}
for (const [mount, dir] of [
  [
    'sveltekit',
    'examples/sveltekit-dashboard/.svelte-kit/cloudflare/sveltekit',
  ],
  ['astro', 'examples/astro-dashboard/dist/client/astro'],
  ['react-router', 'examples/react-router-dashboard/build/client'],
]) {
  await rm(path.join(target, mount), { recursive: true, force: true });
  await cp(path.join(root, dir), path.join(target, mount), { recursive: true });
}
for (const name of ['pure', 'soybean'])
  await cp(
    path.join(root, '.wrangler/ui-build', name + '-dashboard/LICENSE'),
    path.join(target, name, 'LICENSE.txt'),
  );
await cp(
  path.join(root, 'examples/vue-components/LICENSE.shadcn'),
  path.join(target, 'shadcn/LICENSE.txt'),
);
const shell = await renderPreviewShell({ integrated: true });
await writeFile(path.join(target, 'index.html'), shell);
await assembleSonicAssets(target);
// Only build-generated, content-hashed bundles get immutable browser caching.
// HTML, API responses and CMS documents retain their own freshness/auth rules.
await rm(path.join(target, 'management-assets'), {
  recursive: true,
  force: true,
});
await cp(
  path.join(root, 'examples/native-dashboard/dist/native/assets'),
  path.join(target, 'management-assets'),
  { recursive: true },
);
const headersFile = path.join(target, '_headers');
let headers = await readFile(headersFile, 'utf8').catch((error) => {
  if (error.code === 'ENOENT') return '';
  throw error;
});
headers = headers.replace(
  /\n?# BEGIN WorkerKit assets[\s\S]*?# END WorkerKit assets\n?/g,
  '',
);
const rules = [
  'nuxt',
  'prime',
  'primevue',
  'vben',
  'pro',
  'refine',
  'tabler',
  'adminlte',
  'docs',
].map(
  (name) =>
    `/${name}/assets/*\n  Cache-Control: public, max-age=31536000, immutable`,
);
rules.push(
  '/sonic-static/*\n  Cache-Control: public, max-age=31536000, immutable',
);
await writeFile(
  headersFile,
  headers.trimEnd() +
    '\n\n# BEGIN WorkerKit assets\n' +
    rules.join('\n\n') +
    '\n# END WorkerKit assets\n',
);
console.log(
  'Assembled frontend comparison apps, Payload and the selector in one Worker assets directory.',
);
