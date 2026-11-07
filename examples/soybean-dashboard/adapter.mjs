import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
export async function adapt(root) {
  const edit = async (file, change) => {
    const p = path.join(root, file);
    await writeFile(p, change(await readFile(p, 'utf8')));
  };
  await writeFile(
    path.join(root, 'src/views/home/index.vue'),
    `<script setup>import Workspace from '@/workerkit/NaiveWorkspace.vue';import '@/workerkit/style.css';</script><template><Workspace/></template>\n`,
  );
  await edit('src/router/guard/index.ts', (text) =>
    text.replace('  createRouteGuard(router);', ''),
  );
  await edit('src/router/routes/index.ts', (text) =>
    text.replace(
      'if (item.meta?.constant) {',
      "if (item.name === 'home') { item.meta.constant = true; constantRoutes.push(item); } else if (item.meta?.constant) {",
    ),
  );
  await edit(
    'src/router/index.ts',
    (text) =>
      "import { useRouteStore } from '@/store/modules/route';\n" +
      text.replace(
        '  app.use(router);\n  createRouterGuard(router);',
        "  const query=Object.fromEntries(new URLSearchParams(location.search));\n  app.use(router);\n  createRouterGuard(router);\n  await useRouteStore().initConstantRoute();\n  router.addRoute({path:'/workspace',redirect:to=>({path:'/home',query:to.query})});\n  await router.replace({path:'/home',query});",
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
