# WorkerKit 功能回顾与开源比较

本轮范围：增加 API 中心后，逐项阅读共享源码与 dashboard 接入，结合 workerd 接口检查、Node 工具测试、固定 Linux UI 回归和真实 5173 预览验收。这里描述经过验证的能力及边界，不把示例业务当作已经接入其他项目的生产系统。

## 功能清单

| 范围 | 当前实现与检查 | 适用边界 |
| --- | --- | --- |
| submodule 与入口 | server/web/contracts/modules/openapi/tooling 分离；可选 API 文档 UI；私有 GitHub 仓库；Honeybee 固定 Git 指针与父项目 lockfile | 不发布 npm；消费项目显式升级，CI 需有私有仓库读取权限 |
| 单管理员登录 | Hono 签名 HttpOnly Cookie、同源写请求、HTTPS、本机短密码选项、登录限流、配置缺失拒绝访问 | 单管理员；Cookie 无逐会话服务端撤销；不含注册、OAuth、多租户 |
| 模块与权限 | 纯声明派生菜单、路径及操作标识，默认拒绝，逐接口 require，权限加载失败不挂业务页；只读与撤权测试 | 页面和 API 仍由应用显式装配；没有动态插件或数据行级授权 |
| 会话生命周期 | 401 一次失效、403/网络故障保留身份、版本隔离、旧请求取消、同步用户缓存清理、表单与权限重建 | 没有跨标签身份广播；注册的缓存清理必须同步；取消不等于写入回滚 |
| 页面恢复 | 实际复用 react-error-boundary；页面和应用两层，保留导航、重试与重新加载 | 普通事件和异步请求仍需调用方处理；不自动上报原始堆栈 |
| 界面与主题 | token、图标中心线、紧凑上传、固定分区滚动、底部账户菜单、手机抽屉、浅深主题 | Chromium 三种视口，不等于完整跨浏览器或无障碍认证 |
| 资源管理 | D1 CRUD、绑定参数、封闭排序字段、筛选/分页、422 字段错误、批量逐项结果、JSON 导出、审计 | 管理配置清单；不执行订阅抓取或任务。导出最多 10000 项 |
| R2 文件 | 私有前缀、10MB 上限、游标列表、认证 Blob 下载、文件名和下载响应头处理、删除确认 | 示例概览最多枚举 1000 个文件；不是通用 WebDAV/超大文件流式客户端 |
| KV 设置 | 声明键及类型校验，新增应用域校验，字段错误显示与失败草稿保留 | 非机密偏好；没有 KV 强一致事务或并发编辑冲突检测 |
| 操作日志 | D1 业务事件、Token actor、筛选分页；显式保留策略、分批清理和清理审计 | 默认不删除；不是全量 HTTP 日志；跨 R2/KV 与 D1 的审计为尽力写入 |
| API 目录与文档 | 29 个操作，列表和 Scalar 共用受保护的 OpenAPI；应用 JSON 写入共用 Zod Schema，资源/设置响应派生与真实契约检查；搜索筛选、按操作查看、同源调试 | 登录、文件和查询仍沿用共享校验器；不是无配置扫描或全部线上响应校验 |
| API Key | Web Crypto 随机 token、仅存摘要、一次展示、权限与有效期、分页元数据、撤销、限流、最近使用、审计 | 每次授权读取 D1 主库；不是 OAuth/JWT 身份系统；撤销不终止已授权的在途执行 |
| 开发工具 | 本地 D1/KV/R2、追踪、日志与命令目录；模块权限实况；组件交互示例 | 原生工具仅本机可信调试；无第二套存储编辑器；未配置能力明确标记 |
| 运行与升级 | 公共存活、受保护只读依赖诊断、Cloudflare 原生指标日志、doctor 离线预检、生产开发页排除、dry-run | 没有创建外部 uptime 告警或自建采集服务；预检不证明线上 Secret/迁移/资源可用 |
| 运行状态页 | 独立可选 UI、图标与文字状态、D1/KV/R2 只读检查、原生版本元数据、本页 20 次记录；可选读取 Cloudflare 一小时请求、调用错误、CPU 和内存分位数 | 指标需要应用配置 Account Analytics Read Token；当前真实预览未配置，平台适配器以夹具验证；不是宿主机监控或外部可用率 |
| 自动回归 | workerd 真实绑定测试、Node 预检测试、Linux 视觉与行为断言，包含取消、异常、权限和 Token 边界 | 测试夹具不会改预览存储；真实预览验收不能被 HTML 200 或独立测试替代 |

## 本轮落实的改进

- 使用 hono-openapi 与 Scalar 的实际包，保留现有 Hono 路由和统一错误契约。文档不另做手写接口列表，新增测试检查全部方法/路径覆盖。
- Token 身份与 adminUser 分开；权限必须同时满足 key 范围、签发者当前授权、启用模块和显式允许 Token 的操作。无效 Authorization 不回退 Cookie，管理 Token 的接口不能被 Token 调用。
- D1 授权读取明确走 primary session，避免读副本状态拖延撤销；签发和撤销连同审计 batch 提交；最近使用信息做限频更新。
- Scalar 独立 HTML、固定版本、本地资源、中文与明暗主题，隔离父页路由与样式。关闭遥测/Agent/持久认证，限制同源和重定向，隐藏上传文档的 SDK 推广按钮，保留代码示例与调试。
- 修正搜索长度、文件列表默认大小和公开接口描述等文档细节；不叠加已经存在的 16KB 资源请求体限制，新增回归检查。
- 资源导出也接入会话客户端：正常下载 JSON 并保留后台，过期时回到登录，取消请求不弹旧会话错误。新增真实下载与 401 恢复检查。
- 通用设置模块增加可选 validate 回调；示例应用约束名称、描述、邮箱和分页选项，并将后端字段错误回填表单。校验失败时验证 KV 保持原值。

## 与开源实现比较

| 参考 | 实际借鉴或复用 | 对 WorkerKit 的判断 |
| --- | --- | --- |
| [Hono OpenAPI](https://honohub.dev/docs/openapi) | 原生 middleware 和 OpenAPI 生成，Standard Schema 适配入口 | 当前适合渐进描述已有路由；下一步按业务接口逐个统一 Schema，避免一次重写所有接口 |
| [Scalar](https://github.com/scalar/scalar) | 实际文档 UI、模型、代码示例与客户端 | 直接复用成熟界面。包和动态资源体积较大，放独立 HTML 页面；继续验证父界面滚动与主题，不强塞首屏主包 |
| [Better Auth API Key](https://better-auth.com/docs/plugins/api-key/reference) | 参考摘要存储、权限、有效期和 key 元数据 | 当前单管理员适合小的存储适配器；需要用户/组织、更多认证方式时，再评估整体接 Better Auth，不能只换 UI |
| [Refine 授权](https://refine.dev/core/docs/guides-concepts/authorization/) | 区分资源、操作与可信授权，UI 与 API 都检查 | 保留小型显式组合。没有搬入完整 data provider、角色后台或通用 CRUD；用户隐藏按钮从不替代服务端校验 |
| [TanStack Query 取消](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation) | 消费 AbortSignal，避免旧请求回写 | 现有 hook 无缓存，适合目前规模；多个模块需要共享缓存时可接 QueryClient，并通过会话清理回调清缓存 |
| [react-error-boundary](https://github.com/bvaughn/react-error-boundary) | 实际复用 resetKeys、重试和错误回调 | 无需自己维护另一个 React 边界实现；页面、根部与异步错误责任已经分清 |
| [Cloudflare D1 复制](https://developers.cloudflare.com/d1/best-practices/read-replication/) | first-primary 授权读取 | 撤销需要明确一致性语义；不把最终一致 KV 缓存当作即时撤销的唯一依据 |
| [Uptime Kuma](https://github.com/louislam/uptime-kuma)、[OpenStatus](https://github.com/openstatusHQ/openstatus) | 参考真实检查记录、状态条和键盘可访问交互；图标实际使用 Ant Design Icons | 不复制整套监控服务或 OpenStatus 源码；应用内检查、平台采样指标和外部监控分别说明，未知值不显示为零 |

## 后续优先级

1. **接口 Schema 逐步统一**：应用 JSON 写入已完成，Zod 原生校验与 JSON Schema 转换共用字段定义；资源/设置响应和有效文档示例加入真实契约检查，保留 400/422、字段路径、批量结果和下载格式。登录、文件、分页仍使用共享校验器；接入方案见 [接口 Schema](api-schemas.md)。
2. **第一个真实项目接入**：Honeybee 原项目已接入公共布局、模块声明、会话请求、统一错误、9 个管理接口与 Scalar 文档，保留已有登录、订阅与 RPC。50 项业务测试、12 项适配检查、父项目重新安装、依赖检查、doctor 和 dry-run 通过；真实本地 Wrangler、隔离 KV 与浏览器复验见 [接入记录](honeybee-integration.md)。生产推送与部署仍单独进行。
3. **有需求再增加并发控制与缓存**：设置版本或资源 ETag 可防多人/脚本覆盖，TanStack Query 可提供共享缓存；当前没有多人协作或自动乐观更新。
4. **业务规模增长后再做运营能力**：API 分析、全局配额、组织 key、自动密钥轮换与外部告警分别需要明确的一致性和运维方案。当前节点限流和最近使用时间不能替代这些能力。

当前没有必须引入第二套管理框架才能解决的问题。主要价值是把已有原生能力接通、权限边界保持一致、并让消费项目能通过文档与检查可靠升级。

## 依赖补丁回顾

本轮从官方 npm 审计结果确认，原开发工具链包含 Undici 7.29.1 与测试插件内 Zod 4.6.5 的公告影响范围。没有按 npm 建议降级整个 Wrangler/测试插件；在仓库根 overrides 中分别固定 Miniflare 的 Undici 7.30.1，以及 Cloudflare 测试插件的 Zod 4.6.7，再执行完整检查。生产依赖中的 Zod 原已为 4.6.7。

参考公告：[Undici EventSource 内存限制](https://github.com/advisories/GHSA-4qv8-2p9j-2685)、[Undici SRI](https://github.com/advisories/GHSA-f72v-6w45-q472)、[Undici content-encoding](https://github.com/advisories/GHSA-xjj6-f33q-929c)、[Zod 集合验证](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)。审计结果是依赖公告检查，不等同于渗透测试或线上安全认证。

npm overrides 只对安装根项目生效，消费项目若沿用这些工具版本，需要同步其根 overrides/lockfile；submodule 内的 overrides 不会自动覆盖父项目。
