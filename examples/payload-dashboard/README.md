# WorkerKit：单 Worker 的 Payload / SonicJS 对比

> 0.5.0 已扩展至 17 套界面、Payload / SonicJS / Hono + Better Auth，以及 Nuxt、SvelteKit、Astro、React Router 和 Payload 的 Next/OpenNext。仍为同一个 Worker；当前说明见[技术地图](../docs/architecture.md)、[全栈验证](../docs/frameworks.md)和[候选调研](../docs/alternatives.md)。历史八套界面验证数据保留在下文。

这是 worker-kit 接入 Payload 的完整示例：一个 Worker 内同时提供原生后台、Hono 业务 API 和定时事件入口，八套 UI 可以分别连接 Payload 或 SonicJS，复用所选后端的原生登录。使用 OpenNext 生产构建，由 Wrangler 的本地 workerd 提供页面与 API，连接本地 D1 和 R2。八套前端构建产物也一起放入同一个 Worker 的 Static Assets，统一入口可切换 Nuxt UI、PrimeVue、Vben、Ant Design Pro、Refine、Tabler、AdminLTE、VitePress、Payload 和 SonicJS；不依赖 5190 或其他 Worker。仓库配置只包含本地资源占位值；演示站已部署，线上资源与本地预览分开管理。

## 启动和查看

独立示例沿用官方模板的 Node.js 24.22.1+ 要求。

从仓库根目录执行：

```sh
npm run dev:payload
```

打开 **http://kit.localhost:5184/**，在顶部切换前端、右侧选择后端；`/admin` 仍可独立进入 Payload 后台。首次启动会安装示例自己的依赖、生成本地随机密钥、应用本地迁移，缺少生产产物时自动构建所有前端与后端并合并静态资产。源码有更新时，先停止预览、运行 `npm run build:payload`，再重新启动。当前演示登录为 **`admin / password`**。Payload 使用原生用户名登录，也支持邮箱；SonicJS 在本地登录表单中将 `admin` 别名映射到演示邮箱，由原生认证校验密码。首次空库的 Payload 仍显示原生创建用户页，测试使用 `.env` 的用户名、邮箱与密码创建。

`app/.env` 与 `app/.dev.vars` 被 Git 忽略；启动脚本不会输出其中的密码和密钥。这些凭据仅用于演示；创建自己的项目时应设置独立账号和密码。

```sh
# 先停止正在运行的 Payload 示例，再重新构建和做部署预检
npm run build:payload
# 保持 workerd 预览运行，验证原生登录、角色/来源校验、D1 CRUD、R2、定时入口和手机布局
npm run test:payload
# 8 × 2 组合、原生会话、持久任务、真实自动 Alarm、手机切换
npm run test:composition
# 同一 Worker 的十个界面、内嵌登录、跨界面 Cookie/D1、手机切换
npm run test:unified-worker
# SonicJS 原生登录/新建/编辑/发布/持久化、R2 字节校验、切换与手机
npm run test:sonic
# 在同一 workerd 地址检查八套界面的任务、媒体、组件、路由与刷新
WORKERKIT_SUITE_URL=http://kit.localhost:5184 npm run test:ui-suite
```

构建会运行八套 UI 的独立构建、绑定类型生成、Payload 类型生成、Next.js 类型检查、OpenNext 打包、合并资产及 Wrangler dry-run。构建命令不会执行真实部署或更改 Workers 套餐。

## 包含什么

- `/admin` 和 `/admin/workerkit` 是统一运行台，沿用 Payload 的导航、主题、用户菜单与组件；Users、Media、Notes 保留原生 CRUD 表单。
- Hono `/api/workerkit/*` 直接导入仓库的 `server`、`modules`、`runtime` 能力；浏览器使用公共 `client`，不另造一套登录。
- 管理员可读写内容、运行检查；只读账号只能查看。原生 Payload REST 和 Hono 两边都在服务端限制权限，Local API 显式 `overrideAccess: false`。
- Payload 第一个原生注册账号成为管理员；已有试点升级时，仅将最早建立的用户设为管理员。之后新建用户默认只读。
- 原生 D1/R2 检查、手动执行和执行记录；`worker.ts` 包装 OpenNext 的 fetch，在同一个 Worker 上增加 scheduled 事件。未配置自动 cron，预览可通过 Wrangler 本地 `/__scheduled` 验证。
- 一个 `worker.ts`、一个 `wrangler.jsonc`、一个 `ASSETS` 目录。Payload 和 SonicJS 分别绑定自己的 D1/R2，SonicJS 另有 KV；不依赖 Service Binding，不要求另起预览或业务 Worker。
- `/` 是紧凑切换入口，默认 Payload；`/nuxt/`、`/prime/`、`/vben/`、`/pro/`、`/refine/`、`/tabler/`、`/adminlte/`、`/docs/` 均由同一个 Worker 提供，深链接可直接访问和刷新。
- 各 UI 保留原生布局、组件、构建和路由，产物合并到 Static Assets。切换后端时，前端加载在所选 CMS 的同一 origin 上，因此浏览器直接使用该 CMS 的 Cookie 和 API；两套 CMS 仍按同站点域名分流。
- Payload 在这个同源 iframe 内登录即可；同一个 Cookie 可用于八套 UI 对 `/api/workerkit/*` 的请求；SonicJS 的原生会话独立。验证会从 Nuxt 页面写入 D1、从 PrimeVue 页面读取同一条记录，并在 Payload 运行台中查看。
- **业务工作台已接通真实接口。** 八套 UI 均可连接任一后端，创建任务计划、运行、暂停、恢复并查看运行记录和依赖检查。复用原 TaskManager 与原生 Agents Scheduler，使用本 Worker 的 SQLite DO 持久化；两套后端的任务按对象名称隔离。原有组件演示页面仍保留 fixture，不冒充真实业务。内容、用户、媒体继续使用选定 CMS 的原生管理界面。
- 一张“演示记录”表：标题、草稿/发布状态、正文。通过 CollectionConfig 生成界面和真实 REST API。
- 记录的读取要求登录，写入要求管理员；测试分别使用匿名、管理员和只读上下文验证。
- 本地 D1 持久化和 R2 存储；测试下载文件后逐字节比较。
- Payload 原有的 GraphQL 路由仍在模板中，但本次没有验证其 Workers 兼容性；不把它计入已通过能力。
- 邮件发送未接入，不把忘记密码邮件作为已验证能力。

功能验证输出在被 Git 忽略的 `test-results/payload/`、`test-results/sonic/` 与 `test-results/unified-worker/`，包括桌面、手机截图与 JSON 结果。

## 免费套餐结论（2026-11-06）

- 当前预检：Worker **24329.85 KiB 未压缩**（约 23.76 MiB），gzip 5215.81 KiB；295 个静态资源文件（包含八套 UI 和文档）。静态资源不作为 Worker 代码体积相加。
- Cloudflare 自 2026-09-04 起，免费和付费计划统一为 **64 MiB 未压缩代码**上限。此示例的代码体积符合这个限制。
- 免费 Workers 的每次请求 CPU 时间仍为 **10ms**，还有每日请求及存储操作额度。本地 workerd 功能测试、HTTP 响应耗时和 dry-run 都不等于线上 CPU 配额测试。
- 因而结论是：**本地真实后端已跑通，体积符合当前免费上限；免费账户线上可用性尚未验证。** 本次没有创建远程资源、绑定付款方式或执行部署。
- 上游 README 仍以旧的 3 MB 压缩体积限制建议付费，不能直接据此断定当前必须升级。

依据：[Cloudflare 体积限制更新](https://developers.cloudflare.com/changelog/post/2026-09-04-increased-worker-size-limit/)、[当前限制](https://developers.cloudflare.com/workers/platform/limits/)、[Payload 模板说明](https://github.com/payloadcms/payload/blob/main/templates/with-cloudflare-d1/README.md)。

## 上游、版本与改动

上游 commit、来源路径、归档 SHA256 见 `upstream.json`，MIT 许可保存在 `LICENSE.md`，原说明保存在 `UPSTREAM_README.md`。

当前固定：Payload 各包 3.93.0、Next.js 16.4.5、OpenNext Cloudflare 1.20.16、Wrangler 4.152.0、React 19.3.1。使用示例目录自己的 npm lockfile 与严格 peer 检查；没有加入根 workspace 或公共依赖，避免让八套轻量预览和消费项目强制安装 Next.js/Payload。

对官方模板的最小适配：

1. 关闭远程 D1/代理绑定，使用独立本地资源名和占位数据库 ID；没有保留一键远程部署脚本。
2. 主分支模板与已发布包有差异：改用 3.93.0 支持的 `plugins: [r2Storage(...)]`，移除尚未导出的 viewport 帮助函数。
3. 显式迁移并关闭开发期自动推送 schema，补齐当前版本用户字段和 R2 `_objectkey` 字段。
4. 构建只使用一个 Next worker，避免多个本地 Miniflare 同时打开 SQLite 导致文件锁冲突。
5. 密码哈希采用 Payload 官方支持的 `auth.passwordHashIterations: 100000` 配置，适配 Workers 的 PBKDF2 上限；没有跳过密码验证。其线上 CPU 成本仍需实测。
6. 增加受认证保护的 Notes、角色权限、运行台、Hono 路由与同一 Worker 的 scheduled 入口；它们是此示例的业务代码，不是上游 fork。
7. `WORKERKIT_ORIGIN` 显式配置站点地址用于业务 API 的同源校验，避免信任客户端转发头。默认只接受 `http://kit.localhost:5184`；换端口或部署到域名前必须同步修改 Wrangler 变量。

这里只接入基础运维和内容管理，未迁移全部 TaskManager 功能，也未批量修改其他消费 worker-kit 的项目。

统一部署使用 Cloudflare 官方 `ASSETS.fetch()` 和选择性 `run_worker_first` 路由。`html_handling: none` 避免内部请求 `index.html` 发生规范化重定向；每个 SPA 仅回退自己的入口，文档路由查找自己的 HTML。缺失 JS/CSS/媒体保持 404，Cloudflare Static Assets 本身不处理 Range；示例视频和音频通过原生 Cache API 分段读取，以适配拖动播放。只对公开的构建媒体启用，合并脚本限制每个媒体文件不超过 2 MiB，读取时也有相同上限；真实用户文件继续使用 Payload/R2。缓存键带资产 ETag，升级资源不会命中旧版本。打包脚本只复制已知的八个构建目录，不复制 `.env`、源代码或本地 D1/R2 状态。

`assemble-frontends.mjs` 是部署组合代码；各 UI 和 Payload 的升级、版本固定及依赖安装机制保持独立，合并后只需部署这一个 Worker。

升级时统一升级 Payload 各包，核对 Next/OpenNext peer 范围，重新生成类型和迁移，然后重复 production build、workerd 登录/角色权限/CRUD/R2/定时事件检查。没有修改依赖包源码或维护上游 fork。

媒体兼容依据：[Static Assets Range 限制](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/#range-requests)、[原生 Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)。

## SonicJS 接入与路由

当前固定 `@sonicjs-cms/core@3.0.0`，MIT 许可见 `SONICJS_LICENSE.md`，通过本示例自己的 npm 依赖和 lockfile 接入，没有增加 Git submodule、修改 npm 包源码或重写原生后台。

- 统一入口：`http://kit.localhost:5184/`，顶部 `Payload` / `SonicJS` 切换。
- Payload 和八套 UI：`kit.localhost:5184`。
- SonicJS：`sonic.kit.localhost:5184`，原生 `/admin`、`/auth`、`/api`、`/files` 路由保持不变。
- 两个域名都由**同一个 Wrangler/workerd 进程、同一端口、同一 Worker 入口**处理，按请求 origin 分流，没有代理到另一个 Worker 或预览服务器。
- 使用同站点的 localhost 域名，保证浏览器在内嵌页面中可正常使用原生登录 Cookie；未使用全局 CMS 切换 Cookie，多个浏览器标签可独立对比两套后台。
- 原生 SonicJS 的 SAMEORIGIN 限制由 Worker 响应适配为只允许统一入口 origin 嵌入的 CSP `frame-ancestors`。所有 SonicJS 写请求额外要求准确的同源 Origin；它的原生认证、RBAC 和 CSRF 仍保留。
- 两套 CMS 的用户、会话、数据和文件相互独立。初次 SonicJS 本地初始化使用 `.env` 中相同的预览邮箱和密码，之后修改任一 CMS 的密码不会同步到另一套。
- SonicJS 的七个 SQL 迁移通过官方 Wrangler D1 migrations 仅在本地应用；空库首次通过原生 Better Auth 哈希与 SonicJS RBAC SDK 创建管理员，没有免登录入口。已有用户不重置。
- 已注册 `workerkit_notes`（演示记录），可比较标题、正文和原生发布状态。两套 CMS 之间不会自动同步记录；它们不是共用数据库的不同皮肤。
- 邮件未配置，使用显式的不可发送 provider，不把重置链接或邮件正文写到控制台。没有调用付费 AI、邮件或图像服务。

构建仍使用 `npm run build:payload`，预览仍使用 `npm run dev:payload`。部署这套双 CMS 对比时，需要在独立部署配置中把 `WORKERKIT_ORIGIN` 和 `SONIC_ORIGIN` 改为同站点的两个域名，两个域名都路由到同一个 Worker；演示站的真实域名与绑定放在被 Git 忽略的部署配置内，不写入仓库 Wrangler 配置。

SonicJS 插件自带的 cron 尚未接入 Worker 的 scheduled 分发；当前定时入口仍只执行 WorkerKit 运行检查。邮件、AI、OAuth、图像优化和 GraphQL 等扩展没有计入本次通过能力。

### 对比时的已知边界

SonicJS 3.0.0 原生仪表盘卡片的趋势百分比（12.5、8.2、15.3、2.4）是模板常量，不是从本地数据库计算的时间序列。接入保留原生界面用于对比，未将这些趋势当作真实监控能力。本次已通过的是原生登录、内容新建/编辑/发布/重载、媒体界面与 R2 字节一致性、两套独立会话、手机与桌面切换。

## 本地演示凭据

- 用户名：`admin`；密码：`password`。签名密钥仍独立随机生成，没有免登录或密码跳过。
- Payload 的 `loginWithUsername` 使用原生能力；迁移只新增可空的唯一用户名字段，原有邮箱登录与数据保留。运行台优先显示用户名。
- SonicJS 3.0.0 原生登录仅接受邮箱，因此在 localhost 或显式启用 `WORKERKIT_DEMO=1` 的演示站中给该演示账号提供 `admin` 别名，并用 HTMLRewriter 调整登录输入框和提示。账户资料仍保存真实演示邮箱；其他账号保留邮箱登录。
- 两套登录页只在 localhost 或显式启用 `WORKERKIT_DEMO=1` 时展示演示提示和 SonicJS 用户名别名。业务部署应关闭演示标记并创建自己的账号密码。
- 已有本地实例需要重新设置演示凭据时，先停止预览，再运行 `npm run demo:credentials`。该命令通过 Payload Local API 和 SonicJS 原生密码哈希更新指定的演示管理员，并清理其会话；不改其他用户、内容或文件。普通启动不会重置已有密码。

创建仅包含选定前端和后端的业务项目、源码升级与旧入口退役流程，见 [开发底座](../../docs/application-starter.md)。

## 已部署的预览

[WorkerKit 演示站](https://kit.pzd17.top) 与 [SonicJS 入口](https://kit-sonic.pzd17.top) 指向同一个 Worker。线上演示通过显式标记启用 `admin / password`，仍执行原生密码和会话校验。生产 Wrangler 配置、资源 ID 与密钥不进入仓库；本地启动命令不修改线上数据。
