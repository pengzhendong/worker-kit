# WorkerKit

通过 **Git submodule** 引入的 Cloudflare Workers 共享基础库。业务项目保留自己的路由、页面、数据迁移和部署配置，公共能力从源码入口导入。

当前版本：`0.2.0`，接口仍在通过真实项目接入验证。包含可操作的管理控制台：D1 配置清单、R2 文件管理、KV 应用设置、D1 操作日志。多用户和任务执行尚未接入。

## 已包含

| 入口 | 能力 |
| --- | --- |
| `@pengzhendong/worker-kit/server` | Hono 应用、统一 JSON 错误、请求 ID、结构化日志、安全响应头、可选单管理员认证、可复用 KV 设置路由与 R2 文件路由 |
| `@pengzhendong/worker-kit/web` | React/Ant Design 后台布局、移动端导航、主题、登录页、页面标题、统计卡片、API 客户端 |
| `@pengzhendong/worker-kit/tooling/vite` | React 与 Cloudflare Vite 插件组合 |
| `@pengzhendong/worker-kit/tooling/tsconfig.json` | 可继承的 TypeScript 基础配置 |

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

该命令生成绑定类型、检查 TypeScript、在 workerd 中测试关键行为、构建前后端，再执行部署 dry-run。它不会发布到 Cloudflare。

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

纯 API 项目只引用服务端入口；workspace 开发安装仍可能包含本库自测所需的开发依赖，但 React 和 Ant Design 不会进入服务端构建。前端项目应显式声明 React、React DOM、Ant Design、Vite、`@vitejs/plugin-react`、`@cloudflare/vite-plugin` 和 Wrangler；具体经过验证的版本见本仓库 `package.json`。`peerDependencies` 表达兼容范围，父项目的 lockfile 固定实际解析结果。

完整的前后端接入方式见 `examples/dashboard/`。复制它的业务入口、页面、migrations 目录和配置到父项目后，将示例中的 `file:../..` 依赖改成上面的 workspace 版本依赖，并把 Wrangler schema 路径改为父项目的 `./node_modules/wrangler/config-schema.json`。示例中的 Worker 名和限流 namespace ID 也由父项目重新指定。

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

`createApiClient()` 返回普通请求函数，保留状态码、业务错误码和请求 ID，通过 `ApiClientError` 返回失败。401 后显示登录页还是跳转，由业务决定。它不会自动重试写请求。

## 可操作的示例功能

- 工作台：读取实际配置数量、启用数量、文件数量与用量，展示最近更新、变更记录和绑定连接状态。
- 资源管理：D1 持久化，支持新增、编辑、删除、搜索、筛选、分页、批量启停和 JSON 导出。这里管理的是配置清单，未连接真实的订阅抓取或任务执行器。
- 文件管理：私有 R2 文件上传、游标分页、当前页搜索、认证下载、删除。默认单文件最大 10 MB；文件只在当前应用的 `uploads/` 前缀中操作。
- 系统设置：KV 保存应用名称、描述、联系邮箱、分页和欢迎区域偏好；名称会更新导航与页面标题。
- 操作日志：D1 记录资源、文件与设置变更，可按操作筛选和分页。它不是全量 HTTP 访问日志。
- 当前账户：当前身份、会话期限和退出。

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

新克隆或 CI 使用：

```sh
git submodule update --init --recursive
npm ci
npm run check
```

这会使用父项目记录的提交。CI 不应执行 `git submodule update --remote`，以免构建时浮动升级。

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
