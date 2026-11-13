# 可选择前后端的开发底座


WorkerKit 提供 Cloudflare 适配、任务运行和跨前端的 HTTP 契约。前端使用上游原生布局与组件；后端使用 Payload 或 SonicJS 的原生认证、内容和媒体。每个业务项目选择一套前端和一个后端，最终构建为一个 Worker，包括 SQLite Durable Object；无需另起代理 Worker。

## 创建与运行

```sh
npm run create -- ../my-worker --frontend nuxt --backend sonic
cd ../my-worker
npm install
npm run setup
npm run dev
```

默认本地地址 `http://localhost:8787/`。`setup` 安装后端自己的依赖、生成本地签名 Secret、运行本地迁移，仅在用户表为空时创建 `admin / password` 演示身份。已有账号、内容和任务不会重置。`.env`、`.dev.vars` 权限为 0600，属于本地文件，不随部署上传。线上使用自己的账号、域名、绑定与 Wrangler Secret。

创建器本身只用 Node 内置模块，不需要安装全部候选方案。`dev` 构建并启动真实 workerd 预览；修改前端或 Payload 配置后运行 `npm run build`，Wrangler 会重载生成产物。当前不是 Vite HMR 开发服务器。

| 前端参数 | 直接采用 | 业务工作台 |
| --- | --- | --- |
| `nuxt` | Nuxt UI 的 Dashboard 布局、表单与卡片 | 真实接口 |
| `prime` | PrimeVue / Sakai 布局及控件 | 真实接口 |
| `vben` | 固定上游源码的 Vben BasicLayout 与 Ant Design Vue | 真实接口；需 pnpm |
| `pro` | ProComponents ProLayout / PageContainer 与 Ant Design | 真实接口；不是完整 Umi 项目 |
| `refine` | Refine Core / Ant Design 布局 | 真实接口 |
| `tabler` | Tabler / Bootstrap 布局与控件 | 真实接口 |
| `adminlte` | AdminLTE / Bootstrap 布局与控件 | 真实接口 |
| `docs` | VitePress 默认主题中的 Vue 页面 | 真实接口；用于文档与轻量交互 |

CMS 后端参数为 `payload` 或 `sonic`。生成时只写入选中后端的依赖与 D1/R2 配置。SonicJS 还使用自己的 KV。没有要求每个业务项目安装两套 CMS，也没有把 CMS 变成共享库的强制依赖。

这是创建时的技术选型。后端不同意味着身份、集合和数据模型不同，改一个 JSON 字段不能替代数据迁移。

## 在哪里开发业务

```text
my-worker/
  web/                        自己的前端与原生布局
  shared/operations.js        共用 API 客户端，供前端组件调用
  server/
    worker.ts                 唯一 Worker 入口
    wrangler.jsonc            自己的绑定、资产与 DO 迁移
    src/business/tasks.ts     自己的任务定义
    src/collections/          Payload 原生集合与权限（若选中）
    src/workerkit/            所选后端的原生身份与运行接口组合
  vendor/worker-kit/src/       共享基础逻辑快照
  workerkit.json              创建时选中的前端与后端
```

增加任务：在 `taskDefinitions` 中添加普通 `TaskDefinition`；外部任务继续复用 `githubTask` / `workerTask`。调度使用 `agents/schedules` 与 `Lifecycle`，通过原来的 `SchedulePort` 接入 TaskManager；没有重新实现 Cron 或 Alarm 引擎。任务进度、状态、运行日志和去重继续由原来的任务管理器负责，记录保存在本 Worker 的 SQLite Durable Object。不同后端使用不同对象名称隔离。

后端标识由服务端在内部请求中固定并持久化到对象自己的上下文表，不依赖请求 Cookie 或对象名称在 Alarm 唤醒时是否可用。再次绑定到其他后端会拒绝请求；身份 Cookie 和客户端自带的后端选择 Header 不会透传给任务对象。

增加内容：使用所选 CMS 的原生 Collection 配置、字段校验和访问控制。普通内容与媒体管理通过 `/admin` 进入原生界面，未给八套前端重复造完整 CMS 编辑器。

增加业务接口：使用普通 Hono 路由或 CMS 原生 API。以当前后端验证过的身份执行服务器权限检查；Payload Local API 必须传入 `user` 与 `overrideAccess: false`。SonicJS 的运行台使用原生 Better Auth 会话，读取当前用户有效状态与 RBAC；不会把 API Key 的用户身份直接当成无限权限会话。

运行接口为 `/api/workerkit/workspace` 与 `/api/workerkit/managed-tasks`，操作后缀为 `run / preview / edit / pause / resume`。写操作要求同源、管理权限和限量请求体；SonicJS 还沿用原生 CSRF Cookie/Header。浏览器 API 与会话原语已移到 `src/client`，不依赖 React/Vue；原 `src/web/api`、`src/web/session` 仅保留兼容转发。

当前工作台可创建间隔计划、运行、暂停、恢复，并查看最近 50 次记录与安全的任务输出。Cron、时区、更多输入与外部执行能力仍在底层任务管理器中；可按实际任务扩展原生表单。任务日志不等于完整 HTTP 日志检索，HTTP 请求日志继续使用 Cloudflare Observability。任务输入不用于保存 Secret，执行器应从绑定读取凭据。

## 升级方式

现有消费项目继续使用 Git submodule。本地创建器当前采用逐文件 SHA-256 的**共享源码快照**：只包含所需的共享基础源码，不复制旧 React UI 或 Vite 适配入口；业务前端使用选定框架。`vendor/worker-kit/source.json` 记录来源 commit、dirty 状态、实际文件摘要。

```sh
npm run kit:sync -- --source /path/to/reviewed/worker-kit
npm install
npm run check
```

同步先核对 vendor 全部文件摘要，有本地修改就拒绝覆盖；完整准备新副本后替换，并保留旧副本。它不改 `web/`、`server/`、业务迁移、lockfile 或 Secret。前端、后端 npm 依赖分别由 lockfile 固定；修改 npm 版本与原生模板时，审核上游变更并执行真实页面回归。Vben 的源码仍按 commit 与压缩包 SHA 固定；Payload、SonicJS 依赖正式 npm 包，不 fork CMS 引擎。

快照同步只升级共享基础代码，不声称自动迁移已经定制过的前端与 CMS 模板。需要沿用 submodule 时，可以按现有仓库约定把 vendor 改为审核过的固定 commit，业务源码位置和普通导入方式保持一致。

## 旧实现退役

现有 Worker 的引用清点、认证与数据保留、逐项目重新接入及兼容入口退役顺序见[消费项目迁移](consumer-migration.md)。创建器不复制旧 React UI、演示 fixture 或公开测试媒体；只保留真实工作台客户端。演示用图表与路由适配依赖按生成页面的实际使用情况移除；Vben 的固定上游锁与依赖声明保持配套。

新项目不再使用旧 Ant Design 6 AdminShell、旧单管理员登录和 fixture 业务页面。旧项目仍有引用，所以本轮保留兼容导出；后续逐个迁移并通过认证、任务、存储和页面检查后，删除旧页面、兼容转发及不再引用的依赖。不要为了换外观丢掉任务执行、访问密钥的权限边界或私有文件访问规则。

0.4.0 的四条路线已对齐声明式 KV 设置、受限 API Key、管理操作审计、任务与运行检查；CMS 工作台复用原生身份与角色，不把 API Key 视为管理员会话。普通内容、媒体与用户继续使用 CMS 原生实现。

## 验证

仓库使用 `npm run check` 检查共享逻辑；`npm run test:composition` 验证 8 × 2 个真实页面组合、原生登录、持久任务、运行日志、同源保护和手机切换；`npm run test:payload`、`npm run test:sonic` 验证原生 CMS 能力。创建器测试覆盖 16 种输出、依赖与资源隔离、拒绝覆盖和升级保护。

`npm run test:frontend-login` 另外逐个检查 16 种未登录入口，确保能进入所选后端的原生登录页并保留返回路径。Nuxt UI 使用外部导航属性；VitePress 链接显式设置 `target="_self"`，避免文档路由拦截 CMS 导航。

生成项目的 `npm run check` 生成绑定类型、检查服务端类型、构建选定前端与后端并执行 Wrangler dry-run。dry-run 和本地 workerd 不能证明线上免费套餐 CPU 配额满足要求，线上性能仍需部署后实测。

2026-11-06 验证：共享检查通过 94 个 workerd 测试和 11 个工具测试；八套生成前端完成独立构建；Nuxt UI + SonicJS、Tabler + Payload 完成独立目录安装、构建、dry-run 和浏览器原生登录、任务创建/运行/持久化、手机检查。统一预览验证了 16 种组合及真实自动 Alarm。旧 Ant Design 入口保留兼容；其界面检查与八套新界面的真实工作台检查分别执行，组件演示夹具不计入真实后台业务。

## 已部署的展示站

展示入口为 https://kit.pzd17.top ，SonicJS 使用 https://kit-sonic.pzd17.top 。两者指向同一个 `worker-kit` Worker，使用独立新建的 D1、R2 与 KV，不复用其他项目的数据。框架演示中的 CMS 账号沿用 `admin / password`；通过显式 `WORKERKIT_DEMO=1` 开启演示提示与 SonicJS 用户名别名，密码和会话仍由原生认证校验。WorkerKit 的 ProLayout 和 AdminShell 演示后台共用 `DASHBOARD_ADMIN_PASSWORD` 和 `DASHBOARD_SESSION_SECRET`，部署时通过 Worker Secrets 配置。公开演示站使用 `admin / password`。

构建、生产配置和线上验收步骤见[发布展示站](../examples/docs/upgrades.md#发布展示站)。

本次线上验证通过原生登录、16 种工作台组合、文档预览入口、无 localhost 导航、Vben 工作台正文边距，以及两套后端的任务创建、执行和记录持久化。任务日志默认显示最近 5 条，历史记录继续保留。


## 轻量路线与 Nuxt 全栈（0.4.0）

`--frontend nuxt --backend native` 创建 CMS-free 项目，根目录有 `worker.ts`、`wrangler.jsonc`、`web/` 与 vendor 快照。一个父项目 lockfile，保留业务和部署所有权，默认使用 KV、登录限流与 SQLite 任务 DO；配置、密钥和审计使用命名空间，不开放任意 KV 浏览。已有凭据不被 setup 重置。其他前端目前仍使用上面的 CMS 创建器，轻量路线不声称覆盖全部八套界面。

NuxtHub 示例在 `examples/nuxthub-dashboard/app`，也可通过 `--frontend nuxt --backend hub` 创建独立项目；作为完整 Nuxt + Nitro 构建，由统一 Worker 的 `/hub/` 分流；不是 CMS 后端的一键替换项。发布前通过独立依赖安装、构建、Nuxt 类型检查、workerd 存储和身份检查。公共 `/native` 和 `/vue` SDK 由消费应用显式导入，未把 Vue、CMS 或 NuxtHub 加入所有服务端入口。

统一站顶部“开发方案”进入技术地图、轻量模板或 NuxtHub。线上文档区分真实业务工作台与 fixture 组件体验，并补充接入和升级指南。

## 自动验收与回滚

`npm run test:integration` 在空闲 5184 端口启动真实本地统一 Worker，依次验证组合、切换、预加载、布局、NuxtHub 存储和四条路线的管理能力。`npm run test:generated` 从临时目录验证新项目、重复 setup、SDK 升级与回滚；CI 自动运行。

CI 使用全新的本地数据库，构建后显式执行 `npm run demo:credentials`，通过 Payload Local API 和 SonicJS 原生哈希建立演示身份。首次本地运行综合验收也需先完成原生首次注册，或显式执行这条命令；它会重置本地指定演示管理员的密码与会话，不用于生产部署，普通 build 不自动重置已有账号。

快照回滚使用 `npm run kit:rollback -- --backup worker-kit.previous-TIMESTAMP`，当前 SDK 和备份的所有文件都会先验摘要，有本地变更则拒绝覆盖。恢复后重新安装依赖并执行 check。submodule 消费项目通过 Git 恢复审核提交；数据库迁移不由这两个流程自动撤销。
