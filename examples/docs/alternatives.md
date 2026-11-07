# 高 star 项目调研与接入结论

本轮清单在 **2026-11-07** 核对 GitHub API、npm 实际版本、许可证、官方部署说明，并以 WorkerKit 的真实接口验证。star 是当日快照，不是能力评分；每项都有已接入或不采用的结论。

筛选范围是本轮列出的维护中 JavaScript / TypeScript UI、后台模板、全栈与后端项目，主要关注万星以上项目，同时保留已经接入的 Nuxt UI、SonicJS、Sakai 等。它不是 GitHub 所有仓库的穷举；没有因 star 更大就把需要额外服务器的系统塞进免费 Worker。原始快照见 [GitHub 数据](./research-github.json)。

## 已接入的 17 套前端

这些方案使用本地静态资产，前端库本身不消耗服务端计算配额。真实工作台连接选定后端的设置、密钥、审计、诊断、任务和 Scalar API 文档；展示站可切换，正式业务只安装其中一套。

| 项目 | GitHub star | 类型 | 本例接入与边界 | 预览 |
| --- | ---: | --- | --- | --- |
| [Nuxt UI](https://github.com/nuxt/ui) | 7,058 | 组件库 | Vue/Vite；完整 Nuxt 另选全栈路线 | [打开](/?view=nuxt&backend=standard){target="_top"} |
| [Sakai / PrimeVue](https://github.com/primefaces/primevue) | 14,450 | 模板 / 组件库 | Sakai 提供布局，PrimeVue 提供控件；不是两个后端 | [打开](/?view=prime&backend=standard){target="_top"} |
| [Element Plus](https://github.com/element-plus/element-plus) | 27,838 | 组件库 | Vue 3；原生表格、表单、Dialog | [打开](/?view=element&backend=standard){target="_top"} |
| [Naive UI](https://github.com/tusen-ai/naive-ui) | 18,601 | 组件库 | Vue 3；原生 DataTable、Tabs、Drawer | [打开](/?view=naive&backend=standard){target="_top"} |
| [shadcn-vue](https://github.com/unovue/shadcn-vue) | 10,782 | 源码组件 | 官方 registry 源码 + Reka UI；按源码差异升级 | [打开](/?view=shadcn&backend=standard){target="_top"} |
| [Vuetify](https://github.com/vuetifyjs/vuetify) | 41,030 | 组件库 | Material 风格，使用 npm 中 MIT Core | [打开](/?view=vuetify&backend=standard){target="_top"} |
| [Quasar](https://github.com/quasarframework/quasar) | 27,203 | 组件库 / 应用工具 | 本例为 Vue SPA，未冒充 SSR/PWA/移动打包 | [打开](/?view=quasar&backend=standard){target="_top"} |
| [MUI](https://github.com/mui/material-ui) | 99,296 | 组件库 | React；只用 MIT Core，不依赖付费 MUI X | [打开](/?view=mui&backend=standard){target="_top"} |
| [Mantine](https://github.com/mantinedev/mantine) | 31,918 | 组件库 | React；原生 AppShell、表单、Modal | [打开](/?view=mantine&backend=standard){target="_top"} |
| [PureAdmin](https://github.com/pure-admin/vue-pure-admin) | 20,752 | 后台模板 | 保留原生布局、主题、菜单；移除假 JWT 和无关演示 | [打开](/?view=pure&backend=standard){target="_top"} |
| [Soybean](https://github.com/soybeanjs/soybean-admin) | 15,274 | 后台模板 | 原生 Naive UI 布局，当前用户来自真实后端 | [打开](/?view=soybean&backend=standard){target="_top"} |
| [Vben Admin](https://github.com/vbenjs/vue-vben-admin) | 33,757 | 后台框架 | 原生 BasicLayout 与偏好设置 | [打开](/?view=vben&backend=standard){target="_top"} |
| [Ant Design Pro](https://github.com/ant-design/ant-design-pro) | 38,937 | 后台工程 | 本例是 ProComponents + Vite，未移植完整 Umi | [打开](/?view=pro&backend=standard){target="_top"} |
| [Refine](https://github.com/refinedev/refine) | 36,009 | 管理应用框架 | 原生数据 Provider / Hooks / Ant Design 5 | [打开](/?view=refine&backend=standard){target="_top"} |
| [Tabler](https://github.com/tabler/tabler) | 42,018 | Bootstrap 模板 | npm 样式与 Bootstrap 原生交互 | [打开](/?view=tabler&backend=standard){target="_top"} |
| [AdminLTE](https://github.com/ColorlibHQ/AdminLTE) | 45,676 | Bootstrap 模板 | npm 模板与原生 PushMenu | [打开](/?view=adminlte&backend=standard){target="_top"} |
| [VitePress](https://github.com/vuejs/vitepress) | 18,468 | 文档框架 | 指南、搜索与轻量管理工作台 | [打开](/?view=docs&backend=standard){target="_top"} |

Sakai 模板自身的 star 为 1,133，上表列的是其底层 PrimeVue 组件库，二者不能相加。Vuetify 仓库包含多种资产，表内采用的是 npm `vuetify` 的 MIT Core。所有源码型接入保留上游许可证。

## 已接入的全栈、后端和基础能力

| 项目 | GitHub star | 实际用途与验证结论 |
| --- | ---: | --- |
| [Nuxt](https://github.com/nuxt/nuxt) | 61,045 | `/hub/` 是完整 Nuxt 4 + Nitro API；页面采用 Nuxt UI，NuxtHub 负责 D1/KV/R2/Cache；管理功能齐全 |
| [Nitro](https://github.com/nitrojs/nitro) | 11,363 | Nuxt 的服务端引擎，本例使用官方 Cloudflare preset；不是另一套 UI |
| [Next.js](https://github.com/vercel/next.js) | 143,371 | 通过 OpenNext 运行 Payload 的原生管理页面和 API；没有把仅静态导出算成完整 Next 接入 |
| [SvelteKit](https://github.com/sveltejs/kit) | 20,903 | 官方 Cloudflare adapter；`/sveltekit/` 真实 SSR、Svelte API、Better Auth 身份和 KV 读写 |
| [Astro](https://github.com/withastro/astro) | 63,791 | 官方 Cloudflare adapter；`/astro/` 真实 SSR、API、会话和 KV；无需 Node 常驻进程 |
| [React Router](https://github.com/remix-run/react-router) | 56,630 | `/react-router/` 真实 Loader/SSR/资源路由，使用 v8 原生 RouterContextProvider；原 Remix 能力归入此项 |
| [Hono](https://github.com/honojs/hono) | 32,846 | `/standard/` 默认轻量业务 API；中间件、原生 Request/Response 和 Cloudflare 绑定 |
| [Better Auth](https://github.com/better-auth/better-auth) | 30,631 | 原生 D1、username/admin 插件；负责用户、密码散列、角色、Cookie、会话及撤销；公开注册关闭 |
| [Drizzle](https://github.com/drizzle-team/drizzle-orm) | 36,223 | NuxtHub 数据库示例使用 ORM / D1；它不自带用户界面，也不等于完整后端 |
| [Payload](https://github.com/payloadcms/payload) | 45,713 | 原生用户、角色、内容、媒体和 API；通过 D1 / R2；完整 CMS 路线 |
| [SonicJS](https://github.com/SonicJs-Org/sonicjs) | 1,789 | 原生 Workers CMS / D1 / R2 / KV，独立 CMS 会话，与其他模块在同一个 Worker |

全栈验证页覆盖原生服务端链路，**不是完整 CMS 的功能演示**。SvelteKit / Astro / React Router 的公共管理工作台复用 `/standard/`；其原生 API 和 KV 实验仍由对应框架处理。NuxtHub 有自己的完整管理与存储示例。

## 已评估并决定不加入本轮模板

| 项目 | star | 结论与依据 |
| --- | ---: | --- |
| [Strapi](https://github.com/strapi/strapi) | 73,439 | 不作为免费单 Worker CMS：官方安装要求 Node 服务和受支持数据库驱动，没有本例可直接使用的 D1 / Worker 原生部署链路；[官方要求](https://docs.strapi.io/cms/installation/cli) |
| [Directus](https://github.com/directus/directus) | 38,675 | 不作为此框架的默认开源后端：有商业许可条件，也采用独立服务部署；不能把“能从 Worker 调它的 API”当成已放进同一个 Worker。[自托管说明](https://directus.com/docs/self-hosting/overview) / [许可价格](https://directus.com/pricing) |
| [PocketBase](https://github.com/pocketbase/pocketbase) | 61,606 | 不接入 Worker 进程：Go 可执行文件与持久本地 SQLite 文件不是 D1 绑定；[官方部署](https://pocketbase.io/docs/going-to-production/) |
| [Supabase](https://github.com/supabase/supabase) | 114,613 | 不把完整 Supabase 塞入单 Worker：自托管包含 Postgres、Auth、Storage 等独立服务；使用其托管免费实例属于外部服务组合，与本轮单 Worker 要求不同。[官方 Docker 部署](https://supabase.com/docs/guides/self-hosting/docker) |
| [Express](https://github.com/expressjs/express) | 69,576 | 不新增一套兼容层模板：Cloudflare 的 Node HTTP 兼容可承接部分 Express 应用，不能笼统说它完全不能运行；当前采用直接使用 Fetch 和 D1/KV 绑定的 Hono，避免同时维护两套 HTTP 适配。[Node HTTP 支持](https://developers.cloudflare.com/workers/runtime-apis/nodejs/http/) |
| [Nest](https://github.com/nestjs/nest) | 76,988 | 不新增默认路线：完整依赖注入与 Node HTTP 适配并非当前轻量管理底座所需；采用已验证的 Hono / Nitro 原生组合。此为范围取舍，不声称所有 Nest 程序都不能运行 |

Vue 2 的 vue-element-admin 虽然 star 很高，本轮统一采用 Vue 3；没有为星数引入旧版 Vue/Element UI。Django、Spring、Laravel 等需要不同服务运行时的框架不属于本轮 JavaScript / TypeScript Worker 模板范围。

## 免费套餐的实际含义

- [Workers 官方限制](https://developers.cloudflare.com/workers/platform/limits/)：免费套餐普通请求 **10 ms CPU**、100,000 请求/日，Worker 代码当前限制 **64 MiB 未压缩**。旧的“免费代码上限 3 MiB”不再作为本轮依据。等待 D1 / 网络的时间不等于 CPU。
- Better Auth 的密码散列在同一个 Worker 的 **SQLite Durable Object** 中执行；它使用[免费套餐支持的 SQLite DO](https://developers.cloudflare.com/durable-objects/platform/pricing/)，遵守 DO 自己的 CPU / 请求 / 存储限额，不修改算法或绕过密码散列。
- D1、KV、R2、DO 各有自己的免费配额。KV 非强一致；读写次数不能靠“免费部署”忽略。认证会话使用 D1，管理设置、受限密钥与审计目前使用 KV。
- R2 有免费额度，但[启用 R2 需要订阅流程](https://developers.cloudflare.com/r2/get-started/)。没有启用 R2 的账户可以选择不需要 R2 的 Hono / 全栈验证模板；完整 CMS 与 NuxtHub Blob 示例需要 R2。
- 构建、dry-run、本地 workerd 通过，只证明其对应层面。线上免费 CPU、业务增长后的容量与复杂 SSR 不能靠 star 或包体积保证。比较站装入所有候选，业务项目只保留所选路线。

## 建议的默认组合

**Nuxt UI + Vue/Vite + Hono + Better Auth + D1 / KV / SQLite DO**：适合管理型 Worker，静态前端快，后端按业务组合，认证复用维护中的开源实现。

需要 Nuxt 页面路由、服务端渲染或更多 Nuxt 模块时，选择 **完整 Nuxt / Nitro + Nuxt UI**；需要内容编辑、上传和权限模型时用 **Payload**。Vben、PureAdmin、Soybean 是另一种完整后台前端起点，互为候选；不会与 Nuxt UI 同时承担同一个页面布局。

[技术地图](./architecture) · [全栈验证入口](./frameworks) · [创建与升级](./upgrades)
