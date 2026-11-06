import { cp, mkdir, readFile, readdir, writeFile, access, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ensureSource, pins } from '../../scripts/ui-upstreams.mjs';
import { vbenWorkDirectory } from './paths.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const upstream = vbenWorkDirectory;
const commit = pins.vben.commit;
const run = (command, args, cwd = upstream) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { cwd, stdio: 'inherit' });
  child.on('error', reject);
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
});
const exists = async filename => { try { await access(filename); return true; } catch { return false; } };
const pristine = await ensureSource('vben');
if (!await exists(path.join(upstream, '.workerkit-verified.json'))) {
  await mkdir(upstream, { recursive: true });
  await cp(pristine, upstream, { recursive: true });
}
const app = path.join(upstream, 'apps/workerkit-demo');
const appSource = process.env.WORKERKIT_VBEN_APP || path.join(here, 'app');
if (path.resolve(appSource) === path.resolve(app)) throw new Error('Vben app source must be outside its generated build directory.');
await mkdir(app, { recursive: true });
// Replace generated source/assets, retaining installed dependencies. Deleted demo
// pages must not survive when this build directory is reused by a starter.
for (const directory of ['src', 'public']) await rm(path.join(app, directory), { recursive: true, force: true });
await cp(appSource, app, { recursive: true });
await cp(path.join(process.env.WORKERKIT_SHARED || path.join(root, 'examples/ui-demo'), 'operations.js'), path.join(app, 'src/operations.js'));
await writeFile(path.join(app, 'src/operations.js'), (await readFile(path.join(app, 'src/operations.js'), 'utf8')).replace(/from '[^']*src\/client\/index\.ts'/, `from '${path.join(root, 'src/client/index.ts')}'`));
await cp(path.join(process.env.WORKERKIT_SHARED || path.join(root, 'examples/ui-demo'), 'operations.d.ts'), path.join(app, 'src/operations.d.ts'));
await writeFile(path.join(app, 'src/operations.d.ts'), (await readFile(path.join(app, 'src/operations.d.ts'), 'utf8')).replace(/from '[^']*src\/contracts\/([^']+)'/g, (_, file) => `from '${path.join(root, 'src/contracts', file)}'`));
// The comparison app has fixtures; generated business apps intentionally do not.
for (const file of ['data.ts', 'component-pages.json', 'fixtures.json']) {
  const source = path.join(process.env.WORKERKIT_SHARED || path.join(root, 'examples/ui-demo'), file);
  if (await exists(source)) await cp(source, path.join(app, 'src', file));
}
await cp(process.env.WORKERKIT_PUBLIC || path.join(root, 'examples/nuxt-dashboard/public'), path.join(app, 'public'), { recursive: true });

// Keep upstream packages intact. Install only the workspace closure used by this demo.
const all = new Map();
async function collect(dir) {
  if (await exists(path.join(dir, 'package.json'))) {
    const pkg = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'));
    if (pkg.name) all.set(pkg.name, { pkg, dir });
  }
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !['node_modules', '.git', 'dist'].includes(entry.name)) await collect(path.join(dir, entry.name));
  }
}
await collect(path.join(upstream, 'packages'));
await collect(path.join(upstream, 'internal'));
await collect(app);
const selected = new Set();
function include(name) {
  if (selected.has(name)) return;
  const record = all.get(name); if (!record) throw new Error(`Missing upstream workspace ${name}`);
  selected.add(name);
  for (const [dep, version] of Object.entries({ ...record.pkg.dependencies, ...record.pkg.devDependencies })) if (String(version).startsWith('workspace:')) include(dep);
}
include(JSON.parse(await readFile(path.join(app, 'package.json'), 'utf8')).name);
include('@vben/tsconfig');
include('@vben/tailwind-config');
let workspace = await readFile(path.join(upstream, 'pnpm-workspace.yaml'), 'utf8');
workspace = workspace.replace(/^packages:[\s\S]*?(?=\n\w)/, `packages:\n${[...selected].map(name => `  - ${path.relative(upstream, all.get(name).dir)}`).join('\n')}\n`);
workspace = workspace.replace('strictPeerDependencies: false', 'strictPeerDependencies: true');
await writeFile(path.join(upstream, 'pnpm-workspace.yaml'), workspace);
// Limit Tailwind scanning to the installed demo packages rather than all upstream demos/docs.
const themeFile = path.join(upstream, 'internal/tailwind-config/src/theme.css');
let themeCss = await readFile(themeFile, 'utf8');
themeCss = themeCss.replace(/@import 'tailwindcss'(?: source\(none\))?;/, "@import 'tailwindcss' source(none);");
themeCss = themeCss.replace(/^@source .*;\n/gm, '');
themeCss += '\n' + [...selected].map(name => `@source '${path.relative(path.dirname(themeFile), all.get(name).dir)}/src';`).join('\n') + '\n';
await writeFile(themeFile, themeCss);
await writeFile(path.join(upstream, '.npmrc'), 'registry=https://registry.npmmirror.com\n');
await writeFile(path.join(upstream, 'package.json'), JSON.stringify({
  name: 'workerkit-vben-preview-workspace', private: true, type: 'module', packageManager: 'pnpm@11.25.0',
  devDependencies: { '@vben/tsconfig': 'workspace:*', '@vben/tailwind-config': 'workspace:*', '@tailwindcss/vite': 'catalog:', '@vitejs/plugin-vue': 'catalog:', '@vitejs/plugin-vue-jsx': 'catalog:', sass: 'catalog:', tailwindcss: 'catalog:', typescript: 'catalog:', vite: 'catalog:', vue: 'catalog:' },
}, null, 2));
await writeFile(path.join(upstream, '.workerkit-upstream.json'), JSON.stringify({ repository: 'https://github.com/vbenjs/vue-vben-admin', commit, purpose: 'isolated local UI comparison' }, null, 2));
if (!await exists(path.join(app, 'node_modules/vue')) || process.argv.includes('--install')) {
  console.log(`Installing Vben preview (${selected.size} upstream workspaces).`);
  const lock = path.join(here, 'pnpm-lock.yaml');
  if (await exists(lock)) await cp(lock, path.join(upstream, 'pnpm-lock.yaml'));
  await run('pnpm', ['install', await exists(lock) && !process.argv.includes('--update-lockfile') ? '--frozen-lockfile' : '--no-frozen-lockfile', '--ignore-scripts']);
  await cp(path.join(upstream, 'pnpm-lock.yaml'), lock);
}
if (process.argv.includes('--dev')) await run('pnpm', ['exec', 'vite', '--host', '127.0.0.1', '--port', '5182', '--strictPort'], app);
if (process.argv.includes('--build')) await run('pnpm', ['exec', 'vite', 'build'], app);
