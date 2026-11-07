# 快速了解

WorkerKit 为 Cloudflare Workers 提供可组合的管理基础能力，支持轻量 Worker、CMS 后端及 Nuxt 全栈示例。

[先看技术地图与选型](./architecture) · [现有 Worker 接入](./migration)

## 在线查看

- [界面与 CMS 比较](/?view=nuxt&backend=payload){target="_top"}：17 套前端连接 Hono + Better Auth、Payload 或 SonicJS 的真实任务工作台。
- [轻量管理模板](/native/){target="_top"}：原生 Worker、KV 会话、配置、受限密钥、审计和 API 文档。
- [NuxtHub 全栈](/hub/){target="_top"}：Nuxt UI、Nitro API 与真实 SQL / KV / Blob / Cache SDK。

当前均由同一个展示 Worker 提供。各后端的登录、数据范围独立，演示账号为 `admin / password`。

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

轻量路线当前提供 Nuxt UI。CMS 路线可选择 `nuxt / prime / vben / pro / refine / tabler / adminlte / docs`，后端选 `payload / sonic`。正式业务只安装选择的方案，业务页面、数据迁移和部署资源属于消费项目。
