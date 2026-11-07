import {
  access,
  cp,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const kit = fileURLToPath(new URL('../../', import.meta.url));
const json = async (file) => JSON.parse(await readFile(file, 'utf8'));
const put = async (file, value) => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(
    file,
    typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n',
  );
};
const exists = async (file) => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};
const hash = (value) => createHash('sha256').update(value).digest('hex');
const git = (source, args) => {
  try {
    return execFileSync('git', ['-C', source, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
};
const choices = {
  sveltekit: 'sveltekit-dashboard',
  astro: 'astro-dashboard',
  'react-router': 'react-router-dashboard',
  nuxt: 'nuxt-dashboard',
  prime: 'prime-dashboard',
  element: 'vue-components',
  naive: 'vue-components',
  shadcn: 'vue-components',
  pure: 'pure-dashboard',
  soybean: 'soybean-dashboard',
  mui: 'react-components',
  mantine: 'react-components',
  vuetify: 'vue-components',
  quasar: 'vue-components',
  vben: 'vben-dashboard/app',
  pro: 'react-admin',
  refine: 'react-admin',
  tabler: 'bootstrap-admin',
  adminlte: 'bootstrap-admin',
  docs: 'docs',
};
function argumentsFor(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const [key, inline] = args[i].slice(2).split('=');
      result[key] = inline ?? args[++i];
    } else if (!result.directory) result.directory = args[i];
    else throw Error('Unexpected argument: ' + args[i]);
  }
  return result;
}
async function filesIn(root) {
  const files = [];
  async function visit(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (
        entry.isDirectory() &&
        [
          'node_modules',
          '.git',
          '.wrangler',
          '.next',
          '.open-next',
          '.workerkit-bundle',
        ].includes(entry.name)
      )
        continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(full);
      else if (entry.isFile()) files.push(path.relative(root, full));
      else
        throw Error(
          'Unexpected link in shared source: ' + path.relative(root, full),
        );
    }
  }
  await visit(root);
  return files.sort();
}

// Record the exact shared-source subset and its hashes, including local changes.
// Only this directory is touched by an explicit sync.
async function snapshot(source, target, frontend) {
  await mkdir(target, { recursive: true });
  const sharedSource = path.join(source, 'src');
  await cp(sharedSource, path.join(target, 'src'), {
    recursive: true,
    filter: (file) => {
      const relative = path
        .relative(sharedSource, file)
        .replaceAll(path.sep, '/');
      return (
        relative !== 'web' &&
        !relative.startsWith('web/') &&
        relative !== 'tooling/vite.ts'
      );
    },
  });
  const pkg = await json(path.join(source, 'package.json'));
  const {
    name,
    version,
    type,
    engines,
    exports,
    peerDependencies,
    peerDependenciesMeta,
  } = pkg;
  const entries = Object.fromEntries(
    Object.entries(exports).filter(
      ([key]) => !key.startsWith('./web') && key !== './tooling/vite',
    ),
  );
  const peers = Object.fromEntries(
    Object.entries(peerDependencies).filter(([key]) =>
      [
        'hono',
        'hono-openapi',
        'openapi-types',
        'wrangler',
        'semver',
        'vue',
        'agents',
        'cron-schedule',
      ].includes(key),
    ),
  );
  const meta = Object.fromEntries(
    Object.entries(peerDependenciesMeta).filter(([key]) =>
      Object.hasOwn(peers, key),
    ),
  );
  await put(path.join(target, 'package.json'), {
    name,
    version,
    type,
    private: true,
    engines,
    exports: entries,
    peerDependencies: peers,
    peerDependenciesMeta: meta,
  });
  if (frontend === 'vben') {
    for (const file of [
      'ui-upstreams.json',
      'scripts/ui-upstreams.mjs',
      'examples/vben-dashboard/paths.mjs',
      'examples/vben-dashboard/setup.mjs',
      'examples/vben-dashboard/pnpm-lock.yaml',
    ]) {
      await mkdir(path.dirname(path.join(target, file)), { recursive: true });
      await cp(path.join(source, file), path.join(target, file));
    }
  }
  for (const file of ['LICENSE', 'LICENSE.md', 'AGENTS.md'])
    if (await exists(path.join(source, file)))
      await cp(path.join(source, file), path.join(target, file));
  const files = {};
  for (const file of await filesIn(target))
    if (file !== 'source.json')
      files[file] = hash(await readFile(path.join(target, file)));
  await put(path.join(target, 'source.json'), {
    repository: 'https://github.com/pengzhendong/worker-kit',
    commit: git(source, ['rev-parse', 'HEAD']),
    dirty: Boolean(git(source, ['status', '--porcelain'])),
    digest: hash(JSON.stringify(files)),
    frontend,
    files,
  });
}

async function verifySnapshot(target, manifest = undefined) {
  manifest ??= await json(path.join(target, 'source.json'));
  const actual = (await filesIn(target)).filter(
    (file) => file !== 'source.json',
  );
  if (actual.length !== Object.keys(manifest.files).length)
    throw Error('Vendor files changed. Preserve your edits before syncing.');
  for (const file of actual)
    if (
      !Object.hasOwn(manifest.files, file) ||
      hash(await readFile(path.join(target, file))) !== manifest.files[file]
    )
      throw Error('Vendor file changed: ' + file);
}

export async function rollbackKit(args) {
  const options = argumentsFor(args),
    project = path.resolve(options.directory || process.cwd());
  if (!/^worker-kit\.previous-\d+$/.test(options.backup || ''))
    throw Error(
      'Usage: workerkit rollback PROJECT --backup worker-kit.previous-TIMESTAMP',
    );
  const parent = path.join(project, 'vendor'),
    target = path.join(parent, 'worker-kit'),
    backup = path.join(parent, options.backup);
  const { lstat, rename } = await import('node:fs/promises');
  if (!(await lstat(backup)).isDirectory())
    throw Error('Backup must be a source directory');
  await verifySnapshot(target);
  await verifySnapshot(backup);
  const previous = target + '.previous-' + Date.now();
  await rename(target, previous);
  try {
    await rename(backup, target);
  } catch (error) {
    await rename(previous, target);
    throw error;
  }
  console.log(
    'Restored shared source. Run npm install and npm run check; database migrations and business files were not changed.',
  );
  return { backup: path.basename(previous) };
}

export async function syncKit(args) {
  const options = argumentsFor(args),
    project = path.resolve(options.directory || process.cwd());
  if (!options.source)
    throw Error(
      'Usage: workerkit sync PROJECT --source /path/to/reviewed/worker-kit',
    );
  const target = path.join(project, 'vendor/worker-kit'),
    manifest = await json(path.join(target, 'source.json'));
  await verifySnapshot(target, manifest);
  // Stage and validate the replacement. Never overwrite app code, migrations, lockfiles or secrets.
  const staged = path.join(project, 'vendor', '.worker-kit-next-' + Date.now());
  await snapshot(path.resolve(options.source), staged, manifest.frontend);
  const { rename } = await import('node:fs/promises');
  const backup = target + '.previous-' + Date.now();
  await rename(target, backup);
  try {
    await rename(staged, target);
  } catch (error) {
    await rename(backup, target);
    throw error;
  }
  return console.log(
    'Updated shared source; previous source retained at ' +
      path.basename(backup) +
      '. Run npm install and npm run check before accepting the upgrade.',
  );
}

export async function createProject(args) {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(
      'workerkit create DIRECTORY --frontend nuxt|prime|element|naive|shadcn|vuetify|quasar|mui|mantine|pure|soybean|vben|pro|refine|tabler|adminlte|docs --backend payload|sonic|native|nuxt|hub|hono|sveltekit|astro|react-router',
    );
    return;
  }
  const options = argumentsFor(args);
  if (
    !options.directory ||
    !Object.hasOwn(choices, options.frontend) ||
    ![
      'payload',
      'sonic',
      'native',
      'hub',
      'nuxt',
      'hono',
      'sveltekit',
      'astro',
      'react-router',
    ].includes(options.backend)
  )
    throw Error(
      'Usage: workerkit create DIRECTORY --frontend nuxt|prime|element|naive|shadcn|vuetify|quasar|mui|mantine|pure|soybean|vben|pro|refine|tabler|adminlte|docs --backend payload|sonic|native|nuxt|hub|hono|sveltekit|astro|react-router',
    );
  const project = path.resolve(options.directory);
  const relative = path.relative(kit, project);
  if (
    relative === '' ||
    (relative !== '..' &&
      !relative.startsWith('..' + path.sep) &&
      !path.isAbsolute(relative))
  )
    throw Error(
      'Create the application outside the WorkerKit source checkout.',
    );
  if (await exists(project))
    throw Error('Destination already exists; choose a new directory.');
  const frontend = options.frontend,
    backend = options.backend === 'nuxt' ? 'hub' : options.backend;
  const frameworks = ['sveltekit', 'astro', 'react-router'];
  if (frameworks.includes(backend) || frameworks.includes(frontend)) {
    if (frontend !== backend)
      throw Error(
        'A full-stack framework starter requires matching --frontend and --backend',
      );
    await mkdir(project, { recursive: true });
    const { prepareFrameworkProject } = await import(
      './framework-template.mjs'
    );
    await prepareFrameworkProject({
      kit,
      project,
      put,
      snapshot,
      framework: backend,
    });
    console.log(
      `Created ${project}\n${backend} + Better Auth. Next: npm install, npm run setup, npm run dev`,
    );
    return;
  }
  if (['native', 'hub', 'hono'].includes(backend) && frontend !== 'nuxt')
    throw Error(
      'The Hono/native/Nuxt full-stack starter currently supports --frontend nuxt; other frontends remain available with Payload or SonicJS.',
    );
  await mkdir(project, { recursive: true });
  if (backend === 'hono') {
    const { prepareStandardProject } = await import('./standard-template.mjs');
    await prepareStandardProject({ kit, project, put, snapshot });
    console.log(
      `Created ${project}\nNuxt UI + Hono + Better Auth. Next: npm install, npm run setup, npm run dev`,
    );
    return;
  }
  if (backend === 'hub') {
    const { prepareHubProject } = await import('./hub-template.mjs');
    await prepareHubProject({ kit, project, put, snapshot });
    console.log(
      `Created ${project}\nNuxt UI + NuxtHub. Next: npm install, npm run setup, npm run dev`,
    );
    return;
  }
  if (backend === 'native') {
    const { prepareNativeProject } = await import('./native-template.mjs');
    await prepareNativeProject({ kit, project, put, snapshot });
    console.log(
      `Created ${project}\nNuxt UI + native Worker/KV. Next: npm install, npm run setup, npm run dev`,
    );
    return;
  }
  await snapshot(kit, path.join(project, 'vendor/worker-kit'), frontend);
  const ignored = new Set([
    'node_modules',
    'dist',
    '.git',
    '.wrangler',
    '.next',
    '.open-next',
    '.vitepress/cache',
    '.vitepress/dist',
    'test-results',
    'playwright-report',
    'public/media',
  ]);
  if (['pure', 'soybean'].includes(frontend)) {
    const { prepareReviewedDashboard } = await import(
      '../../scripts/build-upstream-dashboard.mjs'
    );
    await prepareReviewedDashboard(frontend, path.join(project, 'web'));
    for (const file of ['operations.js', 'operations.d.ts']) {
      const p = path.join(project, 'web/src/workerkit', file);
      await put(
        p,
        (await readFile(p, 'utf8'))
          .replaceAll(path.join(kit, 'src/'), '../../../vendor/worker-kit/src/')
          .replaceAll(
            '@pengzhendong/worker-kit/client',
            '../../../vendor/worker-kit/src/client/index',
          ),
      );
    }
  } else
    await cp(
      path.join(kit, 'examples', choices[frontend]),
      path.join(project, 'web'),
      {
        recursive: true,
        filter: (source) => {
          const rel = path
            .relative(path.join(kit, 'examples', choices[frontend]), source)
            .replaceAll(path.sep, '/');
          const name = path.basename(source);
          if (
            name === '.dev.vars' ||
            name.startsWith('.dev.vars.') ||
            name === '.env' ||
            (name.startsWith('.env.') && name !== '.env.example')
          )
            return false;
          return (
            ![...ignored].some((x) => rel === x || rel.startsWith(x + '/')) &&
            !rel.includes('.tsbuildinfo')
          );
        },
      },
    );
  const publicSource = path.join(kit, 'examples/nuxt-dashboard/public');
  await cp(publicSource, path.join(project, 'web/public'), {
    recursive: true,
    filter: (file) => {
      const relative = path
        .relative(publicSource, file)
        .replaceAll(path.sep, '/');
      return relative !== 'media' && !relative.startsWith('media/');
    },
  });
  if (frontend === 'vben')
    await cp(
      path.join(kit, 'examples/vben-dashboard/LICENSE.vben'),
      path.join(project, 'web/LICENSE.vben'),
    );
  await mkdir(path.join(project, 'shared'), { recursive: true });
  for (const file of [
    'operations.js',
    'operations.d.ts',
    'ManagementNuxt.vue',
    'NuxtWorkspace.vue',
    'ManagementPrime.vue',
    'ManagementVben.vue',
    'ManagementDocs.vue',
    'management-bootstrap.js',
    'reference.ts',
  ])
    await cp(
      path.join(kit, 'examples/ui-demo', file),
      path.join(project, 'shared', file),
    );
  for (const file of await filesIn(path.join(project, 'web'))) {
    if (!/\.(vue|tsx?|jsx?|m[tc]s)$/.test(file)) continue;
    const full = path.join(project, 'web', file);
    let text = await readFile(full, 'utf8');
    text = text
      .replaceAll('ui-demo/', 'shared/')
      .replaceAll('../nuxt-dashboard/public', './public');
    await put(full, text);
  }
  for (const file of ['operations.js', 'operations.d.ts']) {
    const full = path.join(project, 'shared', file);
    await put(
      full,
      (await readFile(full, 'utf8')).replaceAll(
        '../../src/',
        '../vendor/worker-kit/src/',
      ),
    );
  }
  const { prepareFrontend, prepareBackend, projectScript } = await import(
    './project-template.mjs'
  );
  await prepareFrontend({ kit, project, frontend, put, json });
  await prepareBackend({ kit, project, frontend, backend, put, json });
  await put(path.join(project, 'workerkit.json'), {
    frontend,
    backend,
    mount: '/app/',
    source: 'vendor/worker-kit',
  });
  await put(
    path.join(project, '.gitignore'),
    'node_modules/\nserver/node_modules/\n**/.env\n**/.dev.vars\n**/.wrangler/\n**/.open-next/\n**/.next/\n**/dist/\n**/*.tsbuildinfo\nserver/cloudflare-env.d.ts\nserver/next-env.d.ts\nserver/.workerkit-bundle/\nweb/.vitepress/cache/\nweb/.vitepress/dist/\nvendor/worker-kit.previous-*/\n',
  );
  await put(path.join(project, 'scripts/project.mjs'), projectScript);
  await put(path.join(project, 'package.json'), {
    name: path
      .basename(project)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-'),
    private: true,
    type: 'module',
    engines: { node: '>=24.22.1' },
    devDependencies: { vite: '8.3.5' },
    workspaces: ['vben', 'pure', 'soybean'].includes(frontend) ? [] : ['web'],
    overrides: ['nuxt', 'prime'].includes(frontend)
      ? {
          tailwindcss: '4.3.4',
          '@tailwindcss/vite': '4.3.4',
          '@tailwindcss/node': '4.3.4',
          '@tailwindcss/oxide': '4.3.4',
        }
      : undefined,
    dependencies: {
      hono: '4.13.13',
      agents: '0.32.0',
      'cron-schedule': '6.0.0',
      '@scalar/api-reference': '1.75.1',
      'openapi-types': '12.1.3',
    },
    scripts: {
      setup: 'node scripts/project.mjs setup',
      build: 'node scripts/project.mjs build',
      dev: 'node scripts/project.mjs dev',
      check: 'node scripts/project.mjs check',
      'kit:sync': 'node vendor/worker-kit/src/tooling/cli.mjs sync .',
      'kit:rollback': 'node vendor/worker-kit/src/tooling/cli.mjs rollback .',
    },
  });
  await put(
    path.join(project, 'README.md'),
    `# ${path.basename(project)}\n\n${frontend} + ${backend}，一个 Cloudflare Worker。\n\n\`npm install\` → \`npm run setup\` → \`npm run dev\`。打开 http://localhost:8787/ 。本地初始演示账号 admin / password，仅在数据库为空时创建，已有账号不重置。\n\n前端源码在 web/；业务任务在 server/src/business/tasks.ts；后端集合与原生权限在 server/src/collections/（Payload）或 server/src/workerkit/sonic-collection.ts（SonicJS）。任务引擎和 HTTP 基础设施复用 vendor/worker-kit/src/。新增业务接口使用选定后端的原生路由和认证，不要另写登录系统。\n\n\`npm run build\` 只构建选中的前端与后端，\`npm run check\` 检查类型、构建和 Wrangler dry-run。部署前在 server/wrangler.jsonc 填写自己的绑定和域名，用 Wrangler 配置线上 Secret；本地 .env/.dev.vars 不会部署。\n\n共享源码采用带逐文件 SHA-256 的快照，来源和工作区状态记录在 vendor/worker-kit/source.json；这里没有把未发布修改冒充已发布 commit。业务文件属于本项目。升级：\`npm run kit:sync -- --source /path/to/reviewed/worker-kit\`，只更新 vendor，共享源码有本地修改时拒绝覆盖，并保留旧版本。前后端 npm 版本分别由 lockfile 固定，升级原生模板时审核 web/ 和 server/ 的差异，不自动覆盖业务代码。\n\n选项目前是创建时选择；切换后端涉及数据与身份迁移，不能通过修改 workerkit.json 自动搬迁。VitePress 提供文档中的轻量工作台；Vben 需要 pnpm 与固定上游源码。新项目默认不使用旧 Ant Design 6 后台和旧单管理员登录；共享源码保留兼容模块。\n`,
  );
  console.log(
    `Created ${project}\nFrontend: ${frontend}; backend: ${backend}.\nNext: cd ${project} && npm install && npm run setup && npm run dev`,
  );
}
