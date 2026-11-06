# 技术地图与选型

WorkerKit 将界面、应用框架、业务后端和存储分开。选中一种界面，不等于已经获得数据库、权限或内容管理。

| 名称 | 所在层 | 在这里的用途 |
| --- | --- | --- |
| Vue | 前端框架 | 页面组件、状态和交互 |
| Nuxt UI | Vue 组件库 | 原生 Dashboard 侧栏、表格、表单、弹窗和主题 |
| [Dashboard Vue](https://github.com/nuxt-ui-templates/dashboard-vue) | Vue + Vite 前端模板 | Nuxt UI 官方 Dashboard 模板来源；当前示例按业务组合其原生组件 |
| Nuxt | 全栈应用框架 | Vue 页面、Nitro 服务端路由及部署产物 |
| [NuxtHub](https://hub.nuxt.com/docs/getting-started) | Nuxt 存储与缓存工具层 | D1、KV、R2、缓存 SDK；业务接口、身份和权限仍由应用组合 |
| Payload / SonicJS | CMS 与业务后端 | 原生用户、内容、媒体、权限和 API |
| WorkerKit | 可复用基础能力 | 请求与会话、配置、受限 API Key、运行检查、任务引擎和创建/升级工具 |
| Cloudflare Workers | 运行环境 | 运行服务端代码，并绑定 KV、D1、R2、Durable Objects |

## 三条可运行路线

### 轻量 Worker

**Nuxt UI → 原生 Worker / Hono → KV**

[打开轻量管理模板](/native/){target="_top"}：真实登录、运行检查、KV 设置、访问密钥、操作审计和 API 文档。不强制使用 CMS、Next.js、D1 或 R2。

适合已有接口、少量配置、同步/代理服务，以及保留原有协议的 Worker。已有任务管理器仍可按需要显式装配。

```sh
npm run create -- ../my-worker --frontend nuxt --backend native
cd ../my-worker
npm install
npm run setup
npm run dev
```

本轮轻量创建器验证 Nuxt UI；其他七套前端仍通过 Payload / SonicJS 创建器提供。不要将尚未验证的组合标成可直接使用。

### CMS 后端

**任选一套界面 → Payload 或 SonicJS → 对应 D1 / R2 / KV 与任务 DO**

[打开 CMS 界面比较](/?view=nuxt&backend=payload){target="_top"}。八套前端的业务工作台读取当前后端的真实任务、运行记录和依赖状态。内容、媒体和用户通过 CMS 原生管理界面操作；CMS 之间的数据和登录互相独立。

适合需要用户、编辑发布、内容类型、媒体和角色权限的应用。Payload 自带管理界面基于 React，不能把 Vue 模板直接当皮肤覆盖；Vue 界面通过 API 使用后端能力。

### Nuxt 全栈

**Nuxt + Nuxt UI → Nitro API + NuxtHub → D1 / KV / R2 / Cache**

[打开 NuxtHub 全栈示例](/hub/){target="_top"}：实际使用 SQL、KV、Blob 与缓存 SDK；业务管理登录复用 WorkerKit 的 KV 会话。它不冒充 CMS，也不放入八套界面的 CMS 下拉选项。

业务代码在 `examples/nuxthub-dashboard/app`。这条路线采用完整 Nuxt，不能通过给 Vue + Vite 安装一个 UI 插件来完成迁移。NuxtHub 的旧托管 Admin 已弃用；本例由自己的 Wrangler 和 Cloudflare 账户部署。

## 怎么选

| 你的需求 | 起点 |
| --- | --- |
| 已有 Worker，主要需要管理配置与接口 | 轻量 Worker 模板，保留原有绑定与业务协议 |
| 需要内容、用户、媒体与权限模型 | Nuxt UI / Vben 等前端 + Payload 或 SonicJS |
| 新应用，决定统一使用 Nuxt 全栈 | Nuxt UI + NuxtHub 示例 |
| 主要是指南和知识内容 | VitePress，必要时嵌入轻量交互 |

界面选择按实际交互和维护成本评估；star 数、示例图表和侧栏项目不能证明服务端能力。

## 一个 Worker 与数据边界

展示站将这些构建产物组合进同一个 Worker。Payload、SonicJS、轻量模板和 NuxtHub 使用各自的会话命名空间与存储范围。正式业务项目只打包所选路线，不需要部署整套比较站。

演示账户为 `admin / password`。各路线需要分别登录，切换前端可以复用同一 CMS 的身份，切换后端不会冒用另一套身份。所有写操作会修改当前示例的真实存储。

[功能与验证边界](./features) · [现有 Worker 接入](./migration) · [升级维护](./upgrades)
