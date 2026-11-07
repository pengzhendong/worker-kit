import { cp, readFile } from 'node:fs/promises';
import path from 'node:path';
import { prepareNativeProject } from './native-template.mjs';

/** Native Nuxt UI frontend with upstream Better Auth, D1 and Hono. */
export async function prepareStandardProject(options) {
  await prepareNativeProject(options);
  const { kit, project, put } = options;
  const source = path.join(kit, 'examples/auth-backend');
  for (const file of [
    'worker.ts',
    'auth.ts',
    'service.ts',
    'tasks.ts',
    'migrations',
  ])
    await cp(path.join(source, file), path.join(project, file), {
      recursive: true,
    });
  const pkg = JSON.parse(
    await readFile(path.join(project, 'package.json'), 'utf8'),
  );
  pkg.dependencies['better-auth'] = '1.7.18';
  await put(path.join(project, 'package.json'), pkg);
  const config = JSON.parse(
    await readFile(path.join(source, 'wrangler.jsonc'), 'utf8'),
  );
  config.name = pkg.name;
  config.assets.directory = 'public';
  config.d1_databases[0].database_name = pkg.name + '-auth';
  await put(path.join(project, 'wrangler.jsonc'), config);
  await put(path.join(project, 'workerkit.json'), {
    frontend: 'nuxt',
    backend: 'hono',
    mount: '/standard/',
    source: 'vendor/worker-kit',
  });
  await put(
    path.join(project, '.dev.vars.example'),
    'STANDARD_ADMIN_PASSWORD=password\n',
  );
  const scriptFile = path.join(project, 'scripts/project.mjs');
  let script = await readFile(scriptFile, 'utf8');
  script =
    "import { randomBytes } from 'node:crypto';\n" +
    script.replace(
      'import { access, chmod, cp, mkdir, readFile, rm }',
      'import { access, chmod, cp, mkdir, readFile, rm, appendFile }',
    );
  script = script.replace(
    "    await chmod('.dev.vars', 0o600);\n  }",
    "    await chmod('.dev.vars', 0o600);\n  }\n  if (!/^STANDARD_AUTH_SECRET=/m.test(await readFile('.dev.vars','utf8'))) {\n    await appendFile('.dev.vars','\\nSTANDARD_AUTH_SECRET='+randomBytes(32).toString('hex')+'\\n');\n    await chmod('.dev.vars',0o600);\n  }\n  await run(['exec','--','wrangler','d1','migrations','apply','AUTH_DB','--local']);",
  );
  await put(scriptFile, script);
  await put(
    path.join(project, 'README.md'),
    `# Hono + Better Auth 应用\n\nNuxt UI、Hono、Better Auth、D1、KV 和 SQLite Durable Objects，共同部署为一个 Worker。\n\n\`npm install\` → \`npm run setup\` → \`npm run dev\`，访问 http://localhost:8787/standard/ 。初始本地账号 admin / password。setup 生成只保存在本地的签名 Secret，应用本地 D1 迁移；仅在用户表为空时创建管理员，已有用户和凭据不重置。公开注册默认禁用。\n\nBetter Auth 原生 username/admin 插件负责用户、角色、密码与会话；WorkerKit 提供运行检查、任务、配置、受限密钥和审计。密码运算在本 Worker 的 SQLite DO 中运行，前台 Worker 保留转发与管理接口；这使用 Cloudflare 免费套餐支持的 SQLite DO，仍需遵守请求、D1、KV 和 DO 配额。\n\n业务入口 worker.ts，认证选项 auth.ts，DO 适配 service.ts，任务 tasks.ts，页面 web/src。SQL 迁移属于应用。部署前创建自己的 AUTH_DB 和 KV，在 wrangler.jsonc 更新资源 ID，通过 Wrangler Secret 设置 STANDARD_AUTH_SECRET 与初始 STANDARD_ADMIN_PASSWORD，再显式应用远程 D1 迁移。不要把 .dev.vars 用作生产配置。\n\n共享源码升级使用 \`npm run kit:sync -- --source /path/to/reviewed/worker-kit\`；Better Auth、页面和业务代码的升级单独审核。\n`,
  );
}
