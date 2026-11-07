import { spawn } from 'node:child_process';
import { mkdir, cp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPreviewShell } from './render-preview-shell.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const run = (args, base, kind = '') => new Promise((resolve, reject) => {
  const child = spawn('npm', args, { cwd: root, stdio: 'inherit', env: { ...process.env, WORKERKIT_DEMO_BASE: base, WORKERKIT_DEMO_KIND: kind } });
  child.on('error', reject);
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Build failed: ${args.join(' ')}`)));
});
await run(['run', 'upstreams:sync'], '/');
await run(['run', 'build:nuxt'], '/nuxt/');
await run(['run', 'build:prime'], '/prime/');
await run(['run', 'build:element'], '/element/');
await run(['run', 'build:naive'], '/naive/');
await run(['run', 'build:shadcn'], '/shadcn/');
for(const name of ['vuetify','quasar','mui','mantine'])await run(['run','build:'+name],'/'+name+'/');
for (const name of ['pure', 'soybean']) await run(['run', 'build:' + name], '/' + name + '/');
await run(['run', 'build:vben'], '/vben/');
for (const kind of ['pro', 'refine']) await run(['run', 'build', '--workspace', '@worker-kit/react-admin-comparison'], `/${kind}/`, kind);
for (const kind of ['tabler', 'adminlte']) await run(['run', 'build', '--workspace', '@worker-kit/bootstrap-admin-comparison'], `/${kind}/`, kind);
await run(['run', 'build', '--workspace', '@worker-kit/docs'], '/docs/');
const { vbenBuildDirectory } = await import('../examples/vben-dashboard/paths.mjs');
const output = path.join(root, 'dist/ui-suite');
await mkdir(output, { recursive: true });
for (const [name, source] of Object.entries({ nuxt: 'examples/nuxt-dashboard/dist', prime: 'examples/prime-dashboard/dist', element: 'examples/vue-components/dist/element', naive: 'examples/vue-components/dist/naive', shadcn: 'examples/vue-components/dist/shadcn', vuetify:'examples/vue-components/dist/vuetify',quasar:'examples/vue-components/dist/quasar',mui:'examples/react-components/dist/mui',mantine:'examples/react-components/dist/mantine',pure: '.wrangler/ui-build/pure-dashboard/dist', soybean: '.wrangler/ui-build/soybean-dashboard/dist', vben: vbenBuildDirectory, pro: 'examples/react-admin/dist/pro', refine: 'examples/react-admin/dist/refine', tabler: 'examples/bootstrap-admin/dist/tabler', adminlte: 'examples/bootstrap-admin/dist/adminlte', docs: 'examples/docs/.vitepress/dist' })) {
  // Replace only this generated output to avoid keeping stale chunks from older versions.
  const { rm } = await import('node:fs/promises');
  await rm(path.join(output, name), { recursive: true, force: true });
  await cp(path.resolve(root, source), path.join(output, name), { recursive: true });
}
await writeFile(path.join(output, 'index.html'), await renderPreviewShell());
console.log('Built dist/ui-suite. Run npm run demo:preview');
