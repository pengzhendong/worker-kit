# 快速了解

WorkerKit 为 Cloudflare Workers 提供可组合的管理基础能力，支持 Hono 后端、CMS 后端及 Nuxt 全栈示例。

[先看技术地图与选型](./architecture) · [现有 Worker 接入](./migration)

## 在线查看

- [框架演示](/){target="_top"}：首页提供组件库、后台模板、文档和后端方案比较。
- [ProLayout 后台](/pro-layout/){target="_top"}与 [AdminShell 后台](/compat/){target="_top"}：同一组业务页面、会话、API 与数据，两种管理布局。后端分类可体验 Hono + Better Auth、Payload、SonicJS 等服务端方案。
- 单管理员模板使用 Nuxt UI 和 Hono，KV 保存会话与配置，另带受限密钥、审计和 API 文档。[Hono + KV 登录](/native/){target="_top"}
- [NuxtHub 全栈](/hub/){target="_top"}：Nuxt UI、Nitro API 与真实 SQL / KV / Blob / Cache SDK。

当前均由同一个展示 Worker 提供。后端示例按方案配置会话与数据范围，线上演示账号为 `admin / password`。

## 本地运行

```sh
npm ci
npm run dev
```

统一展示站打开 `http://kit.localhost:5184/`。第一次需要构建各方案及独立后端依赖；具体命令与版本要求见仓库 README。

只比较前端交互，可用 `npm run demo` 打开独立静态预览。静态预览里的组件体验使用 fixture；它与统一 Worker 中的真实业务工作台是不同验证范围。

## 创建自己的应用

```sh
npm run create -- ../my-worker --frontend nuxt --backend native
```

Hono + KV 登录模板使用 Nuxt UI。CMS 路线可选择 `nuxt / primevue / sakai / vben / pro / refine / tabler / adminlte / docs`，后端选 `payload / sonic`。正式业务只安装选择的方案，业务页面、数据迁移和部署资源属于消费项目。
