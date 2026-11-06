# NuxtHub 全栈示例

固定 Nuxt 4.6.4、Nuxt UI 4.12.0、NuxtHub 0.10.12。NuxtHub 0.10.12 的 package.json 声明 Apache-2.0，但同一发布包附带的 LICENSE 为 MIT（Vercel, Inc.）。两处上游标识不一致；本例保留原始 LICENSE.nuxthub 文件，分别记录声明，不将网站页脚或任一标识当成已消除歧义的结论。

实际使用 NuxtHub SQL / KV / Blob SDK 和 Nitro 缓存，在同一个 Worker 的 `/hub/` 提供完整 Nuxt 页面和服务端 API。身份验证复用 WorkerKit 的 KV 会话和限流，没有免登录开关。SQL、KV 标签和 Blob 是示例业务，不复制 CMS 引擎。客户端不包含存储凭据，业务 API 要求会话和同源写请求。

依赖与 package-lock 独立保存在 app。`npm run build:hub` 构建；通过 `npm run dev:payload` 在统一 Worker 中启动并验证真实绑定。独立 `nuxt dev` 的本地默认存储不是统一 Worker 的验收依据。D1 migration 必须单独应用，构建和部署不会代替迁移。

NuxtHub 是独立全栈路线，不伪装成八套前端都可替换的 CMS。旧 NuxtHub Admin 不在接入范围。升级时同时核对 Nuxt / Nitro / NuxtHub / Nuxt UI，运行真实 workerd 认证、D1/KV/R2 写读、缓存、浏览器及与已有 CMS 的组合检查。
