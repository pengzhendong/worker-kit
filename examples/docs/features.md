# 功能与验证边界

## 公共管理功能（0.5.0）

| 功能 | Payload + 18 套界面 | SonicJS + 18 套界面 | Hono + KV 登录 | NuxtHub |
| --- | --- | --- | --- | --- |
| 登录与权限 | Payload 原生身份与角色 | SonicJS 原生会话与 RBAC | WorkerKit KV 管理员会话 | WorkerKit KV 管理员会话 |
| 运行状态与依赖检查 | 已接入 | 已接入 | 已接入 | 已接入 |
| 声明的非敏感 KV 设置 | 已接入 | 已接入 | 已接入 | 已接入 |
| 访问密钥签发、一次展示、撤销 | 已接入 | 已接入 | 已接入 | 已接入 |
| 管理操作审计与游标分页 | 已接入 | 已接入 | 已接入 | 已接入 |
| 任务创建、执行、暂停、恢复与运行记录 | 已接入 | 已接入 | 已接入 | 已接入 |
| 同源交互式 API 文档 | 已接入 | 已接入 | 已接入 | 已接入 |
| 原生用户、内容与媒体管理 | Payload 原生页面 | SonicJS 原生页面 | 由应用扩展 | 由应用扩展 |

18 套 CMS 界面的「业务工作台」都有相同的管理入口，操作使用当前后端的真实接口。Hono + KV 登录按功能分页。NuxtHub 的「全栈工作台」提供同一组管理能力，「存储示例」另行演示真实 D1 / KV / R2 / Cache SDK。

功能相同不代表权限相同。界面按服务端返回的权限显示入口，服务器独立检查每个请求。只读用户不能读取密钥、审计和配置，也不能执行任务写操作。访问密钥仅授予 `runtime:read`，不能用来登录管理员、修改配置或操作任务。

## 存储和数据边界

四条路线使用独立命名空间与任务对象。它们可以部署在同一个 Worker 中，登录、设置、密钥、审计和任务不会互相冒用。公共管理逻辑复用 SDK，身份仍由各自原生后端负责。

配置只包含应用声明的字段。新增字段会补上默认值；移除字段不会继续从旧 KV 记录返回。密码与业务 Secret 使用 Workers Secrets。

KV 为最终一致存储，注销、撤销和配置的跨节点同步可能短暂延迟。审计保留 30 天，只记录动作、对象标识、操作人和时间，采用尽力写入；不记录配置值、密码或完整令牌。任务运行记录独立保存在 SQLite Durable Object，日志默认展示最近 5 条。它们都不是完整的 HTTP 日志检索服务。

默认任务界面提供间隔计划。Cron、时区和更多输入可按应用需要使用既有任务引擎扩展。平台流量、CPU 等指标缺少 Cloudflare 授权时明确显示未配置，不用零代替。

## 新增的默认管理路线

Hono + Better Auth 使用原生 D1 用户与会话、username/admin 插件、SQLite DO 密码运算、KV 管理设置和独立任务 DO。它提供相同的诊断、设置、密钥、审计、任务、运行记录和 Scalar API 文档，公开注册关闭。Better Auth 的用户/角色管理由原生 Admin API 提供，当前没有另写一套用户管理界面。公开比较站保护共享演示账户，仅开放登录、会话与退出；生成的业务项目保留原生 Admin API。

三套新全栈原生验证页与完整工作台的区别见[全栈框架](./frameworks)。全栈页证明 SSR、框架 API、登录身份与 KV；完整管理入口复用 /standard/。

## 创建支持矩阵

- `--backend payload` 或 `--backend sonic`：支持 18 套前端。
- `--frontend nuxt --backend hono`：默认 Nuxt UI + Hono + Better Auth，D1/KV/SQLite DO，无 R2 必选项。
- `--frontend sveltekit --backend sveltekit`、`astro / astro`、`react-router / react-router`：框架原生页面和 API + Better Auth + Nuxt UI 管理入口，同一个 Worker。
- `--frontend nuxt --backend native` 创建 Nuxt UI + Hono + KV 登录的 Worker，默认包含任务 DO。
- `--frontend nuxt --backend hub`：完整 Nuxt + Nuxt UI + NuxtHub 应用；`--backend nuxt` 是其别名，使用 D1 / KV / R2 和任务 DO。

这里的 `nuxt` 前端参数表示 Nuxt UI；只有 `hub` 路线采用完整 Nuxt 框架。两个 Nuxt UI 起点分别验证，不将其他框架标成可任意替换的全栈组合。

## 组件体验仍是示例

七套应用界面的独立表格、表单、弹窗、媒体预览、布局和主题页面用于比较原生组件。fixture 搜索、模拟任务和本地文件选择不代表后台业务已执行。真实操作从「业务工作台」进入；CMS 内容与媒体使用原生页面。

## 验证与升级

CI 分别执行共享 SDK 检查、兼容 UI 检查，以及真实 workerd 集成检查：原有 16 种 CMS 界面组合、四条管理 API、只读用户权限、密钥隔离、存储读写、预加载、注销和旧请求取消。独立生成的轻量与 NuxtHub 项目还检查安装、重复 setup、类型、构建、dry-run 和实际任务；源码快照验证升级、回滚与业务文件保护。

本地 workerd、dry-run 和包体积不能证明线上免费套餐的 CPU 配额一定满足要求。首次加载和缓存后切换分别评估，依据 Cloudflare Observability 的真实指标优化。

[技术地图](./architecture) · [升级维护](./upgrades)
