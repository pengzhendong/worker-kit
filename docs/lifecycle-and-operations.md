# 应用生命周期与运行检查

WorkerKit 保留 Hono、React、Wrangler 的原生接入方式。以下能力按入口组合，身份提供方、业务缓存、日志策略和线上探测仍由消费项目决定。

## 会话与请求

```ts
import { createApiClient, createSessionScope } from '@pengzhendong/worker-kit/web';

export const sessionScope = createSessionScope();
export const api = createApiClient({ scope: sessionScope });
// 登录失败的 401 应显示凭据错误，不能触发业务会话失效。
export const authApi = createApiClient();

// 如果项目使用自己的缓存，注册同步清理；卸载时调用返回的注销函数。
const unregister = sessionScope.registerCleanup(() => queryClient.clear());
// 身份提供方确认身份变更后，在挂载新身份页面前执行：
sessionScope.reset('identity-changed');
```

`createSessionScope()` 不持有用户、凭据或缓存。`reset()` 增加会话版本、取消在途请求、同步清理已注册的用户缓存，再通知订阅者。即使底层任务忽略 AbortSignal，其旧结果也不能通过 `run()` 返回。清理函数必须同步；抛错或返回 Promise 会导致 reset 报错，调用方应阻止挂载新身份并要求重新加载。不要把清理任务写成异步后台作业。

示例通过 `subscribe()` 接收失效事件，以会话版本作为已登录组件树的 React key，清除权限快照、表单草稿和页面数据。主题偏好保留，不调用 `localStorage.clear()`。新登录成功或显式切换身份时，先 reset 再接受会话。当前仍是单管理员 Cookie 认证，没有多用户切换页面、跨标签广播或刷新令牌服务；其他认证适配器应在自身身份变更回调中调用 reset。

带 scope 的 API 客户端在业务请求返回 401 时只使对应版本失效一次；旧请求不能使新会话失效。403、网络故障和 5xx 保留身份，由页面显示错误并允许重试。请求取消抛出 AbortError，使用 `isRequestCancelled()` 静默处理。请求和写操作均不自动重试。`ApiClientError.retryAfterSeconds` 从 Retry-After 读取有界的等待时间，登录页区分错误凭据、429、网络和服务故障，并阻止重复提交。

`useApiQuery<T>(api, path)` 是无缓存 GET hook，离开页面、参数变更或刷新时取消旧请求。同一路径刷新保留旧数据，路径变化立即隐藏旧结果；`path=null` 不发送请求。已有缓存库可直接使用 API 客户端和清理回调，无需替换为这个 hook。

文件上传转发调用方 AbortSignal，下载也经过会话客户端后生成 Blob。**客户端取消不能撤销服务端已经提交的写入**；有此需求的业务应另行设计幂等键或任务取消协议。大文件或流式下载应用应自行选择流式方案，示例的 Blob 下载适用于其 10 MB 文件上限。

## 错误恢复

`AppErrorBoundary` 直接组合 `react-error-boundary`。示例提供两层：应用根部包住 Provider，页面边界位于 AdminShell 内，以路径和会话版本为 resetKeys。页面渲染或懒加载失败时保留导航，允许重试或刷新；根部失败显示应用级恢复入口。界面不暴露原始异常或堆栈。

普通事件处理和异步请求不会由 React 错误边界自动捕获，应在调用处处理。消费项目可以传入原生 `onError`、`onReset`；上报前自行去除敏感信息。开发工具的“运行与恢复”提供临时组件错误与恢复演示，仅开发构建包含此页面。

## 健康与诊断

| 入口 | 作用 | 边界 |
| --- | --- | --- |
| GET `/health` | 公开存活检查，no-store | 只证明 Worker 能响应，不读取存储 |
| GET `/api/admin/diagnostics` | 已认证且有 `overview:diagnose` 权限时，按需检查 D1/KV/R2 | 只读；结果不包含绑定值、文件内容或异常消息 |
| `runHealthChecks()` | 共享的并行、限时检查组合器 | 默认每项 1500 ms，最多 16 项，可配置 1–5000 ms |

依赖诊断返回 HTTP 200 的报告，调用方须判断 `ok` 以及各项 `ok/error/timeout`，它不是对外 readiness 状态码接口。超时限制等待报告的时间，不能中断不支持取消的绑定操作，因此只传入有界的只读检查。示例使用 SELECT 1、KV get 和 R2 head，不写测试数据。界面初始显示“尚未检查”，不轮询，也不以此证明持续可用。

Wrangler 显式启用 observability 和采样。请求日志沿用统一请求 ID、耗时、状态和脱敏结构；自定义同步日志出口抛错不会改变请求响应。持续请求指标与运行日志使用 Cloudflare 原生能力，保留期、采样和费用由平台及账户配置决定。D1 操作日志是另外的业务审计。此实现没有自建指标库、持续采集服务或自动创建外部可用性监控；需要告警时由项目接入现有平台。

## 操作日志保留

`AUDIT_RETENTION_DAYS` 未设置或为字符串 `"0"` 时关闭清理；示例默认关闭。显式开启时允许 7–3650 整数天，无效配置拒绝执行。策略与表结构属于消费应用，实现在 `examples/dashboard/server/audit-retention.ts`，不绑定共享库的业务表名。

GET `/api/admin/audit/retention` 需 `audit:read`，显示策略和当前可清理数量。POST `/api/admin/audit/prune` 需 `audit:prune`、同源认证和明确确认值 `delete-expired-audit-events`。截止时间按服务端配置计算，不接收客户端任意截止日期。每次最多删 1000 条过期记录，删除与新增 `audit.prune` 审计记录在同一 D1 batch 内完成；较新记录保留。

界面仅在启用策略并获得权限时显示清理确认按钮。没有自动定时清理或默认删除，真实预览验收未执行清理。若项目需要定时执行，可在明确其保留策略后从自己的 scheduled 入口调用业务函数。

## 离线升级预检

在 WorkerKit 根目录：

```sh
npm run doctor
npm run doctor -- --production
npm run upgrade:check
```

前两个命令默认检查 dashboard，production 会额外要求 D1/KV/R2 生产资源标识；示例本地配置没有这些标识时失败是预期行为。最后一个命令运行完整 `check` 和正常视觉比较，包含构建、生产开发页排除及部署 dry-run；它会产生本地构建/测试产物，需要 Docker，不部署也不应用远程迁移。

消费项目在父项目根目录使用已安装的本地 bin，例如 npm script `"doctor": "workerkit doctor --project ."`，或直接调用 submodule：

```sh
node framework/src/tooling/doctor.mjs doctor --project . --environment production --production --strict
node framework/src/tooling/doctor.mjs doctor --project . --json
```

也可从 `@pengzhendong/worker-kit/tooling/doctor` 导入 `inspectProject()`。`--config` 选择配置文件；`--strict` 将警告也作为失败，默认仅 fail 返回非零。Node 与运行时 peer 版本、React/Hono 重复副本、父项目 lockfile、submodule HEAD 与父索引指针、本地未提交修改、入口、兼容日期、观测配置、绑定与迁移文件均会检查。

预检通过 Wrangler 自己的 `unstable_readConfig` 解析 json/jsonc/toml 和选定环境，使用 semver 解析版本，不自行重写配置语法。该 API 可能随 Wrangler 升级变化；固定 lockfile 并运行工具测试。项目可以复制示例的 `workerkit.check.json`，声明所需原生绑定类型和 Secret 名称；这是预检需求文件，不参与运行时资源注册。

doctor 不执行项目脚本、网络请求、安装、迁移或部署，也不读取 `.dev.vars` 或密钥值；能拒绝把声明的 Secret 放进普通 vars，但不能确认远程 Secret 已配置、资源可达、迁移已应用或所有接口已鉴权。本地迁移仅检查文件非空及数字编号不重复，不是 SQL 语义验证。

升级本次 UI 入口的消费项目需显式安装 `react-error-boundary`（已验证 6.1.6）；使用 doctor 还需 semver（7.8.5）和 Wrangler（4.152.0），保持父项目单一 lockfile。仅导入 server 的项目不加载 React 或错误边界。原无 scope 的 `createApiClient()` 继续兼容，只有显式传 scope 才启用自动 401 会话处理。

## 参考实现

- [TanStack Query 请求取消](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation)：借鉴消费 AbortSignal 与取消在途工作的模式，未引入其缓存或自动重试。TanStack 默认并非总在卸载时取消请求。
- [Refine Auth Provider](https://refine.dev/core/docs/authentication/auth-provider/)：借鉴认证错误单独决策的扩展点。WorkerKit 的策略是仅 401 失效；403 保留身份，不照搬示例中的所有状态码。
- [react-error-boundary](https://github.com/bvaughn/react-error-boundary)：实际依赖，复用 resetKeys、reset 和原生错误回调。
- [Cloudflare Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/) 与 [Metrics](https://developers.cloudflare.com/workers/observability/metrics-and-analytics/)：使用平台观测能力。
