# WorkerKit

通过 **Git submodule** 引入的 Cloudflare Workers 共享基础库。业务项目保留自己的路由、页面、数据迁移和部署配置，公共能力从源码入口导入。

当前版本：`0.2.0`，接口仍在通过真实项目接入验证。包含可操作的管理控制台：D1 配置清单、R2 文件管理、KV 应用设置、D1 操作日志。多用户和任务执行尚未接入。

## 已包含

| 入口 | 能力 |
| --- | --- |
| `@pengzhendong/worker-kit/contracts` | 无运行时依赖的管理端契约：页码/游标列表、字段错误、批量逐项结果 |
| `@pengzhendong/worker-kit/modules` | 无框架依赖的模块声明、菜单排序、静态页面路径、操作权限标识与访问判断 |
| `@pengzhendong/worker-kit/server` | Hono 应用、统一 JSON 错误、请求 ID、结构化日志、安全响应头、可选单管理员认证、KV 设置路由、R2 文件路由、有时限的健康检查组合器 |
| `@pengzhendong/worker-kit/web` | React/Ant Design 后台布局、移动端导航、主题、登录页、页面标题、统计卡片、会话与请求取消、API 客户端、无缓存查询 hook、页面错误边界 |
| `@pengzhendong/worker-kit/tooling/vite` | React 与 Cloudflare Vite 插件组合 |
| `@pengzhendong/worker-kit/tooling/tsconfig.json` | 可继承的 TypeScript 基础配置 |
| `@pengzhendong/worker-kit/tooling/doctor` | 离线只读预检：依赖、submodule、原生配置、绑定与迁移文件 |

这些入口相互分离，服务端不会导入 React 或 Ant Design。业务直接使用普通 Hono 路由和 React 组件，没有自定义路由语法或插件注册系统。

## 本地运行示例

要求 Node.js 22.12+。仓库内的 dashboard 是一个普通业务应用，用于检验共享库的接入方式。

```sh
npm ci
cp examples/dashboard/.dev.vars.example examples/dashboard/.dev.vars
```

编辑 `.dev.vars`，设置自己的本地密码和随机会话密钥，然后运行：

```sh
npm run dev
```

启动会自动应用本地 D1 迁移，写入四条可编辑的示例配置；不会读取或修改已有 Worker 项目。开发服务器只监听 `127.0.0.1`。按照终端中的本地地址打开页面，输入配置的管理员凭据。没有跳过认证的开发开关。

```sh
npm run check
```

该命令生成绑定类型、检查 TypeScript、在 workerd 中测试关键行为、测试开发工具、执行只读预检、构建前后端，再执行部署 dry-run。它不会发布到 Cloudflare。`npm run doctor` 可单独检查配置；`npm run upgrade:check` 在完整检查后继续执行固定 Linux 视觉回归，需要 Docker。

开发预览的左侧“开发工具”集中展示本地 D1/KV/R2 面板、请求追踪、运行日志、Worker 调试器、Explorer API、检查命令和应用内管理入口。每项说明用途与使用时机，未配置的原生能力单独标注；该页面和调试链接不进入生产构建。详见[开发工具目录](docs/development-tools.md)。

## 在另一个项目中以 submodule 接入

WorkerKit 仓库需要先有一个 Git 提交。以下 `<worker-kit-repository>` 替换为实际仓库 URL；仓库可以公开或私有。

```sh
git submodule add <worker-kit-repository> framework
```

父项目的 `package.json` 示例：

```json
{
  "name": "my-worker",
  "private": true,
  "type": "module",
  "workspaces": ["framework"],
  "dependencies": {
    "@pengzhendong/worker-kit": "0.2.0",
    "hono": "4.13.13"
  }
}
```

在父项目根目录执行 `npm install`。npm 会把 workspace 链接为本地包，不需要发布 WorkerKit 到 npm。父项目提交自己的 lockfile；不要在各个 submodule 内单独安装依赖。只有开发 WorkerKit 本身时才使用它自己的 lockfile。

纯 API 项目只引用服务端入口；workspace 开发安装仍可能包含本库自测所需的开发依赖，但 React 和 Ant Design 不会进入服务端构建。前端项目应显式声明 React、React DOM、Ant Design、`react-error-boundary`、Vite、`@vitejs/plugin-react`、`@cloudflare/vite-plugin` 和 Wrangler；使用 doctor 另需 semver。具体经过验证的版本见本仓库 `package.json`。`peerDependencies` 表达兼容范围，父项目的 lockfile 固定实际解析结果。

完整的前后端接入方式见 `examples/dashboard/`。复制它的业务入口、页面、`modules.ts` 声明、`workerkit.check.json`、migrations 目录和配置到父项目后，将示例中的 `file:../..` 依赖改成上面的 workspace 版本依赖，并把 Wrangler schema 路径改为父项目的 `./node_modules/wrangler/config-schema.json`。示例中的 Worker 名和限流 namespace ID 也由父项目重新指定。

## 服务端接入

```ts
import { createServer, createAdminAuth } from '@pengzhendong/worker-kit/server';
import type { AdminBindings } from '@pengzhendong/worker-kit/server';

type Bindings = AdminBindings & { DB: D1Database };
const app = createServer<Bindings>();
const auth = createAdminAuth<Bindings>();

app.get('/health', (c) => c.json({ ok: true }));
app.route('/api/auth', auth.routes);
app.use('/api/admin/*', auth.requireAdmin);
app.get('/api/admin/projects', async (c) => {
  const result = await c.env.DB.prepare('SELECT id, name FROM projects').all();
  return c.json(result.results);
});

export default app;
```

中间件要在业务路由之前注册。公开 API、令牌接口、WebDAV 和 WebSocket 的权限由项目显式定义。Cron、Queue、Workflow、Durable Object 也由项目使用 Cloudflare 原生入口导出。

### 错误和日志

业务通过 `ApiError(status, code, message)` 表达可展示的客户端错误。5xx 响应隐藏内部消息。请求日志记录事件、方法、路径、响应状态、耗时和内部生成的请求 ID，不记录查询参数、请求体、凭据或绑定。路径本身也不应携带敏感信息。

可用 `createServer({ log: record => ... })` 接入项目自己的日志出口。`/health` 属于业务应用，库不会注册额外业务路径。

### 单管理员认证

绑定由业务项目配置：

- `ADMIN_USERNAME`：管理员用户名。
- `ADMIN_PASSWORD`：线上至少 12 个字符。显式启用 `allowWeakLocalPassword: true` 后，仅本机回环 HTTP 预览允许短密码。
- `ADMIN_SESSION_SECRET`：至少 32 个字符的随机密钥。
- `ADMIN_LOGIN_RATE_LIMITER`：Cloudflare Rate Limiting binding。示例为每个客户端地址每分钟 5 次。

原生限流在各 Cloudflare 位置分别计数，不是全局精确计数器。需要全局策略时由业务接入相应能力。

`auth.routes` 可以挂到自选前缀；示例为 `/api/auth`：

| 方法 | 路径 | 行为 |
| --- | --- | --- |
| POST | `/login` | JSON `{ username, password }`，设置签名 Cookie |
| GET | `/session` | 返回 `{ user, expiresAt }`，未登录返回 401 |
| POST | `/logout` | 清除当前浏览器 Cookie，返回 204 |

Hono 负责 Cookie 签名和凭据比较。会话默认 12 小时；更改用户名、密码或会话密钥会使已有会话失效。Cookie 使用 HttpOnly、SameSite=Strict，线上要求 HTTPS；HTTP 只允许本机回环地址。示例启用了短密码本机预览选项，线上 HTTPS 不适用此选项。

登录、退出和 `requireAdmin` 保护的写请求都要求同源 `Origin`。缺少配置或限流绑定时认证关闭访问，不会退化为免登录。没有多用户、权限角色或设备密码功能。

当前会话是无状态签名 Cookie：退出只清除浏览器 Cookie，服务端不能单独撤销一个已复制的 Cookie，它会持续有效至到期或凭据轮换。需要逐会话撤销的项目应选择有状态认证模块，再独立迁移。

## 前端接入

应用根部放置 `WorkerKitProvider`，按需组合 `LoginPage` 和 `AdminShell`。菜单、当前页面、导航行为和退出操作全部由业务传入。共享库不绑定 React Router，也不要求所有应用采用同一导航实现。

入口导入 `@pengzhendong/worker-kit/web/styles.css` 完成基础重置。Provider 接受标准 Ant Design `theme` 配置，默认 token、布局尺寸与 `IconBox` 可从 `/web` 导出使用。共享界面遵守[界面约定](docs/ui-guidelines.md)，业务 CSS 通过 Provider 的主题变量适配深色模式。

`AdminShell` 使用完整视口高度：侧栏和顶栏保持在原位，主内容区独立滚动；矮窗口中侧栏导航区可单独滚动，品牌和底部用户入口保持固定，窄屏采用 Drawer 导航；切换 `activeKey` 时内容回到顶部。布局实现参考 Ant Design 官方的[固定侧栏示例](https://github.com/ant-design/ant-design/blob/master/components/layout/demo/fixed-sider.tsx)与[固定顶栏示例](https://github.com/ant-design/ant-design/blob/master/components/layout/demo/fixed.tsx)，使用明确的 Flex 滚动分区适配本项目。

`username` 显示在侧栏底部，点击向上展开用户菜单。可选的 `userMenuItems` 与 `items` 使用相同的 `{ key, label, icon? }` 结构，选中时调用 `onNavigate(key)`；退出项由共享组件提供，调用 `onLogout`。示例将“当前账户”和“系统设置”放入用户菜单，顶部保留当前页面名称和主题切换。手机导航抽屉使用同一用户入口。

`createApiClient()` 返回普通请求函数，保留状态码、业务错误码、请求 ID 和 Retry-After，通过 `ApiClientError` 返回失败。默认不会改变会话；显式传入 `scope: createSessionScope()` 后，业务 401 使当前会话失效并取消旧请求，403/网络/服务故障保留身份。登录请求应使用单独的无 scope 客户端。请求不自动重试。

`useApiQuery()` 在离开页面和参数变化时取消 GET 查询；`AppErrorBoundary` 提供页面与应用两层恢复入口。示例已接入会话版本隔离，退出或重新登录时清除草稿、权限与页面数据，保留主题。缓存适配、错误边界限制和升级依赖见[应用生命周期与运行检查](docs/lifecycle-and-operations.md)。

## 模块与操作权限

项目用 `defineModules()` 集中声明模块 ID、名称、图标、页面路径、菜单位置与顺序、可用性和操作权限。`getModuleNavigation()` 派生菜单，`resolveModule()` 与 `canAccessModule()` 检查页面；前端通过 `ModuleAccessProvider` / `useModuleAccess` 控制操作入口，服务端通过 `createModuleAccess().require()` 校验相同的 `模块:操作` 标识。前后端分别装配普通 React 页面和 Hono 路由，公共声明不导入它们。

示例已经接入资源、文件、设置和操作日志的逐操作校验。菜单隐藏不代替接口鉴权，未授权操作返回 403；模块停用后不出菜单、不解析页面且不允许接口操作。单管理员由服务端明确授予已启用操作，尚无多用户角色管理。接入方法与边界见[模块与权限](docs/modules.md)。开发工具中的同名页签可查看实际声明及当前授权结果。

## 管理端接入约定

[管理端接入契约 v1](docs/admin-contract.md) 定义了页码与游标列表、允许的筛选排序、字段校验错误和批量逐项结果。服务端使用 `readPageQuery` / `readCursorQuery` 校验查询；前端使用 `getFormErrors` 将后端错误映射到表单并保留草稿。资源管理与文件列表已经接入，资源表格支持服务端排序，批量操作展示失败明细并保留失败项。

本次对资源字段校验改用 HTTP 422；列表查询改为拒绝未知参数、重复参数和非法分页。原错误结构、列表响应及文件接口保持兼容，批量接口保留旧 `updated` 计数字段并增加逐项结果。兼容边界和升级方法见契约文档。

已在 Honeybee 独立副本验证 submodule 接入、现有认证复用与旧业务适配，范围和补丁见[接入记录](docs/honeybee-integration.md)。原项目未迁移或部署。

## 可操作的示例功能

- 工作台：读取实际配置数量、启用数量、文件数量与用量，展示最近更新、变更记录和绑定连接状态。
- 资源管理：D1 持久化，支持新增、编辑、删除、搜索、筛选、分页、批量启停和 JSON 导出。这里管理的是配置清单，未连接真实的订阅抓取或任务执行器。
- 文件管理：私有 R2 文件上传、游标分页、当前页搜索、认证下载、删除。默认单文件最大 10 MB；文件只在当前应用的 `uploads/` 前缀中操作。
- 系统设置：KV 保存应用名称、描述、联系邮箱、分页和欢迎区域偏好；名称会更新导航与页面标题。
- 操作日志：D1 记录资源、文件与设置变更，可按操作筛选和分页。它不是全量 HTTP 访问日志。
- 当前账户：当前身份、会话期限和退出。
- 组件与交互：页面组合、搜索筛选与批量启停、本地文件选择、弹窗校验与失败重试、删除确认与还原、加载/空/错误状态、消息与通知。所有操作仅使用页面内的临时数据，支持重置，不写入业务 API 或存储。
- 开发工具：仅本地开发展示，按“本地调试、项目工具、模块与权限、运行与恢复、按需扩展”介绍已有工具、实际声明与授权、只读依赖诊断、错误恢复演示及检查命令。

公开 `/health` 只做存活检查；受保护的依赖诊断按需读取 D1/KV/R2。运行指标和日志使用 Cloudflare 原生 Observability。D1 操作日志可通过 `AUDIT_RETENTION_DAYS` 显式启用保留策略和手动分批清理，默认 `"0"` 关闭；没有自动删除或自建采集服务。详见[运行检查与保留策略](docs/lifecycle-and-operations.md)。

共享文件模块 `createFileRoutes({ bucket, prefix?, maxBytes?, onChange? })` 和设置模块 `createSettingsRoutes({ store, defaults, key?, onChange? })` 可直接被消费项目导入。两者必须挂在已认证的路径下，并由业务选择自己的绑定。设置模块只接收 defaults 声明过的键和相同类型的值，适合非机密应用偏好；KV 不是全局强一致配置事务。

示例的资源数据和审计表结构属于示例业务，迁移在 `examples/dashboard/migrations/` 中。资源写入与对应日志使用 D1 batch；R2/KV 与 D1 无法形成跨存储事务，因此跨存储审计采用尽力写入，失败记入服务端日志。R2 文件计数和用量概览最多枚举前 1000 个文件，超过时明确标记。

部署带数据库的应用前先确认对应资源已创建并绑定，并显式执行远程迁移；`npm run dev` 只迁移本地数据：

```sh
npm run db:local --workspace @worker-kit/dashboard
npm run db:remote --workspace @worker-kit/dashboard
```

## 配置与数据归属

- Worker 名、域名、Secrets、资源绑定、环境、静态资源路由归业务项目。
- 数据库 schema 和迁移归业务项目；框架升级不会自动迁移业务数据库。
- React/Hono 等公共运行时由父项目统一解析，避免单独安装多份。
- 仅为新项目配置新资源。迁移已有项目时保留原有 Worker 名、绑定和数据。
- 同一账号内不同应用的限流 namespace ID 应分别指定。

库不读取父项目隐式路径，不改写 Wrangler 配置，也不接管自动部署。

## 升级与 CI

submodule 固定具体提交。准备升级时，在共享库目录检出审核过的标签或提交，然后在业务项目更新 lockfile（如依赖有变化），运行项目检查，并提交 submodule 指针及相关修改。公共修复应提交到 WorkerKit，业务差异留在业务仓库。

本次前端接入增加 `react-error-boundary` peer，父项目需要显式安装。消费项目可通过 `node framework/src/tooling/doctor.mjs doctor --project .` 做离线只读预检；它不拉取 submodule、不安装、不读取 Secrets，也不能证明远程资源可用或迁移已应用。完整流程及参数见[生命周期与升级文档](docs/lifecycle-and-operations.md)。

新克隆或 CI 使用：

```sh
git submodule update --init --recursive
npm ci
npm run check
```

这会使用父项目记录的提交。CI 不应执行 `git submodule update --remote`，以免构建时浮动升级。

WorkerKit 自身还运行 `npm run test:ui`：使用固定 Linux/Chromium 容器检查滚动、图标对齐、上传区域、移动导航、主题持久化，并比较关键页面与状态的截图。需要本地 Docker；CI 使用相同镜像。基准必须人工查看后更新，不能自动接受差异。详见[界面回归检查](docs/visual-testing.md)。消费项目可沿用该测试方式，选择自己的业务页面与固定数据建立基准。

## 示例部署

在 `examples/dashboard/` 中设置自己的 Worker 名和限流 namespace ID，然后分别设置 Secrets：

```sh
npx wrangler secret put ADMIN_USERNAME
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put ADMIN_SESSION_SECRET
npm run deploy
```

部署由业务应用发起，共享库本身不部署。这个仓库的 CI 仅检查和 dry-run，不自动发布。

## 第一版边界

已通过独立 submodule 消费项目验证：创建父仓库、递归克隆、`npm ci`、前后端构建、部署 dry-run 均成功。20 项 Workers 运行时测试通过，覆盖真实 D1/KV/R2 读写和认证边界；浏览器完成登录、新增资源、刷新持久化、保存设置和菜单导航验证。

接下来可以挑选 Honeybee 等真实项目渐进迁移，现有项目尚未迁移。Queue、Workflow 以及多用户认证应由实际接入需求推动，暂不引入通用 CRUD、插件系统或隐藏资源生命周期的抽象。
