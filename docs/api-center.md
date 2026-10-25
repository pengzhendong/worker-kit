# API 中心

API 中心是正式应用模块，生产构建保留。它提供接口目录、Scalar 文档和访问令牌；开发工具目录与 Local Explorer 仍只用于可信本机调试。

演示应用的入口位于左下角用户菜单：点击头像或用户名，再选择“API 中心”。导航位置由模块的 `navigation.placement: 'user'` 声明，仍按 `api:read` 控制可见性与页面访问。

## 在消费项目复用

通用界面已提取到可选入口 `@pengzhendong/worker-kit/web/api-center`，独立 Scalar 文档使用 `@pengzhendong/worker-kit/web/scalar-reference`。普通 server/web 入口不会加载 Scalar。消费项目显式安装 `openapi-types`；使用 Scalar 时另安装 `@scalar/api-reference-react`，版本由父项目锁定。

```tsx
<ApiCenter client={api} scope={sessionScope} referenceUrl="/reference.html" />
```

应用在独立 HTML 中渲染 `<ScalarReference />`，由原生构建器产生第二个入口。默认读取 `/api/admin/openapi.json`，也可传 `specUrl`。通用组件负责列表、筛选、按操作查看、主题和会话失效；OpenAPI 路由、身份策略、Token 存储仍属于消费应用。有 Token 管理时通过 `tokenPanel` 传入业务面板；没有配置时不显示令牌页签，应用可通过 `description` 和 `documentationNote` 说明自己的认证方式。非 Vite 的 TypeScript 项目应声明 `*.css` 模块，让类型检查接受 Scalar 的样式导入；esbuild 等原生构建器实际处理 CSS。

## OpenAPI 与列表

可选入口 `@pengzhendong/worker-kit/openapi` 导出 hono-openapi 的原生 describeRoute、openAPIRouteHandler、generateSpecs、resolver 和 validator。仅使用 server 不会导入 OpenAPI 或 Scalar。消费项目显式声明 hono-openapi peer，示例固定 1.5.0。

示例在自己的 `server/api-description.ts` 描述 27 个操作的参数、请求体、成功响应、错误结构、认证方式及所需权限；通过原生 Hono middleware 附加描述，不引入业务路由 DSL。列表从受保护的 `/api/admin/openapi.json` 派生，搜索、方法筛选、模块分组和文档共用这一份结果。停用模块的操作不进入文档。路由仍需显式挂认证和权限，OpenAPI 的 security 字段本身不执行鉴权。

资源、设置、批量操作、API Key 创建及日志清理已经共用 Zod Schema，运行校验和 OpenAPI 的字段范围由同一个对象产生；资源与设置的响应也从这些字段派生。登录、文件及分页仍使用原有共享校验器。接口测试比较完整方法/路径覆盖，并检查真实请求和响应、错误码、鉴权顺序与文档边界。详见 [接口 Schema 与契约检查](api-schemas.md)。

接口列表中的“查看文档”展示同一份文档中选定的操作，可返回全部文档。Scalar 使用固定的本地 npm 包 `@scalar/api-reference-react` 0.9.82，通过独立 HTML 入口加载，隔离 URL hash、CSS 与滚动；父页保持原有固定侧栏和顶栏。单独打开文档页面只加载壳，API 数据仍需登录和 `api:read`。

Scalar 跟随明暗主题，使用中文界面；关闭遥测、默认外部字体、Agent、持久认证和开发者工具。隐藏会上传文档的 SDK 推广入口，仍保留本地代码示例与下载功能。隐藏规则使用当前固定版本的 `.selected-client-action` / `.generate-sdk-button` 类，升级时由 UI 断言检查，不能假设第三方类名永久稳定。

在线调试通过 customFetch 限制同源并拒绝 HTTP 重定向，不使用外部代理。Bearer 请求不携带 Cookie，Cookie 请求会保留同源凭据；401 仅在 Cookie 请求中通知父页面失效，父页核对消息来源、origin 与会话版本。离开文档会销毁 iframe 和临时认证状态。发送写请求会修改当前应用数据，不会自动重试。浏览器中已实际验证 `/health` 只读调用。

## 令牌接口与权限

| 接口 | 必需权限 | 身份与作用 |
| --- | --- | --- |
| GET `/api/admin/openapi.json` | `api:read` | Cookie；查看文档 |
| GET `/api/admin/api-keys` | `api:tokens` | Cookie；分页查看当前用户的元数据和可签发权限 |
| POST `/api/admin/api-keys` | `api:issue` | Cookie + 同源 Origin；创建令牌 |
| DELETE `/api/admin/api-keys/:id` | `api:revoke` | Cookie + 同源 Origin；撤销自己的令牌 |

创建接收 `{ name, permissions, expiresInDays }`，名称最多 80 字符、至少一个业务权限、有效期为 1–365 整数天。返回 `{ token, key }`，完整 token 只在此响应返回，关闭界面后不能重新查看。API 中心 UI 的令牌页另要求 `api:tokens`；创建和撤销按钮分别按对应权限显示。

共享 `createApiKeys({ store, now? })` 使用 Web Crypto 生成 256 位随机 opaque key，固定 `wk_` 前缀，存储 SHA-256 摘要；不使用长期 JWT。`ApiKeyInfo` 是不包含 secret/hash 的公共契约，接口通过明确字段投影返回元数据。不同应用各自使用自己的存储，没有跨应用通用的框架令牌。

D1 adapter 和 `0002_api_keys.sql` 属于示例应用；共享服务只依赖 insert/findByHash/touch 存储接口，消费项目可以替换。创建与撤销连同审计记录使用 D1 batch；列表和授权读取通过 `withSession('first-primary')` 走主库，每次请求复查撤销和到期状态，不用 KV 缓存授权。撤销不回滚已经通过鉴权的在途请求。较新请求会被拒绝；最近使用时间最多每分钟更新一次，更新时间失败只记录脱敏事件，不改变已经完成的业务结果。

Token 只在显式标记的业务接口生效：资源、文件、设置、操作日志读取、受限概览与权限快照。诊断、审计清理、API 中心与令牌管理要求 Cookie。接口中出现 Authorization 时明确选择令牌认证，无效令牌不会回退到 Cookie。

有效授权为 **令牌权限 ∩ 签发者当前授权 ∩ 当前启用模块操作 ∩ 允许 Token 的业务权限**。不会设置 adminUser 或授予管理员会话；签发者降权、身份撤销或模块停用后旧令牌不能保持原有权限。Token 业务写操作的审计 actor 为 `token:<id>`，日志不含完整令牌或摘要。

线上要求 HTTPS，本机回环 HTTP 可预览。示例使用独立 API_KEY_RATE_LIMITER，每个 key 每分钟 120 次；这是 Cloudflare 各节点的限流，不是全局精确配额。绑定缺失时拒绝访问。默认不开放跨域 CORS，由消费应用选择可信 Origin。没有自动重试写入、自动续期、全局计费或 OAuth 授权服务器。

管理员密码或会话密钥轮换只影响 Cookie；API Key 独立存在，需要单独撤销。管理员用户名变化会使原 owner 的 key 失效。要轮换脚本令牌，应先创建新 key、更新调用方，再撤销旧 key。

## 消费项目升级

1. 前端 API 中心页面、API 描述、D1 adapter 和迁移文件由应用显式接入；共享库不会扫描旧路由并自动开放 Token。
2. 使用 OpenAPI 入口时在父项目声明 hono-openapi；使用示例文档页面时声明 Scalar React 包。版本由父项目 lockfile 固定。
3. 把 reference.html 注册为 **client environment** 的额外 Vite HTML 入口；不能把 HTML input 应用到 Worker environment。参考示例 vite.config.ts。
4. 配置独立 API_KEY_RATE_LIMITER namespace，应用自己的 D1 迁移，并更新 workerkit.check.json。
5. 运行 doctor、check 和正常 UI 比较，再审核 submodule 指针。远程迁移与部署由业务应用显式执行。

本次仅对当前 dashboard 的本地 D1 应用了新增表迁移，原有资源、文件、设置没有迁移或替换；没有应用远程迁移或部署。

## 来源

- [hono-openapi](https://honohub.dev/docs/openapi)：实际复用原生路由描述与 OpenAPI 生成。
- [Scalar](https://github.com/scalar/scalar)：实际复用文档和请求客户端，不重写文档浏览器。
- [Better Auth API Key](https://better-auth.com/docs/plugins/api-key/reference)：借鉴摘要存储、权限、有效期及生命周期设计，没有引入其用户/会话系统。
- [D1 read replication](https://developers.cloudflare.com/d1/best-practices/read-replication/)：授权读取使用 primary session，避免撤销状态依赖副本同步。

开发工具链的兼容安全补丁固定在根 package.json 的 overrides 中。父项目 npm 不会继承 submodule 内的 overrides；沿用本例工具版本时同步父项目的固定补丁和 lockfile，详见[功能回顾](feature-review.md)。
