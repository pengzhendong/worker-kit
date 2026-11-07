# 全栈框架与原生服务端验证

这里的“全栈”意味着页面框架真的在 Worker 中执行服务端逻辑。前端组件库不会因为提供按钮和侧栏就自动成为后端。

| 路线 | 页面与服务端 | 管理能力 | 入口 |
| --- | --- | --- | --- |
| Nuxt / Nitro / NuxtHub | 完整 Nuxt，Nitro API，Drizzle/D1、KV、Blob/R2、Cache | 完整工作台，当前保留既有 KV 管理员认证 | [打开](/hub/){target="_top"} |
| Next.js / OpenNext / Payload | Next App Router 与原生 Payload API | 用户、内容、媒体、角色，及公共管理工作台 | [打开](/admin/){target="_top"} |
| SvelteKit | 官方 adapter-cloudflare，Svelte 服务端 load / API / 客户端交互 | 原生验证页 + 共用 Better Auth 管理入口 | [打开](/sveltekit/){target="_top"} |
| Astro | 官方 Cloudflare adapter，Astro SSR 页面 / API / 浏览器脚本 | 原生验证页 + 共用 Better Auth 管理入口 | [打开](/astro/){target="_top"} |
| React Router | 原生 Loader、资源路由、SSR / hydration、RouterContextProvider | 原生验证页 + 共用 Better Auth 管理入口 | [打开](/react-router/){target="_top"} |

三套新全栈页显示服务端生成时间，登录后显示 Better Auth 用户。其框架自己的 `/api/verification` 路由读写各自命名空间的 KV；保存需要管理员、同源请求和有效输入。未登录为 401，跨来源为 403，超大请求为 413。

完整任务、配置、密钥、审计和 Scalar 接口文档位于 [Hono + Better Auth 工作台](/standard/){target="_top"}。这让框架验证页保持小而清楚，也避免在每个框架里重写密码与会话。

## 创建独立单 Worker

```sh
# 推荐的轻量管理型应用
npm run create -- ../my-worker --frontend nuxt --backend hono

# 完整 Nuxt：nuxt 是 hub 的可读别名，保留旧命令兼容
npm run create -- ../my-nuxt --frontend nuxt --backend nuxt

# 框架同时拥有自己的页面和服务端，成对选择
npm run create -- ../my-svelte --frontend sveltekit --backend sveltekit
npm run create -- ../my-astro --frontend astro --backend astro
npm run create -- ../my-react --frontend react-router --backend react-router
```

生成目录后执行 `npm install`、`npm run setup`、`npm run dev`。本地入口是 `http://localhost:8787/`，初始管理员为 `admin / password`。setup 创建本地 Secret 和应用本地 D1 迁移，不重置已有账户，也不执行远程迁移。

框架源码在 `framework/`，原生服务端验证 API 在其路由目录。`standard.ts` 负责 Better Auth 与公共管理后端；`worker.ts` 显式装配两个处理器，仍只有一个 Worker。`framework/package-lock.json` 锁定框架依赖，`vendor/worker-kit` 只存 SDK 源码快照。

## 验证方法与升级

`npm run test:frameworks` 检查真正 SSR 的 HTML、登录身份、未登录拒绝、同源写入、大小限制、KV 保存与读取、客户端 hydration 和手机宽度。生成项目另检查全新安装、setup、类型、构建和部署 dry-run。

上游适配器产物通过模块导入与同一份 env/ctx 组合，没有跨 Worker HTTP 代理，也不会在生产链接中出现 localhost。SvelteKit 3 的配置属于 Vite 插件；React Router 8 使用原生 Context Provider；Astro 使用官方 Cloudflare 构建入口。升级时同时审核主框架、适配器、锁文件及真实浏览器检查，不能只升级 UI 包。

官方依据：[SvelteKit](https://svelte.dev/docs/kit/adapter-cloudflare) · [Astro](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) · [React Router](https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/) · [Nuxt](https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/nuxt/)。
