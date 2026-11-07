import { cp, mkdir, readdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';

export async function prepareFrontend({ kit, project, frontend, put, json }) {
  const web = path.join(project, 'web');
  const edit = async (file, fn) =>
    put(
      path.join(web, file),
      await fn(await readFile(path.join(web, file), 'utf8')),
    );
  const inlineComponentCatalog = async (text) => {
    const source = JSON.parse(
      await readFile(
        path.join(kit, 'examples/ui-demo/component-pages.json'),
        'utf8',
      ),
    );
    return text.replace(
      /^import componentPages from .*;\n/m,
      'const componentPages = ' + JSON.stringify(source) + ';\n',
    );
  };
  const pkg = await json(path.join(web, 'package.json'));
  if (frontend === 'nuxt') {
    await edit('src/main.ts', (text) =>
      text
        .replace(/^import componentPages from .*;\n/m, '')
        .replace(
          /routes: \[[\s\S]*?\n  \],/,
          "routes: [{ path: '/', redirect: '/workspace' }, { path: '/workspace', component: () => import('./pages/Workspace.vue'), meta: { title: '业务工作台' } }],",
        ),
    );
    await edit('src/App.vue', (text) =>
      text
        .replace(/^import workspacePages from .*;\n/m, '')
        .replace(
          /import componentPages from .*;/,
          'const componentPages: { title: string; path: string; icon: string }[] = [];',
        )
        .replace(
          /const navigation: NavigationMenuItem\[\] = \[[\s\S]*?\n\];/,
          "const navigation: NavigationMenuItem[] = [{ label: '业务工作台', icon: 'i-lucide-activity', to: '/workspace' }];",
        )
        .replace('演示数据 · 未连接生产服务', '已连接业务后端')
        .replace('所有操作仅影响本地演示。', '任务与运行记录保存在当前后端。'),
    );
    for (const name of [
      'Overview',
      'Tasks',
      'Logs',
      'Resources',
      'Settings',
      'Components',
    ])
      await rm(path.join(web, 'src/pages', name + '.vue'));
    await edit('src/App.vue', (text) =>
      text
        .replaceAll("to: '/settings'", "to: '/workspace'")
        .replaceAll('应用设置', '业务工作台')
        .replaceAll('Demo User', '工作空间')
        .replaceAll('本地预览工作空间', '开发工作空间'),
    );
  } else if (['prime', 'primevue', 'sakai'].includes(frontend)) {
    await edit('src/main.js', (text) =>
      text
        .replace("import Demo from './Demo.vue';", '')
        .replace(/^import componentPages from .*;\n/m, '')
        .replace("import Chart from 'primevue/chart';", '')
        .replace('FileUpload, Chart', 'FileUpload')
        .replace(/const paths = .*;/, "const paths = ['/'];")
        .replace('component: Demo', 'component: Workspace'),
    );
    delete pkg.dependencies['chart.js'];
    await put(
      path.join(web, 'src/layout/AppMenu.vue'),
      `<script setup>\nimport AppMenuItem from './AppMenuItem.vue';\nconst model = [{ label: '工作空间', items: [{ label: '业务工作台', icon: 'pi pi-bolt', to: '/workspace' }] }];\n</script>\n<template><ul class="layout-menu"><AppMenuItem v-for="(item,i) in model" :key="i" :item="item" :index="i" /></ul></template>\n`,
    );
    if (frontend === 'primevue') {
      await edit('vite.config.js', (text) =>
        text
          .replace("process.env.WORKERKIT_DEMO_KIND === 'primevue'", 'true')
          .replace("library ? 'dist-primevue' : 'dist'", "'dist'"),
      );
      await edit('src/PrimeVueLayout.vue', (text) =>
        text.replace(
          /^import componentPages from .*;\n/m,
          'const componentPages = [];\n',
        ),
      );
      await edit('src/main.js', (text) =>
        text.replace(
          /const \{ default: AppLayout \} = __PRIMEVUE_LIBRARY__[\s\S]*?;\nif .*layout\.scss'\);\n/,
          "import AppLayout from './PrimeVueLayout.vue';\n",
        ),
      );
      await rm(path.join(web, 'src/layout'), { recursive: true });
      await rm(path.join(web, 'src/assets/layout'), { recursive: true });
    } else
      await edit('src/main.js', (text) =>
        text.replace(
          /const \{ default: AppLayout \} = __PRIMEVUE_LIBRARY__[\s\S]*?;\n/,
          "import AppLayout from './layout/AppLayout.vue';\n",
        ),
      );
    if (frontend !== 'primevue')
      await rm(path.join(web, 'src/PrimeVueLayout.vue'));
    await rm(path.join(web, 'src/Demo.vue'));
    await rm(path.join(web, 'src/ComponentExperience.vue'));
  } else if (['pure', 'soybean'].includes(frontend)) {
    // The complete reviewed upstream workspace is now owned by the application.
    // Keep its frozen pnpm lock and package identity intact.
    return;
  } else if (['mui', 'mantine'].includes(frontend)) {
    const name = frontend === 'mui' ? 'Mui' : 'Mantine';
    await put(
      path.join(web, 'src/main.tsx'),
      `import{createRoot}from'react-dom/client';import App from'./${name}App';import'./style.css';createRoot(document.getElementById('root')!).render(<App/>);`,
    );
    await rm(
      path.join(
        web,
        'src',
        frontend === 'mui' ? 'MantineApp.tsx' : 'MuiApp.tsx',
      ),
    );
    await rm(
      path.join(
        web,
        'src',
        frontend === 'mui' ? 'MantineDemos.tsx' : 'MuiDemos.tsx',
      ),
    );
    await edit('src/demo-navigation.ts', inlineComponentCatalog);
    for (const dep of frontend === 'mui'
      ? ['@mantine/core', '@mantine/hooks']
      : ['@mui/material', '@emotion/react', '@emotion/styled'])
      delete pkg.dependencies[dep];
    await edit('vite.config.ts', (text) =>
      text
        .replace(
          "process.env.WORKERKIT_DEMO_KIND||'mui'",
          JSON.stringify(frontend),
        )
        .replace('outDir:`dist/${kind}`', "outDir:'dist'")
        .replace("publicDir:'../nuxt-dashboard/public'", "publicDir:'public'"),
    );
  } else if (
    ['element', 'naive', 'shadcn', 'vuetify', 'quasar'].includes(frontend)
  ) {
    const element = frontend === 'element';
    await put(
      path.join(web, 'src/main.ts'),
      element
        ? `import { createApp } from 'vue';\nimport ElementPlus from 'element-plus';\nimport zhCn from 'element-plus/es/locale/lang/zh-cn';\nimport 'element-plus/dist/index.css';\nimport 'element-plus/theme-chalk/dark/css-vars.css';\nimport App from './ElementApp.vue';\nimport './style.css';\ncreateApp(App).use(ElementPlus, { locale: zhCn }).mount('#app');\n`
        : `import { createApp } from 'vue';\nimport App from './${frontend === 'shadcn' ? 'Shadcn' : 'Naive'}App.vue';\nimport './style.css';\n${frontend === 'shadcn' ? "import './shadcn.css';\n" : ''}createApp(App).mount('#app');\n`,
    );
    if (frontend === 'vuetify')
      await put(
        path.join(web, 'src/main.ts'),
        `import{createApp}from'vue';import{createVuetify}from'vuetify';import*as components from'vuetify/components';import*as directives from'vuetify/directives';import{aliases,mdi}from'vuetify/iconsets/mdi-svg';import'vuetify/styles';import App from'./VuetifyApp.vue';import'./style.css';createApp(App).use(createVuetify({components,directives,icons:{defaultSet:'mdi',aliases,sets:{mdi}}})).mount('#app');`,
      );
    if (frontend === 'quasar')
      await put(
        path.join(web, 'src/main.ts'),
        `import{createApp}from'vue';import{Quasar}from'quasar';import*as components from'quasar';import iconSet from'quasar/icon-set/svg-mdi-v7';import lang from'quasar/lang/zh-CN';import'quasar/dist/quasar.css';import App from'./QuasarApp.vue';import'./style.css';createApp(App).use(Quasar,{components,iconSet,lang}).mount('#app');`,
      );
    for (const [key, name] of [
      ['element', 'Element'],
      ['naive', 'Naive'],
      ['shadcn', 'Shadcn'],
      ['vuetify', 'Vuetify'],
      ['quasar', 'Quasar'],
    ])
      if (key !== frontend)
        for (const suffix of ['App', 'Workspace'])
          await rm(path.join(web, 'src', name + suffix + '.vue'));
    if (frontend !== 'vuetify') {
      delete pkg.dependencies.vuetify;
      delete pkg.dependencies['@mdi/js'];
    }
    await rm(path.join(web, 'src/QuasarComponents.vue'));
    for (const [kind, name] of [
      ['element', 'Element'],
      ['naive', 'Naive'],
      ['shadcn', 'Shadcn'],
      ['vuetify', 'Vuetify'],
    ])
      if (frontend !== kind)
        await rm(path.join(web, 'src', name + 'Demos.vue'));
    if (frontend === 'quasar') await rm(path.join(web, 'src/LibraryDemos.vue'));
    await edit('src/demo-navigation.ts', inlineComponentCatalog);
    if (frontend !== 'quasar') {
      delete pkg.dependencies.quasar;
      delete pkg.dependencies['@quasar/extras'];
    }
    if (!element) {
      delete pkg.dependencies['element-plus'];
      await rm(path.join(web, 'src/ElementNavigation.vue'));
    }
    if (frontend !== 'naive') delete pkg.dependencies['naive-ui'];
    if (frontend !== 'shadcn') {
      await rm(path.join(web, 'src/components'), {
        recursive: true,
        force: true,
      });
      await rm(path.join(web, 'src/shadcn.css'));
      await rm(path.join(web, 'shadcn-source.json'));
      await rm(path.join(web, 'LICENSE.shadcn'));
      for (const key of [
        'reka-ui',
        'cn',
        'class-variance-authority',
        '@vueuse/core',
      ])
        delete pkg.dependencies[key];
    }
    await edit('vite.config.ts', (text) =>
      text
        .replace(
          "process.env.WORKERKIT_DEMO_KIND || 'element'",
          JSON.stringify(frontend),
        )
        .replace('outDir: `dist/${kind}`', "outDir: 'dist'")
        .replace(
          "publicDir: '../nuxt-dashboard/public'",
          "publicDir: 'public'",
        ),
    );
  } else if (frontend === 'vben') {
    await edit('src/bootstrap.ts', (text) =>
      text
        .replace(/^import (componentPages|workspacePages) from .*;\n/gm, '')
        .replace(
          /const pages = \[[\s\S]*?\n  \];/,
          "const pages = [{ path: '/workspace', name: 'Workspace', title: '业务工作台', icon: 'lucide:activity' }];",
        )
        .replace(
          "component: p.path === '/workspace' ? () => import('./Workspace.vue') : () => import('./Demo.vue')",
          "component: () => import('./Workspace.vue')",
        )
        .replace(
          "{ path: '/:pathMatch(.*)*', redirect: '/' }",
          "{ path: '/:pathMatch(.*)*', redirect: '/workspace' }",
        ),
    );
    await rm(path.join(web, 'src/Demo.vue'));
    await rm(path.join(web, 'src/ComponentExperience.vue'));
    await rm(path.join(web, 'src/Trend.vue'));
  } else if (['pro', 'refine'].includes(frontend)) {
    const pro = frontend === 'pro';
    await put(
      path.join(web, 'src/main.jsx'),
      `import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport { ConfigProvider, App } from 'antd';\nimport zhCN from 'antd/locale/zh_CN';\nimport Workspace from './Workspace';\nimport './style.css';\n${pro ? "import { ProLayout, PageContainer } from '@ant-design/pro-components';" : "import { Refine } from '@refinedev/core';\nimport { ThemedLayout } from '@refinedev/antd';"}\ncreateRoot(document.getElementById('root')).render(<ConfigProvider locale={zhCN}><App>${pro ? '<ProLayout title="WorkerKit" logo="/app/favicon.svg" route={{ routes: [{ path: "/app/workspace", name: "业务工作台" }] }}><PageContainer title={<h1 className="pro-page-heading">业务工作台</h1>} content="查看当前后端的任务、运行记录与依赖状态。"><Workspace /></PageContainer></ProLayout>' : '<Refine resources={[{ name: "workspace", list: "/app/workspace", meta: { label: "业务工作台" } }]} options={{ disableTelemetry: true }}><ThemedLayout Title={() => <strong>WorkerKit</strong>}><div className="refine-content"><h1>业务工作台</h1><p className="muted">查看当前后端的任务、运行记录与依赖状态。</p><Workspace /></div></ThemedLayout></Refine>'}</App></ConfigProvider>);\n`,
    );
    await rm(path.join(web, 'src/ComponentExperience.jsx'));
    for (const dep of Object.keys(pkg.dependencies || {}))
      if (
        pro
          ? dep.startsWith('@refinedev/')
          : dep === '@ant-design/pro-components'
      )
        delete pkg.dependencies[dep];
  } else if (['tabler', 'adminlte'].includes(frontend)) {
    const css =
      frontend === 'tabler'
        ? '@tabler/core/dist/css/tabler.min.css'
        : 'admin-lte/dist/css/adminlte.min.css';
    const layout =
      frontend === 'tabler'
        ? '<div class="page"><aside class="navbar navbar-vertical navbar-expand-lg"><div class="container-fluid"><a class="navbar-brand" href="/app/workspace">WorkerKit</a><a class="nav-link" href="/app/workspace">业务工作台</a></div></aside><div class="page-wrapper"><main class="page-body"><div class="container-xl"><h1>业务工作台</h1><div id="workspace-root"></div></div></main></div></div>'
        : '<div class="app-wrapper"><header class="app-header navbar"><div class="container-fluid"><a class="navbar-brand" href="/app/workspace">WorkerKit</a></div></header><aside class="app-sidebar bg-body-secondary"><div class="sidebar-wrapper"><nav><a class="nav-link" href="/app/workspace">业务工作台</a></nav></div></aside><main class="app-main"><div class="app-content pt-4"><div class="container-fluid"><h1>业务工作台</h1><div id="workspace-root"></div></div></div></main></div>';
    await put(
      path.join(web, 'src/main.js'),
      `import '${css}';\nimport { operations, workspace } from './workspace';\ndocument.body.className = '${frontend === 'adminlte' ? 'layout-fixed sidebar-expand-lg' : ''}';\ndocument.getElementById('app').innerHTML = ${JSON.stringify(layout)};\nconst render = () => document.getElementById('workspace-root').innerHTML = workspace();\noperations.subscribe(render); render(); operations.refresh();\ndocument.addEventListener('click', e => { const b = e.target.closest('[data-workspace-action]'); if (!b) return; b.dataset.workspaceAction === 'refresh' ? operations.refresh() : operations.change(b.dataset.workspaceAction, b.dataset.plan); });\ndocument.addEventListener('submit', e => { if (e.target.id !== 'workspace-create') return; e.preventDefault(); const d = new FormData(e.target); operations.create(d.get('task'), d.get('minutes')); });\n`,
    );
    delete pkg.dependencies[
      frontend === 'tabler' ? 'admin-lte' : '@tabler/core'
    ];
  } else {
    await put(
      path.join(web, '.vitepress/config.mts'),
      `import { defineConfig } from 'vitepress';\nexport default defineConfig({ lang: 'zh-CN', title: 'WorkerKit', base: '/app/', themeConfig: { nav: [{ text: '业务工作台', link: '/workspace' }], sidebar: [{ text: '应用', items: [{ text: '业务工作台', link: '/workspace' }] }] } });\n`,
    );
    for (const file of await readdir(web))
      if (file.endsWith('.md') && file !== 'workspace.md')
        await rm(path.join(web, file));
    await put(
      path.join(web, 'index.md'),
      '# WorkerKit\n\n[打开业务工作台](./workspace)\n',
    );
  }
  pkg.name = '@app/web';
  // Vben shares its reviewed pnpm lock with the upstream workspace closure.
  // Keep that declared dependency until the pinned lock is upgraded together.
  if (frontend !== 'vben') delete pkg.dependencies?.echarts;
  if (['pro', 'refine'].includes(frontend)) {
    delete pkg.dependencies['@refinedev/react-router'];
    delete pkg.dependencies['react-router'];
  }
  if (['tabler', 'adminlte'].includes(frontend))
    delete pkg.dependencies.primeicons;
  if (frontend === 'nuxt') {
    pkg.devDependencies['@types/node'] = '26.6.5';
    const tsconfig = await json(path.join(web, 'tsconfig.json'));
    tsconfig.compilerOptions.types.push('node');
    await put(path.join(web, 'tsconfig.json'), tsconfig);
  }
  await put(path.join(web, 'package.json'), pkg);
}

const frontendServer = (
  backend,
) => `export async function serveFrontend(request: Request, env: Pick<CloudflareEnv, 'ASSETS'>) {
  const url = new URL(request.url)
  if (url.pathname === '/') return Response.redirect(new URL('/app/workspace${backend.frontend === 'docs' ? '.html' : ''}', url).href, 302)
  const assets = env.ASSETS
  if (url.pathname.startsWith('/management-assets/')) return assets ? assets.fetch(request) : new Response('Assets not configured', { status: 503 })
  if (!url.pathname.startsWith('/app/')) return undefined
  if (!assets) return new Response('Assets not configured', { status: 503 })
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405 })
  if (url.pathname.endsWith('/')) url.pathname += 'index.html'
  let response = await assets.fetch(new Request(url, request))
  if (response.status === 404 && !url.pathname.split('/').at(-1)!.includes('.')) {
    url.pathname = ${backend.frontend === 'docs' ? "url.pathname + '.html'" : "'/app/index.html'"}
    response = await assets.fetch(new Request(url, request))
  }
  return (response.headers.get('Content-Type') ?? '').includes('text/html') ? new HTMLRewriter().on('body', { element(el) { el.setAttribute('data-workerkit-backend', '${backend.backend}') } }).transform(response) : response
}
`;

export async function prepareBackend({
  kit,
  project,
  frontend,
  backend,
  put,
  json,
}) {
  const server = path.join(project, 'server'),
    source = path.join(kit, 'examples/payload-dashboard/app');
  await mkdir(server, { recursive: true });
  const original = await json(path.join(source, 'package.json'));
  const config = JSON.parse(
    await readFile(path.join(source, 'wrangler.jsonc'), 'utf8'),
  );
  config.name = 'workerkit-app';
  config.main = 'worker.ts';
  config.vars = {
    WORKERKIT_ORIGIN: 'http://localhost:8787',
    ...(backend === 'sonic' ? { SONIC_ORIGIN: 'http://localhost:8787' } : {}),
  };
  config.assets.run_worker_first = ['/', '/app/*'];
  config.d1_databases = config.d1_databases.filter((d) =>
    backend === 'payload' ? d.binding === 'D1' : d.binding === 'SONIC_DB',
  );
  config.r2_buckets = config.r2_buckets.filter((d) =>
    backend === 'payload' ? d.binding === 'R2' : d.binding === 'SONIC_MEDIA',
  );
  config.kv_namespaces = config.kv_namespaces.filter(
    (item) =>
      item.binding === 'NATIVE_STORE' ||
      (backend === 'sonic' && item.binding === 'SONIC_CACHE'),
  );
  delete config.ratelimits;
  config.durable_objects.bindings = config.durable_objects.bindings.filter(
    (item) => item.name === 'TASKS',
  );
  config.migrations = config.migrations.filter(
    (item) => item.tag !== 'v3-standard-auth',
  );
  const deps = {
    '@pengzhendong/worker-kit': 'file:../vendor/worker-kit',
    hono: original.dependencies.hono,
    agents: original.dependencies.agents,
    'cron-schedule': original.dependencies['cron-schedule'],
    '@cloudflare/workers-types':
      original.dependencies['@cloudflare/workers-types'],
  };
  const dev = {
    wrangler: original.devDependencies.wrangler,
    tsx: original.devDependencies.tsx,
    typescript: original.devDependencies.typescript,
    '@types/node': original.devDependencies['@types/node'],
  };
  const scripts = {
    types: 'wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts',
    preview: 'wrangler dev --local --ip 127.0.0.1 --port 8787',
    'dry-run': 'wrangler deploy --dry-run --outdir .workerkit-bundle',
    bootstrap: 'tsx bootstrap.ts',
  };
  if (backend === 'payload') {
    for (const dir of ['src', 'public'])
      await cp(path.join(source, dir), path.join(server, dir), {
        recursive: true,
        filter: (file) =>
          !/\/(?:sonic(?:-operations|-collection|-assets)?|hub)\.ts$/.test(
            file,
          ),
      });
    for (const file of [
      'next.config.ts',
      'open-next.config.ts',
      'tsconfig.json',
      '.npmrc',
      'AGENTS.md',
    ])
      await cp(path.join(source, file), path.join(server, file));
    for (const [name, version] of Object.entries(original.dependencies))
      if (
        name.startsWith('@payloadcms/') ||
        [
          'payload',
          'next',
          'react',
          'react-dom',
          'graphql',
          '@opennextjs/cloudflare',
          'dotenv',
        ].includes(name)
      )
        deps[name] = version;
    dev['@types/react'] = original.devDependencies['@types/react'];
    dev['@types/react-dom'] = original.devDependencies['@types/react-dom'];
    Object.assign(scripts, {
      payload: 'payload',
      migrate: 'payload migrate',
      build: 'next build --webpack',
      'build:worker': 'opennextjs-cloudflare build',
    });
    await put(
      path.join(server, 'bootstrap.ts'),
      `import 'dotenv/config'\nimport { getPayload } from 'payload'\nimport config from './src/payload.config'\nconst payload = await getPayload({ config })\ntry { if (!(await payload.count({ collection: 'users', overrideAccess: true })).totalDocs) await payload.create({ collection: 'users', overrideAccess: true, data: { username: process.env.PAYLOAD_DEMO_USERNAME || 'admin', email: process.env.PAYLOAD_DEMO_EMAIL!, password: process.env.PAYLOAD_DEMO_PASSWORD!, role: 'admin' } }); console.log('Local administrator ready; existing accounts preserved.') } finally { await payload.destroy() }\nprocess.exit(0)\n`,
    );
    await put(
      path.join(server, 'worker.ts'),
      `// @ts-ignore Generated by OpenNext.\nimport next from './.open-next/worker.js'\nimport { serveFrontend } from './src/workerkit/frontends'\nexport { WorkerKitTasks } from './src/workerkit/tasks'\nexport default { async fetch(request, env, ctx) { return await serveFrontend(request, env) ?? next.fetch(request, env, ctx) } } satisfies ExportedHandler<CloudflareEnv>\n// @ts-ignore Generated by OpenNext.\nexport { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js'\n`,
    );
  } else {
    for (const file of [
      'sonic.ts',
      'sonic-collection.ts',
      'sonic-operations.ts',
      'demo-login.ts',
      'tasks.ts',
    ]) {
      const target = path.join(server, 'src/workerkit', file);
      await mkdir(path.dirname(target), { recursive: true });
      await cp(path.join(source, 'src/workerkit', file), target);
    }
    Object.assign(deps, {
      '@sonicjs-cms/core': original.dependencies['@sonicjs-cms/core'],
      'drizzle-orm': original.dependencies['drizzle-orm'],
      zod: original.dependencies.zod,
      'better-auth': '1.7.7',
    });
    config.assets.directory = 'public';
    scripts.migrate = 'wrangler d1 migrations apply SONIC_DB --local';
    await cp(
      path.join(source, 'sonic-seed.mjs'),
      path.join(server, 'bootstrap.mjs'),
    );
    scripts.bootstrap = 'node bootstrap.mjs';
    await put(path.join(server, 'tsconfig.json'), {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        lib: ['ES2022', 'DOM'],
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        allowImportingTsExtensions: true,
      },
      include: ['src', 'worker.ts', 'cloudflare-env.d.ts'],
    });
    await put(
      path.join(server, '.npmrc'),
      'workspaces=false\nlegacy-peer-deps=false\nstrict-peer-deps=true\n',
    );
    await put(
      path.join(server, 'worker.ts'),
      `import { serveSonic } from './src/workerkit/sonic'\nimport { serveFrontend } from './src/workerkit/frontends'\nexport { WorkerKitTasks } from './src/workerkit/tasks'\nexport default { async fetch(request, env, ctx) { return await serveFrontend(request, env) ?? serveSonic(request, env, ctx) } } satisfies ExportedHandler<CloudflareEnv>\n`,
    );
  }
  await put(
    path.join(server, 'src/workerkit/frontends.ts'),
    frontendServer({ frontend, backend }),
  );
  const tasks = await readFile(
    path.join(source, 'src/business/tasks.ts'),
    'utf8',
  );
  const start = tasks.indexOf('  const db ='),
    end = tasks.indexOf("  return { 'check-bindings':");
  const selectedChecks = `  const checks = [\n    { name: 'D1', check: () => env.${backend === 'sonic' ? 'SONIC_DB' : 'D1'}.prepare('SELECT 1').first() },\n    { name: 'R2', check: () => env.${backend === 'sonic' ? 'SONIC_MEDIA' : 'R2'}.head('__workerkit_health_check__') },\n  ]\n`;
  await put(
    path.join(server, 'src/business/tasks.ts'),
    (tasks.slice(0, start) + selectedChecks + tasks.slice(end)).replaceAll(
      "'payload' | 'sonic' | 'native' | 'hub'",
      `'${backend}'`,
    ),
  );
  const taskWorker = path.join(server, 'src/workerkit/tasks.ts');
  await put(
    taskWorker,
    (await readFile(taskWorker, 'utf8'))
      .replace("['payload', 'sonic', 'native', 'hub']", `['${backend}']`)
      .replaceAll("'payload' | 'sonic' | 'native' | 'hub'", `'${backend}'`),
  );
  await put(
    path.join(server, '.env.example'),
    `PAYLOAD_SECRET=\nSONIC_AUTH_SECRET=\nNEXT_TELEMETRY_DISABLED=1\nPAYLOAD_DEMO_EMAIL=admin@workerkit.test\nPAYLOAD_DEMO_USERNAME=admin\nPAYLOAD_DEMO_PASSWORD=password\n`,
  );
  await put(path.join(server, 'package.json'), {
    name: '@app/server',
    private: true,
    type: 'module',
    scripts,
    dependencies: deps,
    devDependencies: dev,
  });
  await put(path.join(server, 'wrangler.jsonc'), config);
  for (const file of backend === 'payload'
    ? ['LICENSE.md', 'UPSTREAM_README.md', 'upstream.json']
    : ['SONICJS_LICENSE.md'])
    await cp(
      path.join(kit, 'examples/payload-dashboard', file),
      path.join(server, file),
    );
}

export const projectScript = await readFile(
  new URL('./templates/cms-project.mjs', import.meta.url),
  'utf8',
);
