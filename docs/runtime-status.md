# 运行状态

正式页面位于侧栏“运行状态”，路径 `#/runtime`，生产构建保留。它展示当前应用响应、依赖的只读连接检查、应用版本、原生 Worker 版本元数据，以及可选的 Cloudflare 平台指标。

## 展示与数据来源

- 总览图标区分正常、依赖异常和检查失败；网络错误保留旧报告并明确提示，不用旧绿色状态掩盖失败。
- D1、KV、R2 使用独立图标、状态文字与耗时。色彩不是唯一的信息来源。默认按需检查，可开启每 30 秒检查；隐藏标签页不轮询，离页停止。
- 本页最多保留 20 次真实检查结果，提示可通过键盘焦点查看。切页或更换会话清空，不持久化，也不将短期检查换算成全天可用率。
- 应用版本由消费项目提供。Worker 版本 ID、标签、创建时间来自原生 `version_metadata` binding；这是版本创建时间，不冒充部署时间。没有元数据时明确显示未提供，不计算全局进程运行时长。
- CPU、内存、请求量和错误率来自 Cloudflare GraphQL Analytics 的过去一小时聚合。CPU/执行耗时转换为毫秒，内存为字节，UI 转 MB；保留 P50/P99 语义。无数据、未接入和读取失败分别处理，不把缺失值显示为零。

平台指标只在进入页面和手动刷新时请求，自动依赖检查不额外查询 Analytics。平台可能采样和延迟，界面显示统计区间；调用错误率使用平台的调用错误计数，不等同于应用 HTTP 4xx/5xx 比例。隔离环境内存由多个并发请求共享，不表示单个请求或宿主机内存。Worker 没有固定机器可提供整机 CPU 百分比、磁盘和主机空闲内存。

## 消费项目复用

共享入口：

```ts
import { inspectRuntime, readCloudflareMetrics } from '@pengzhendong/worker-kit/server';
import type { RuntimeSnapshot, RuntimeMetrics } from '@pengzhendong/worker-kit/contracts';
import { RuntimeStatus } from '@pengzhendong/worker-kit/web/runtime-status';
```

UI 父项目显式声明可选 peer `@ant-design/icons`（本例固定 6.3.4），并沿用 React、Ant Design 和父项目 lockfile。普通 server/web 入口不会导入该图标包或整个运行状态页。

在自己的模块声明中增加 `runtime:read`，显式装配经过认证和权限保护的 Hono 路由，再渲染：

```tsx
<RuntimeStatus client={sessionApi} statusUrl="/api/admin/runtime"
  metricsUrl="/api/admin/runtime/metrics" dashboardUrl="https://dash.cloudflare.com/" />
```

`metricsUrl={null}` 可禁用指标请求。控制台链接只接受 `https://dash.cloudflare.com/`，可配置其下的具体 Worker 地址。依赖检查、绑定、应用版本与环境由项目传给 `inspectRuntime`，不扫描全部 env，不读取配置值并返回。没有绑定的纯 API 应用可以传空检查数组。

示例两个端点均要求浏览器 Cookie 和 `runtime:read`；不会授予 Bearer Token 查看平台运行信息的权限。旧 `/health` 与 `/api/admin/diagnostics` 保留兼容。

## 原生版本元数据

消费项目自己的 Wrangler 配置增加：

```json
{ "version_metadata": { "binding": "CF_VERSION_METADATA" } }
```

将 `env.CF_VERSION_METADATA` 传给 `inspectRuntime` 的 `version`。只返回 id/tag/timestamp 三个白名单字段；缺少绑定仍可检查依赖。

## 可选平台指标

未配置时应用仍能使用本地运行检查。接入线上指标需要目标账号的 **Account → Account Analytics → Read** Token，限定目标账号并设置合适有效期；不要使用拥有部署或账号写权限的通用令牌。

由消费项目配置非机密变量：

```json
{
  "vars": {
    "CLOUDFLARE_METRICS_ACCOUNT_ID": "your-account-id",
    "CLOUDFLARE_METRICS_SCRIPT_NAME": "your-worker-name"
  }
}
```

将 Token 放入该项目 Secret：

```sh
npx wrangler secret put CLOUDFLARE_METRICS_API_TOKEN
```

本地可在被忽略的 `.dev.vars` 中设置同名的三个值。示例文件只含注释占位，没有创建或读取用户现有的账号凭据。

`readCloudflareMetrics` 只访问官方固定 GraphQL 端点、配置的单一 Worker 和一小时时间窗口，不接受浏览器传入账号、脚本、URL 或 Token。聚合查询不带维度、不平均分位数；最大等待 5 秒，最多读取 64 KiB，拒绝重定向。权限/网络/GraphQL 错误统一脱敏，不返回原始错误、账号、Token 或查询片段。不是自建长时间序列采集器，也没有全局缓存或外部告警。

## 开源参考与实际复用

- [Uptime Kuma HeartbeatBar](https://github.com/louislam/uptime-kuma/blob/master/src/components/HeartbeatBar.vue)：参考状态色块、真实检查历史和悬停信息；保留当前页的检查记录语义，没有引入其监控服务端与 Vue。
- [OpenStatus StatusBar](https://github.com/openstatusHQ/openstatus/blob/main/packages/ui/src/components/blocks/status-bar.tsx)：参考将数据与交互分开、键盘可访问的详情。没有复制 AGPL 项目组件。
- [Ant Design Icons](https://github.com/ant-design/ant-design-icons)：实际依赖，配合 Ant Design 的 Card、Tag、Tooltip、Statistic 等控件和公共主题，避免另写控件系统。
- [cf-monitor](https://github.com/littlebearapps/cf-monitor)：比较 Cloudflare 指标查询和单位处理；它还包含独立 Worker、预算与告警功能，目前不需要整体引入。
- [Workers GraphQL](https://developers.cloudflare.com/analytics/graphql-api/tutorials/querying-workers-metrics/)、[内存字段](https://developers.cloudflare.com/changelog/post/2026-06-30-memory-usage-metrics/)、[版本元数据](https://developers.cloudflare.com/workers/runtime-apis/bindings/version-metadata/)、[只读 Token](https://developers.cloudflare.com/analytics/graphql-api/getting-started/authentication/api-token-auth/)：使用官方平台接口与配置。

## 验证范围

workerd 检查真实 D1/KV/R2、Cookie 和权限，确认报告不写业务数据。Analytics 使用确定的上游响应检查请求范围、单位、空数据、失败脱敏和体积限制；未配置真实只读 Token 时，不宣称已从线上账号读到指标。

固定 Linux UI 检查浅/深色与手机布局、真实页面的查询/错误状态、权限先于请求、检查记录清理、自动检查只轮询依赖和离页取消。新增侧栏入口引起的旧截图差异另行人工确认，再更新对应基准并正常复验。实际预览还需确认 API、版本绑定、图标、刷新、主题与滚动。

## 轻量原生入口

已有原生 `fetch(request, env)` 的 Worker 可直接导入 `@pengzhendong/worker-kit/runtime`；它只导出运行检查和健康检查，不加载 Hono、React 或 OpenAPI 生成器。`/server` 继续供 Hono 应用使用，Hono 现在是可选 peer：使用该入口的应用须显式安装它。

`@pengzhendong/worker-kit/http` 提供 `readBytesLimited(stream, maxBytes, signal?)`、`readTextLimited` 和 `BodyLimitError`。按实际收到的字节限制大小，超限/取消时取消底层流并释放 reader；不信任 Content-Length，不处理 URL、凭据、重试或解压策略。解压前后需要分别设限时由应用组合。调用者可用原生 `AbortSignal.timeout()` / `AbortSignal.any()` 控制时限；平台指标读取已采用这个公共工具。

`/contracts` 导出 `runtimeSnapshotSchema` 和 `runtimeMetricsSchema`，是无运行时依赖的 JSON Schema / OpenAPI 3.1 对象。示例与消费项目应引用同一声明，避免分别维护字段和单位。
