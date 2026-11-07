import { readFile, writeFile, readdir, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
export async function adapt(root) {
  const edit = async (file, change) => {
    const p = path.join(root, file);
    await writeFile(p, change(await readFile(p, 'utf8')));
  };
  // Keep the native layout/theme/tag implementation; the old demo's fake JWT
  // guard and demo routes do not grant access to WorkerKit APIs.
  for (const file of await readdir(path.join(root, 'src/router/modules')))
    if (file !== 'remaining.ts')
      await rm(path.join(root, 'src/router/modules', file), {
        recursive: true,
        force: true,
      });
  await writeFile(
    path.join(root, 'src/router/modules/workspace.ts'),
    `export default {path:'/',component:()=>import('@/layout/index.vue'),redirect:'/workspace',meta:{title:'工作空间',icon:'ep/monitor'},children:[{path:'/workspace',name:'WorkerKitWorkspace',component:()=>import('@/workerkit/ElementWorkspace.vue'),meta:{title:'业务工作台',showLink:true}}]};\n`,
  );
  await edit('src/router/index.ts', (text) => {
    const start = text.indexOf('router.beforeEach('),
      end = text.indexOf('router.afterEach(');
    if (start < 0 || end < start)
      throw Error('Review Pure Admin router adaptation');
    return text.slice(0, start) + text.slice(end);
  });
  await edit('src/main.ts', (text) => {
    for (const pattern of [
      /import \{ useEcharts \} from [^;]+;\n/,
      /import \{ useVxeTable \} from [^;]+;\n/,
    ])
      text = text.replace(pattern, '');
    text = text
      .replace('.use(useVxeTable)', '')
      .replace('.use(useEcharts)', '');
    return (
      "import { usePermissionStoreHook } from '@/store/modules/permission';\nimport './workerkit/style.css';\n" +
      text.replace(
        'setupStore(app);',
        'setupStore(app);\n  usePermissionStoreHook().handleWholeMenus([]);',
      )
    );
  });
  await edit('build/plugins.ts', (text) =>
    text
      .replace(/import \{ vitePluginFakeServer \} from [^;]+;\n/, '')
      .replace(/vitePluginFakeServer\(\{[\s\S]*?\}\),/, ''),
  );
  await edit(
    'src/layout/hooks/useNav.ts',
    (text) =>
      "import { logoutBackend } from '@/workerkit/backend-session';\n" +
      text.replace('useUserStoreHook().logOut();', 'void logoutBackend();'),
  );
  // Only ship routes exposed by this application; the source cache stays intact.
  for (const entry of await readdir(path.join(root, 'src/views')))
    if (!['login', 'error', 'account-settings', 'empty'].includes(entry))
      await rm(path.join(root, 'src/views', entry), {
        recursive: true,
        force: true,
      });
  for (const file of await readdir(path.join(root, 'src/views/login')))
    await rm(path.join(root, 'src/views/login', file), {
      recursive: true,
      force: true,
    });
  for (const file of await readdir(path.join(root, 'public')))
    if (!['favicon.svg', 'logo.svg', 'platform-config.json'].includes(file))
      await rm(path.join(root, 'public', file), {
        recursive: true,
        force: true,
      });
  await edit(
    'src/layout/hooks/useNav.ts',
    (text) =>
      "import {workspaceIdentity} from '@/workerkit/useWorkspace';\n" +
      text.replace(
        /const username = computed\(\(\) => \{[\s\S]*?\n  \}\);/,
        "const username = computed(() => workspaceIdentity.value?.name || '未登录');",
      ),
  );
  await edit('src/layout/hooks/useNav.ts', (text) =>
    text.replace(
      'new URL("/logo.svg", import.meta.url).href',
      'import.meta.env.BASE_URL + "favicon.svg"',
    ),
  );
  await edit('src/layout/components/lay-navbar/index.vue', (text) =>
    text
      .replace(/import LayNotice from [^;]+;\n/, '')
      .replace('<LayNotice id="header-notice" />', ''),
  );
  await rm(path.join(root, 'src/views/account-settings'), {
    recursive: true,
    force: true,
  });
  await mkdir(path.join(root, 'src/views/account-settings'), {
    recursive: true,
  });
  await writeFile(
    path.join(root, 'src/views/account-settings/index.vue'),
    `<script setup>import{useWorkspace}from'@/workerkit/useWorkspace';const{state}=useWorkspace();import{backendLoginUrl}from'@/workerkit/backend-session';</script><template><el-card header="当前账户"><p>身份和权限由选定后端管理。</p><p>{{state.data?.user.name || '正在确认身份'}}</p><el-button @click="$router.back()">返回工作台</el-button><el-link :href="backendLoginUrl()">切换账户</el-link></el-card></template>`,
  );
  await mkdir(path.join(root, 'src/views/login'), { recursive: true });
  await writeFile(
    path.join(root, 'src/views/login/index.vue'),
    `<script setup>\nimport{onMounted}from'vue';import{backendLoginUrl}from'@/workerkit/backend-session';const target=backendLoginUrl(import.meta.env.BASE_URL+'workspace'+location.search);onMounted(()=>location.replace(target));\n</script><template><a :href="target">登录当前后端</a></template>\n`,
  );
  const config = JSON.parse(
    await readFile(path.join(root, 'public/platform-config.json'), 'utf8'),
  );
  config.Title = 'WorkerKit';
  config.HideTabs = true;
  config.ResponsiveStorageNameSpace = 'workerkit-pure-';
  await writeFile(
    path.join(root, 'public/platform-config.json'),
    JSON.stringify(config, null, 2),
  );
}
