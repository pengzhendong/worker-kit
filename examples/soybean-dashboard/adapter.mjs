import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
export async function adapt(root, { comparison = false } = {}) {
  const edit = async (file, change) => {
    const p = path.join(root, file);
    await writeFile(p, change(await readFile(p, 'utf8')));
  };
  const workspacePages = JSON.parse(
    await readFile(
      new URL('../ui-demo/workspace-pages.json', import.meta.url),
      'utf8',
    ),
  );
  const icons = [
    'mdi:pulse',
    'mdi:monitor-dashboard',
    'mdi:calendar-clock',
    'mdi:clipboard-list-outline',
    'mdi:cog-outline',
  ];
  const components = comparison
    ? JSON.parse(
        await readFile(
          new URL('../ui-demo/component-pages.json', import.meta.url),
          'utf8',
        ),
      )
    : [{ key: 'preview', title: '文件', path: '/components/preview' }];
  const componentIcons = {
    table: 'mdi:table',
    form: 'mdi:form-textbox',
    dialogs: 'mdi:message-outline',
    preview: 'mdi:eye-outline',
    layout: 'mdi:view-grid-outline',
    theme: 'mdi:palette-outline',
  };
  const pages = [
    ...workspacePages.map((page, index) => ({
      ...page,
      path: page.path === '/' ? '/overview' : page.path,
      icon: icons[index],
    })),
    ...components.map(({ key, title, path }) => ({
      id: key,
      label: title,
      path,
      icon: comparison ? componentIcons[key] : 'mdi:eye-outline',
    })),
  ];
  // Bundle the MDI route icons with the native Iconify renderer (MDI uses a 24×24 viewBox).
  await edit('src/plugins/iconify.ts', (text) => {
    const icons = [...new Set(pages.map((page) => page.icon))];
    const imports = icons.map(
      (icon, index) =>
        `import WorkerKitIcon${index} from '~icons/${icon.replace(':', '/')}?raw';`,
    );
    const registrations = icons.map(
      (icon, index) =>
        `  registerIcon(${JSON.stringify(icon)}, WorkerKitIcon${index});`,
    );
    return [
      ...imports,
      text
        .replace(
          'import { addAPIProvider }',
          'import { addAPIProvider, addIcon }',
        )
        .replace(
          'export function setupIconifyOffline() {',
          `function registerIcon(name: string, svg: string) {
  addIcon(name, { body: svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>')), width: 24, height: 24 });
}

export function setupIconifyOffline() {
${registrations.join('\n')}`,
        ),
    ].join('\n');
  });
  await writeFile(
    path.join(root, 'src/views/home/index.vue'),
    `<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Workspace from '@/workerkit/NaiveWorkspace.vue';
${comparison ? "import Demos from '@/workerkit/NaiveDemos.vue';\nimport { useThemeStore } from '@/store/modules/theme';\nconst theme = useThemeStore();" : "import DemoFiles from '@/workerkit/DemoFiles.vue';"}
import '@/workerkit/style.css';
const route = useRoute();
const pages = ${JSON.stringify(pages)};
const page = computed(() => pages.find(item => item.path === route.path) || pages[0]);
</script>
<template>${
      comparison
        ? `<Demos v-if="page.path.startsWith('/components/')" :key="page.id" :kind="page.id" :title="page.label" @toggle-theme="theme.setThemeScheme(theme.darkMode ? 'light' : 'dark')" />`
        : `<DemoFiles v-if="page.id === 'preview'"/>`
    }<Workspace v-else :section="page.id" :title="page.label"/></template>
`,
  );
  await edit('src/router/guard/index.ts', (text) =>
    text.replace('  createRouteGuard(router);', ''),
  );
  await edit('src/router/routes/index.ts', (text) =>
    text
      .replace(
        'const customRoutes: CustomRoute[] = [];',
        `const pages = ${JSON.stringify(pages)};
const componentPreview = location.pathname.includes('/components/');
const customRoutes = pages.filter(({ path }) => !componentPreview || path.startsWith('/components/')).map(({ id, path, label, icon }, order) => ({
  name: (componentPreview ? order === 0 : id === 'workspace') ? 'home' : 'workerkit-' + id,
  path,
  component: 'layout.base$view.home',
  meta: { title: label, icon, order, constant: true },
})) as CustomRoute[];`,
      )
      .replace(
        '[...customRoutes, ...generatedRoutes]',
        '[...customRoutes, ...generatedRoutes.filter(route => route.name !== "home")]',
      ),
  );
  await edit(
    'src/router/index.ts',
    (text) =>
      "import { useRouteStore } from '@/store/modules/route';\n" +
      text.replace(
        '  app.use(router);\n  createRouterGuard(router);',
        `  app.use(router);
  createRouterGuard(router);
  await useRouteStore().initConstantRoute();
  router.beforeEach((to, from) => {
    const backend = from.query.backend ?? new URLSearchParams(location.search).get('backend');
    if (backend && !to.query.backend) return { path: to.path, query: { ...to.query, backend }, hash: to.hash };
  });
  const relative = location.pathname.slice((VITE_BASE_URL || '/').length - 1);
  await router.replace((relative === '/' ? '/workspace' : relative) + location.search);
  `,
      ),
  );
  await edit('src/locales/langs/zh-cn.ts', (text) =>
    text.replace("title: 'Soybean 管理系统'", "title: 'WorkerKit'"),
  );
  await writeFile(
    path.join(root, 'src/components/common/system-logo.vue'),
    '<script setup>const logo=import.meta.env.BASE_URL+"favicon.svg";</script><template><img :src="logo" alt="" width="32" height="32"/></template>',
  );
  await edit('src/main.ts', (text) =>
    text.replace('  setupAppVersionNotification();', ''),
  );
  await edit('src/layouts/modules/global-header/index.vue', (text) =>
    text.replace(
      '<style scoped></style>',
      `<style scoped>
@media (max-width: 400px) {
  :deep(button.n-button) {
    padding-inline: 8px;
  }
}
</style>`,
    ),
  );
  await edit(
    'src/layouts/modules/global-header/components/user-avatar.vue',
    (text) => {
      text = text.replace(
        '<script setup lang="ts">',
        `<script setup lang="ts">\nimport {workspaceIdentity} from '@/workerkit/useWorkspace';\nimport {backendLoginUrl,logoutBackend} from '@/workerkit/backend-session';`,
      );
      return text
        .replace('  toLogin();', '  location.assign(backendLoginUrl());')
        .replace(
          '      authStore.resetStore();',
          '      return logoutBackend();',
        )
        .replace('!authStore.isLogin', '!workspaceIdentity')
        .replace('authStore.userInfo.userName', 'workspaceIdentity?.name');
    },
  );
}
