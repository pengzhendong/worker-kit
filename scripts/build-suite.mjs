import { spawn } from 'node:child_process';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { vbenBuildDirectory } from '../examples/vben-dashboard/paths.mjs';
import { frontendViews } from '../examples/ui-suite/catalog.js';
import { renderPreviewShell } from './render-preview-shell.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist/ui-suite');
const builds = {
  nuxt: { source: 'examples/nuxt-dashboard/dist' },
  prime: { source: 'examples/prime-dashboard/dist' },
  primevue: {
    source: 'examples/prime-dashboard/dist-primevue',
    task: 'build:prime',
    kind: 'primevue',
  },
  element: { source: 'examples/vue-components/dist/element' },
  naive: { source: 'examples/vue-components/dist/naive' },
  shadcn: { source: 'examples/vue-components/dist/shadcn' },
  vuetify: { source: 'examples/vue-components/dist/vuetify' },
  quasar: { source: 'examples/vue-components/dist/quasar' },
  mui: { source: 'examples/react-components/dist/mui' },
  mantine: { source: 'examples/react-components/dist/mantine' },
  pure: { source: '.wrangler/ui-build/pure-dashboard/dist' },
  soybean: { source: '.wrangler/ui-build/soybean-dashboard/dist' },
  vben: { source: vbenBuildDirectory },
  pro: {
    source: 'examples/react-admin/dist/pro',
    workspace: '@worker-kit/react-admin-comparison',
    kind: 'pro',
  },
  refine: {
    source: 'examples/react-admin/dist/refine',
    workspace: '@worker-kit/react-admin-comparison',
    kind: 'refine',
  },
  tabler: {
    source: 'examples/bootstrap-admin/dist/tabler',
    workspace: '@worker-kit/bootstrap-admin-comparison',
    kind: 'tabler',
  },
  adminlte: {
    source: 'examples/bootstrap-admin/dist/adminlte',
    workspace: '@worker-kit/bootstrap-admin-comparison',
    kind: 'adminlte',
  },
  docs: {
    source: 'examples/docs/.vitepress/dist',
    workspace: '@worker-kit/docs',
  },
};

function run(args, base, kind = '') {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', args, {
      cwd: root,
      stdio: 'inherit',
      env: {
        ...process.env,
        WORKERKIT_DEMO_BASE: base,
        WORKERKIT_DEMO_KIND: kind,
      },
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error('Build failed: ' + args.join(' ')));
    });
  });
}

await run(['run', 'upstreams:sync'], '/');
for (const name of frontendViews) {
  const entry = builds[name];
  if (!entry) throw new Error('No preview build configured for ' + name);
  const args = entry.workspace
    ? ['run', 'build', '--workspace', entry.workspace]
    : ['run', entry.task ?? 'build:' + name];
  await run(args, '/' + name + '/', entry.kind);
}

await mkdir(output, { recursive: true });
for (const name of frontendViews) {
  const target = path.join(output, name);
  // Remove old hashed bundles from earlier builds.
  await rm(target, { recursive: true, force: true });
  await cp(path.resolve(root, builds[name].source), target, {
    recursive: true,
  });
}
await run(['run', 'build:pro-components'], '/pro-components/');
await import('./build-component-gallery.mjs');
await writeFile(path.join(output, 'index.html'), await renderPreviewShell());
console.log('Built dist/ui-suite. Run npm run demo:preview');
