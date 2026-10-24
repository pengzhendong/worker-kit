# 模块声明、导航与操作权限

`@pengzhendong/worker-kit/modules` 提供不依赖 React、Hono 或存储的模块定义与纯函数。项目显式组合声明，前端装配普通 React 页面，服务端装配普通 Hono 路由；没有全局注册表、动态插件加载或自动生成 CRUD。

## 公共声明

在消费项目自己的公共文件中声明：

```ts
import { defineModules } from '@pengzhendong/worker-kit/modules';

export const modules = defineModules([
  {
    id: 'files', label: '文件管理', path: '/files', icon: 'files',
    navigation: { placement: 'sidebar', order: 30 },
    actions: { read: '查看列表', upload: '上传', download: '下载', delete: '删除' },
    access: 'read', enabled: true,
  },
] as const);
```

| 字段 | 含义 |
| --- | --- |
| `id` | 稳定模块标识，也是权限前缀；改名会改变权限标识 |
| `label` / `description` | 名称与可选说明 |
| `path` | 唯一静态页面路径；支持 `/` 和小写字母、数字、连字符组成的多级路径 |
| `icon` | 项目自己的图标名，公共声明不导入 JSX |
| `navigation` | 可选菜单位置 `sidebar` / `user` 与数值顺序；省略时仍可直接访问页面，但无菜单 |
| `actions` | 操作名到显示名称的映射，权限标识由 `id:action` 组成 |
| `access` | 打开页面需要的本模块操作；省略表示该辅助页面只要求登录 |
| `enabled` | 默认启用；`false` 时不出菜单、不解析页面，也不允许接口操作 |
| `developmentOnly` | 仅显式传入 `development: true` 时启用，默认关闭 |

`defineModules` 在组合时拒绝重复 ID、重复路径、非法标识、无效排序和未声明的页面操作，并复制、冻结配置。可以组合多个模块数组，不向进程级单例注册内容。

路径不是 API 地址，也不是另一个路由器。参数化详情页、路由嵌套和 URL 状态由项目按需使用自己的路由实现。示例用声明中的路径生成 hash 地址，保留旧的 `#resources` 链接；未知路径显示 404，已启用但未授权的页面显示 403。

## 前端装配

服务端通过已认证接口返回 `AccessSnapshot`：

```json
{ "permissions": ["files:read", "files:download"] }
```

前端在成功取得权限后再挂载业务页面：

```tsx
import { getModuleNavigation, resolveModule, canAccessModule } from '@pengzhendong/worker-kit/modules';
import { ModuleAccessProvider, useModuleAccess } from '@pengzhendong/worker-kit/web';

const access = { authenticated: true, permissions: snapshot.permissions };
const sidebar = getModuleNavigation(modules, 'sidebar', access);
const current = resolveModule(modules, locationPath, access);
const allowed = current && canAccessModule(current, access);

// 将 sidebar 转成 AdminShell 的 items；仅 allowed 时挂载对应的项目页面。
<ModuleAccessProvider modules={modules} access={access}>
  <Application />
</ModuleAccessProvider>;

function FileActions() {
  const { can } = useModuleAccess();
  return can('files:upload') ? <button>上传</button> : null;
}
```

Provider 和 hook 只控制界面。`canOpen(id)` 用于页面及其他模块的跳转入口，`can(permission)` 用于操作控件。没有权限或加载失败时不挂载受保护页面，防止先请求数据再隐藏界面。页面函数表由应用维护，示例用 `Record<DashboardModuleId, () => ReactNode>` 检查公共模块是否都有页面实现。

## 服务端校验

先完成应用认证，再接入可信服务端策略。不从请求头、查询参数、请求体或前端 localStorage 接收授权结果。

```ts
import type { Context } from 'hono';
import { createModuleAccess } from '@pengzhendong/worker-kit/server';
import type { WorkerEnv } from '@pengzhendong/worker-kit/server';

const access = createModuleAccess({
  modules,
  resolvePermissions: async (c: Context<WorkerEnv<Bindings>>) => {
    const user = c.get('adminUser');
    if (!user) return null;
    return lookupTrustedPermissions(user); // 由项目实现，也可适配现有身份系统
  },
});

app.use('/api/admin/*', auth.requireAdmin);
app.get('/api/admin/access', async (c) => c.json({ permissions: await access.permissions(c) }));
app.post('/api/admin/files', access.require('files:upload'), uploadHandler);
app.get('/api/admin/files/download', access.require('files:download'), downloadHandler);
```

- `null` 表示没有已认证身份，返回 401；空数组表示已认证但没有操作授权，受限操作返回 403。
- 缺失或无效的策略结果拒绝访问；未知权限与通配符不生效，没有隐式管理员放行。
- `require` 对未声明权限在启动时抛错；对停用模块，即使策略返回它的权限也拒绝操作。
- 同次请求复用权限解析结果，下次请求重新求值。权限不是写进长期 Cookie 的静态授权副本。
- 每条 API 必须显式挂载校验，包括下载、导出和批量操作；声明元数据不会自动保护路由。
- `read`、`upload`、`download` 等互不隐式继承。只有列表权限不能下载，只有编辑权限也不会自动获得页面查看权限。
- 概览、搜索、导出等跨模块接口也需校验所展示数据的权限。示例概览对未授权数据不查询、不返回，数量为 `null`，界面显示占位。

`listModulePermissions(modules, environment?)` 列出已启用模块的已声明操作，用于项目明确选择的授权策略。示例继续使用单管理员，由应用服务端明确授予全部已启用操作。共享库没有角色表、用户管理、多租户、记录级权限或在线编辑授权功能；这些由实际业务身份系统决定。

## 示例与兼容

增加一个业务模块时，先把纯元数据加入项目模块数组，再在前端页面函数表加入组件，在服务端显式挂载路由及相应 `require` 校验，最后由项目授权策略授予需要的操作。模块数组负责组合与冲突检查；它不会自动产生页面或接口，也不会为业务创建存储。

公共声明在 `examples/dashboard/modules.ts`，前端页面装配在 `web/Dashboard.tsx`，服务端逐接口授权在 `server/index.ts`。“模块与权限”页签读取实际声明与服务端授权，不使用假角色切换。它所在的开发工具页不进入生产前端。

模块可用性目前来自项目静态声明。若按运行时环境动态停用模块，项目还需把相同可用性传给前端；仅修改服务端配置不会自动改写已打开页面中的声明。接口每次请求按实际策略校验；示例前端在登录或刷新时重新加载权限，没有权限变更推送。

开发环境原生 Local Explorer 的访问由开发服务器控制，不经过应用模块权限。它供可信本机调试，不作为生产用户的数据管理入口。

此次新增可选入口和 API，不改变原有 `AdminShell`、认证接口或列表契约。升级 submodule 后，消费项目只有接入声明和校验才获得相同行为；框架不会自动识别旧业务权限或修改原路由。

`test/modules.test.ts` 覆盖声明冲突、冻结、菜单与路由、默认拒绝、实际 D1/KV/R2 写入边界、下载与导出、模块停用和概览过滤。`e2e/access.spec.ts` 覆盖只读控件、直接 URL 越权、权限加载失败重试与刷新后撤权。
