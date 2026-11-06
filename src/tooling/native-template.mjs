import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
export async function prepareNativeProject({ kit, project, put, snapshot }) {
  const source = path.join(kit, 'examples/native-dashboard');
  await snapshot(kit, path.join(project, 'vendor/worker-kit'), 'nuxt');
  await mkdir(path.join(project, 'web'), { recursive: true });
  for (const file of [
    'src',
    'favicon.svg',
    'vite.config.ts',
    'build.mjs',
    'tsconfig.json',
    'typecheck.cjs',
  ])
    await cp(path.join(source, file), path.join(project, 'web', file), {
      recursive: true,
    });
  const web = JSON.parse(
    await readFile(path.join(source, 'package.json'), 'utf8'),
  );
  web.name = '@app/web';
  web.dependencies['@pengzhendong/worker-kit'] = 'file:../vendor/worker-kit';
  web.scripts = { build: 'node build.mjs', check: 'node typecheck.cjs' };
  await put(path.join(project, 'web/package.json'), web);
  await mkdir(path.join(project, 'web/shared'), { recursive: true });
  for (const file of [
    'operations.js',
    'operations.d.ts',
    'NuxtWorkspace.vue',
    'ManagementNuxt.vue',
  ]) {
    const text = await readFile(
      path.join(kit, 'examples/ui-demo', file),
      'utf8',
    );
    await put(
      path.join(project, 'web/shared', file),
      text.replaceAll('../../src/', '../../vendor/worker-kit/src/'),
    );
  }
  await cp(
    path.join(kit, 'examples/ui-demo/reference.ts'),
    path.join(project, 'web/src/reference.ts'),
  );
  const taskPage = path.join(project, 'web/src/pages/tasks.vue');
  await put(
    taskPage,
    (await readFile(taskPage, 'utf8')).replace(
      '../../../ui-demo/',
      '../../shared/',
    ),
  );
  await cp(path.join(source, 'worker.ts'), path.join(project, 'worker.ts'));
  await cp(path.join(source, 'tasks.ts'), path.join(project, 'tasks.ts'));
  const config = JSON.parse(
    await readFile(path.join(source, 'wrangler.jsonc'), 'utf8'),
  );
  config.name = path
    .basename(project)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');
  config.assets.directory = 'public';
  await put(path.join(project, 'wrangler.jsonc'), config);
  await put(path.join(project, 'tsconfig.json'), {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      lib: ['ESNext'],
      types: [],
      strict: true,
      skipLibCheck: true,
      noEmit: true,
      allowImportingTsExtensions: true,
    },
    include: ['worker.ts', 'tasks.ts', 'worker-configuration.d.ts'],
  });
  await cp(
    path.join(source, '.dev.vars.example'),
    path.join(project, '.dev.vars.example'),
  );
  await put(path.join(project, 'workerkit.json'), {
    frontend: 'nuxt',
    backend: 'native',
    mount: '/native/',
    source: 'vendor/worker-kit',
  });
  await put(path.join(project, 'package.json'), {
    name: config.name,
    private: true,
    type: 'module',
    engines: { node: '>=22.12.0' },
    workspaces: ['web'],
    overrides: {
      tailwindcss: '4.3.4',
      '@tailwindcss/vite': '4.3.4',
      '@tailwindcss/node': '4.3.4',
      '@tailwindcss/oxide': '4.3.4',
    },
    dependencies: {
      '@pengzhendong/worker-kit': 'file:vendor/worker-kit',
      hono: '4.13.13',
      agents: '0.32.0',
      'cron-schedule': '6.0.0',
    },
    devDependencies: { wrangler: '4.152.0', typescript: '6.0.3' },
    scripts: {
      setup: 'node scripts/project.mjs setup',
      build: 'node scripts/project.mjs build',
      dev: 'node scripts/project.mjs dev',
      check: 'node scripts/project.mjs check',
      'kit:sync': 'node vendor/worker-kit/src/tooling/cli.mjs sync .',
      'kit:rollback': 'node vendor/worker-kit/src/tooling/cli.mjs rollback .',
    },
  });
  await mkdir(path.join(project, 'scripts'), { recursive: true });
  await cp(
    new URL('./templates/native-project.mjs', import.meta.url),
    path.join(project, 'scripts/project.mjs'),
  );

  await put(
    path.join(project, '.gitignore'),
    'node_modules/\n**/dist/\n**/.wrangler/\n.dev.vars\npublic/native/\nweb/auto-imports.d.ts\nweb/components.d.ts\nworker-configuration.d.ts\nvendor/worker-kit.previous-*/\n',
  );
  await put(
    path.join(project, 'README.md'),
    '# 轻量 Worker 应用\n\nNuxt UI + 原生 Worker / Hono + KV + SQLite 任务 DO。一个 Worker，无 CMS、Next.js、D1 或 R2 强制依赖。\n\n`npm install` → `npm run setup` → `npm run dev`。访问 http://localhost:8787/native/ ，初始本地账号 admin / password。setup 只在本地变量文件不存在时复制示例，已有凭据不改动。\n\n页面在 web/src，业务入口 worker.ts；认证、会话、设置与受限密钥复用 WorkerKit 的公开 SDK。可新增自己的路由和业务字段。tasks.ts 声明应用任务，调度与执行复用 WorkerKit 的可选 task-worker 入口；示例默认绑定 SQLite 任务 DO。\n\n升级共享源码：`npm run kit:sync -- --source /path/to/reviewed/worker-kit`。同步不覆盖页面、业务入口和部署配置。组件和 SDK npm 依赖由根 lockfile 固定；跨版本修改需复查原生 API。\n\n线上先配置自己的 KV namespace、限流 namespace 和域名，并使用 `wrangler secret put NATIVE_ADMIN_PASSWORD` 配置凭据；本地 .dev.vars 不随部署上传。KV 的注销/密钥撤销有跨区域一致性延迟；审计只记录安全元数据，30 天保留，尽力写入。\n',
  );
}
