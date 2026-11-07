import { cp, readFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { prepareStandardProject } from './standard-template.mjs';
/** A framework owns its native page/API; Better Auth and operations remain the
 * same upstream-backed modules in this Worker, not a second deployed service. */
export async function prepareFrameworkProject(options) {
  await prepareStandardProject(options);
  const { kit, project, put, framework } = options;
  const source = path.join(
    kit,
    'examples',
    framework === 'react-router'
      ? 'react-router-dashboard'
      : framework + '-dashboard',
  );
  await cp(source, path.join(project, 'framework'), {
    recursive: true,
    filter(file) {
      return !path
        .relative(source, file)
        .split(path.sep)
        .some(
          (part) =>
            (part !== '.env.example' &&
              /^(?:\.env|\.dev\.vars)(?:\.|$)/.test(part)) ||
            [
              'node_modules',
              'dist',
              'build',
              '.wrangler',
              '.astro',
              '.svelte-kit',
              '.react-router',
            ].includes(part),
        );
    },
  });
  await cp(
    path.join(kit, 'examples/fullstack-shared'),
    path.join(project, 'fullstack-shared'),
    { recursive: true },
  );
  await rename(
    path.join(project, 'worker.ts'),
    path.join(project, 'standard.ts'),
  );
  const nativeEntry =
    framework === 'sveltekit'
      ? "import framework from './framework/.svelte-kit/cloudflare/_worker.js';"
      : framework === 'astro'
        ? "import framework from './framework/dist/server/entry.mjs';"
        : "import framework from './framework/worker';";
  await put(
    path.join(project, 'worker.ts'),
    `import standard,{type StandardBindings} from './standard';\nexport type{StandardBindings}from'./standard';export{WorkerKitAuthService,WorkerKitStandardTasks}from'./standard';\n// @ts-ignore Built by the framework before Wrangler bundles the application.\n${nativeEntry}\nimport{readBytesLimited}from'@pengzhendong/worker-kit/http';\nexport default{async fetch(request,env,ctx){const url=new URL(request.url);if(url.pathname==='/')return Response.redirect(new URL('/${framework}/',url).href,302);if(url.pathname==='/${framework}'||url.pathname.startsWith('/${framework}/')){if(!['GET','HEAD','OPTIONS'].includes(request.method)){try{const bytes=await readBytesLimited(request.body,16384,request.signal);request=new Request(request,{body:bytes.slice().buffer as ArrayBuffer});}catch{return new Response('Request body too large',{status:413});}}return framework.fetch(request,env,ctx);}return standard.fetch(request,env,ctx);}} satisfies ExportedHandler<StandardBindings>;\n`,
  );
  const configFile = path.join(project, 'wrangler.jsonc'),
    config = JSON.parse(await readFile(configFile, 'utf8'));
  config.define = { 'process.env.NODE_ENV': '\"production\"' };
  await put(configFile, config);
  const scriptFile = path.join(project, 'scripts/project.mjs');
  let script = await readFile(scriptFile, 'utf8');
  const asset =
    framework === 'sveltekit'
      ? '.svelte-kit/cloudflare/sveltekit'
      : framework === 'astro'
        ? 'dist/client/astro'
        : 'build/client';
  script = script.replace(
    "  await run(['exec','--','wrangler','d1','migrations','apply','AUTH_DB','--local']);",
    "  await run(['exec','--','wrangler','d1','migrations','apply','AUTH_DB','--local']);\n  await run(['--prefix','framework','ci','--workspaces=false','--include=dev','--no-audit','--no-fund']);",
  );
  script = script.replace(
    "  await run(['run', 'build', '--workspace', '@app/web']);",
    `  await run(['--prefix','framework','ci','--workspaces=false','--include=dev','--no-audit','--no-fund']);\n  await run(['--prefix','framework','run','build']);\n  await run(['run','build','--workspace','@app/web']);\n  await rm('public/${framework}',{recursive:true,force:true});\n  await cp('framework/${asset}','public/${framework}',{recursive:true});`,
  );
  await put(scriptFile, script);
  await put(path.join(project, 'workerkit.json'), {
    frontend: framework,
    backend: framework,
    mount: '/' + framework + '/',
    source: 'vendor/worker-kit',
  });
  const ignore = path.join(project, '.gitignore');
  await put(
    ignore,
    (await readFile(ignore, 'utf8')) +
      '\nframework/node_modules/\nframework/dist/\nframework/build/\nframework/.svelte-kit/\nframework/.astro/\nframework/.react-router/\n',
  );
  await put(
    path.join(project, 'README.md'),
    `# ${framework} + Better Auth\n\n一个 Worker 中组合官方框架服务端适配、Better Auth（D1 / SQLite DO）、KV 与 Nuxt UI 管理入口。\n\n\`npm install\` → \`npm run setup\` → \`npm run dev\`，打开 http://localhost:8787/${framework}/ 。本地初始管理员 admin / password。框架原生页面和 API 位于 framework/，认证和管理位于 standard.ts，公共业务协议来自 vendor/worker-kit。\n\n全栈示例验证 SSR、会话、原生 GET/POST 和 KV；完整任务、密钥与审计入口为 /standard/。框架本身不等于完整 CMS。部署配置、资源和 Secret 参照 .dev.vars.example 与 wrangler.jsonc，远程 D1 迁移须由部署者显式执行。\n\n框架依赖及页面由应用自己的 package-lock.json 管理；kit:sync 只更新 vendor，共享源码升级不会覆盖 framework、业务迁移、锁文件或 Secret。\n`,
  );
}
