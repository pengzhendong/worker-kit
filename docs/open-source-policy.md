# 开源优先与复用边界

扩充能力先找维护中的开源实现；现有依赖能完成时直接使用其组件、配置和插件。WorkerKit 负责 Cloudflare 适配、项目约定和少量组合。已有开源能力不因为需要统一外观就重新实现；主题优先走原生 token、skin 和公开属性。

## 当前选择（2026-10-26）

| 能力 | 直接使用 | 保留的项目代码 |
| --- | --- | --- |
| 图片预览与图片组 | Ant Design Image / Image.PreviewGroup | 缩略图和原图地址、标题；图片组直接由消费应用组合 |
| 音视频详情 | Video.js 10 NeutralAudioSkin / NeutralVideoSkin 与原生 preset | 资源地址、主题变量、互斥播放、卸载清理 |
| 紧凑试听 | Video.js PlayButton / TimeSlider / Time | 64 px 混合列表排版及播放前的已知时长；不另写播放、定位或键盘状态机 |
| 波形 | WaveSurfer | 延迟加载、文件大小限制、业务 peaks 端点和销毁 |
| 表格、弹窗表单 | Ant Design；dashboard 资源管理试用 ProTable / ModalForm | 业务字段、查询契约、权限、批量部分失败和后端字段错误 |
| API 文档与 Schema | hono-openapi / Scalar / Zod | 显式认证、同源策略和错误契约 |
| 路由、Cookie、开发绑定 | Hono / Wrangler / Cloudflare Vite plugin | 应用配置与绑定适配 |
| 页面错误边界、视觉回归 | react-error-boundary / Playwright | 会话重置键、测试夹具与人工确认的基准 |

Worker Console 的脚本编辑页按需加载 CodeMirror 6，通过 React 适配器使用 JavaScript 高亮和行号。依赖仅由 Console 安装，WorkerKit 通过可选的编辑器组件接入表单。

脚本的 JSON 返回值通过 Console 注入的 react-inspector 展示，使用内置 Chrome 亮色和暗色主题。WorkerKit 负责解析返回值和显示文本日志。

### ProComponents 局部试点

发布包检查：正式版 `2.8.10` 声明支持 Ant Design 4/5；预发布版 `3.1.15-8` 声明支持 Ant Design 6。dashboard 已使用 Ant Design 6，因此仅在 dashboard 的懒加载资源管理页面固定使用 `3.1.15-8`，不强制其他项目安装，也不从 WorkerKit 公共入口导出。

ProTable 原生提供列显示设置、表格密度与刷新；ModalForm 原生管理异步提交的 loading 和成功关闭，失败返回 false 保留草稿。查询继续经过现有会话客户端；表格不另建请求缓存。列设置不持久化身份相关数据，操作列不能被列设置重新开启。

ModalForm 显式配置 `omitNil={false}`，保留接口要求的空地址和空描述；上游默认省略空字符串的行为不适用于现有 Schema。通过原生配置保持协议，不新增字段归一化器。

稳定兼容版发布并通过验证前，不将此试点作为公共默认。发现兼容或体验回归时，资源页可退回原生 Ant Design Table / Modal / Form，服务端协议和消费项目都不需要改变。

### 已评估而暂不采用

- Refine Core 是后续复杂 CRUD 的候选。当前 `@refinedev/antd@6.0.3` 的 peer 是 `antd@^5.23.0`，不通过忽略 peer 的方式接入当前 Ant Design 6 应用。出现跨页缓存、多资源 CRUD 等明确需求时再验证 Core 和数据/认证适配器，避免同时维护两套资源和权限体系。
- Vidstack 官方已进入仅安全维护阶段并引导迁移至 Video.js 10；不新增接入。
- 光屿观影交互经独立浏览器验证后复用 Video.js 10：使用公开 Controls / Menu / TimeSlider 等组件，最小补充长按、滑动与网页全屏。选集、续播、HLS 引擎配置、线路回退和弹幕继续由消费项目提供；不维护 ArtPlayer 兼容接口。
- TanStack Query 适合共享查询缓存；当前简单 GET 无缓存，不为替换几十行 hook 引入第二个全局缓存。需要时使用上游原生 API，并接入会话取消和同步清缓存。

## 每次扩充怎样选择

1. 写清楚当前真实需求，检查已有依赖是否已经支持。
2. 查看官方文档、维护状态、许可证和实际 npm 发布包的 peerDependencies；文档可用不代表已发布稳定兼容版。
3. 在一个实际页面直接使用原生 API，验证明暗主题、手机、键盘、失败、卸载和权限边界，并确认新增包只加载到使用它的页面。
4. 能直接配置就不加封装；确有重复适配才抽到共享库。保留原生参数和组合方式，避免另建配置语言。
5. 记录采用方案、锁定版本、自有代码职责和未覆盖的需求。检查通过后再推广到其他消费者。

普通小改沿用以上约定即可，不为每次改动另建审批流程。

参考：[Video.js 皮肤](https://videojs.org/docs/framework/react/guides/skins)、[Ant Design Image](https://ant.design/components/image/)、[WaveSurfer](https://wavesurfer.xyz/docs/)、[ProComponents](https://github.com/ant-design/pro-components)、[Refine](https://refine.dev/core/docs/)、[Vidstack 维护说明](https://github.com/vidstack/player)。

管理员改密沿用 Hono Cookie、timingSafeEqual、原生 Web Crypto PBKDF2 和 D1 的原子 SQL，不引入新认证引擎。新增代码仅补充旧密码校验、可选存储协议与 Ant Design 表单组合；不是多用户认证系统。

### 大量卡片的连续滚动

`web/virtual-grid` 采用 TanStack Virtual 3.14.24（MIT，React peer 支持 19）。它处理视口观察、虚拟行与渲染范围，WorkerKit 只提供等高响应式网格与 AdminShell 滚动容器适配，不自写虚拟列表引擎。作为可选 peer，只在该独立入口导入；服务端、普通 UI 和无需大列表的消费者不增加依赖。剪映资源库按批请求和失败重试留在业务层；与单页自动分页 `useAutoPageSize` 分开使用。

## 定时任务

WorkerKit 的任务管理器通过 SchedulePort 接入调度引擎。Worker Console 使用
[Cloudflare Agents Scheduler](https://developers.cloudflare.com/agents/runtime/capabilities/scheduler/)
的独立 schedules 与 lifecycle 入口（agents 0.32.0，MIT）。调度、Cron 解析和 Alarm
由开源实现负责。计划参数校验、运行记录、进度及业务执行适配留在 WorkerKit。
agents 仅由启用调度的消费项目安装。

GitHub 定时任务发现直接使用 [GitHub Actions API](https://docs.github.com/en/rest/actions/workflows#list-repository-workflows) 和 [仓库内容 API](https://docs.github.com/en/rest/repos/contents#get-repository-content)。WorkerKit 负责分页、筛选 `on.schedule` 及读取最近的定时运行。YAML 解析沿用 Worker Console 已安装的 `yaml`，由消费项目传入，无需增加依赖。

Worker Console 的小脚本试点使用 [QuickJS Emscripten](https://github.com/justjake/quickjs-emscripten) 0.32.0（MIT），复用上游的 WebAssembly 运行时。Console 单独安装依赖并限制脚本可用的 HTTP 能力。WorkerKit 只提供表单、试跑接口、调度和结果展示。

## Vue 后台方案示范

Nuxt UI、PrimeVue/Sakai 与 Vben 的隔离试点、固定版本、许可证和启动方式见 [ui-demos.md](ui-demos.md)。只使用通用 fixture，禁止引用真实消费项目名称或业务数据。三套尚未作为公共默认，也不改变既有 React 或服务端入口。

组件目录通过现有 Vue、React 和 Vite 构建流程运行官方示例。`examples/ui-suite/gallery/official/sources.json` 固定每套库的源码提交、示例 blob 和许可证，源码随仓库保存。新增时按目录路由登记示例文件，检查与已安装版本兼容，并在浏览器拦截外部请求后验证示例。按需加载使用 Vite 动态导入，Vue 组件解析使用 `unplugin-vue-components`，仅作为构建依赖。WorkerKit 的适配范围是剥离文档外壳、补全自动导入和替换外部资源；无需将上游文档站纳入 Worker 构建。

shadcn-vue 的数据表格复用 TanStack Vue Table 8.21.3（MIT），沿用工作区已有的 Vue 3 兼容版本。MUI 数字输入复用 Base UI 1.9.0（MIT，支持 React 19）。两者仅进入相应的组件库示例，WorkerKit 提供样式与本地数据。Vuetify 服务端表格使用官方示例中的本地模拟 API，分页和加载状态在同一个页面验证。

shadcn-vue 的日期范围日历复用工作区已有的 @internationalized/date 3.12.4（Apache 2.0），该依赖固定在 Vue 示例工作区。代码块、附件、标记和执行轨迹随预览加载固定提交里的 Nova 样式。代码块组合上游的行号和复制按钮，附件用站内图片和浏览器状态演示移除操作。

shadcn-vue 表单使用固定的 VeeValidate 4.15.1（MIT，兼容当前 Vue 3.5）和上游字段组件。Nuxt UI 的表情菜单使用 TipTap Emoji 3.32.3（MIT），与当前 TipTap 核心、ProseMirror 和 Suggestion 版本对齐。两者仅声明在使用它们的示例工作区。Nuxt Content 导航和搜索使用 Nuxt UI 随包提供的控件及本地文档数据。SSR 对照样例在构建时通过 Vue 或 React 的服务端渲染器生成。

图表示例沿用各库的官方组合。Nuxt UI 使用 TanStack Charts 1.4.0（MIT，支持 Vue 3.5），shadcn-vue 使用同版本的 Unovis Vue 和 TypeScript 包 1.8.0（Apache 2.0）。Naive UI 公式示例使用 KaTeX 0.19.1（MIT），字体随构建提供。Vuetify 使用其原生 SVG 图标渲染和 Material Design Icons SVG 路径，MUI 示例使用与 Material UI 同版本的图标包。这些依赖均固定在对应示范的工作区中，示例代码按需加载。

### React 与 Bootstrap 预览

组件体验导航按表格、表单、弹窗、预览、布局和主题分别配置图标。React 使用现有 Ant Design Icons，PrimeVue 使用 PrimeIcons；Bootstrap 示例复用仓库已采用的 PrimeIcons 7.0.0 字体与样式，依赖只进入该示例。Nuxt UI 与 Vben 保留现有 Lucide 配置，各方案使用原生图标的颜色与尺寸约定。

Ant Design Pro 使用正式版 ProComponents 2.8.10 的 ProLayout / ProTable / ModalForm；Refine 使用 Core 5.0.12 和 antd 适配器 6.0.3。两者独立示例使用 Ant Design 5.29.3，不把旧后台 Ant Design 6 降级，也不使用忽略 peer 的安装选项。示例是 Vite 组合，不声明包含完整 Ant Design Pro/Umi 工程。

Tabler 1.7.3、AdminLTE 4.10.0 直接使用 MIT npm 发布包和 Bootstrap 5.3.8 原生交互。页面内容与通用 fixture 由消费示例维护，布局与组件样式由上游负责；没有把通用播放、表格或上传引擎移入公共库。

操作提示复用各自前端的原生组件：Nuxt UI Toast、PrimeVue Toast、Ant Design/Ant Design Vue message，以及 Bootstrap Toast。Tabler/AdminLTE 已移除原来的 alert 元素加自写关闭计时器，使用 [Bootstrap Toast](https://getbootstrap.com/docs/5.3/components/toasts/) 的自动关闭、悬停/焦点暂停和关闭按钮；示例只负责传入文案并在原生 hidden 事件后释放实例。旧 React 示例本来就在用 Ant Design notification，没有另一套共享通知引擎。业务事件与认证失效监听不属于提示组件，继续保留。VitePress 文档页使用行内状态，不假定其自带通知中心。

### Payload Workers 整合示例（2026-11-06）

完整后台试用官方 Payload `with-cloudflare-d1` 模板（来源与固定 commit 见 `examples/payload-dashboard/upstream.json`），MIT。Payload、Next 和 OpenNext 仅安装在独立示例，使用自己的严格 peer 检查与 lockfile，不进入公共运行时或根 workspace。当前版本使用官方 CollectionConfig、认证、D1 adapter、R2 plugin 与原生管理组件；在官方模板之上增加 WorkerKit 原生 API 的组合、运行台、角色权限与 scheduled 入口；没有重写通用后台引擎。一个 Worker、同一套 Payload 会话，集成业务代码仍放在示例内。该试点验证了本地 workerd 功能和包体积，未验证免费账户的线上 CPU 配额。具体边界见示例 README。

统一部署使用原生 Workers Static Assets 和显式路径分流，把八套 UI 构建产物合并到同一个 OpenNext 资产目录；不引入微前端注册引擎或另一套代理服务。前端的任务/日志样例仍保留，真实业务通过 Payload/WorkerKit API，避免将部署合并误称为所有业务页面已迁移。

Static Assets 的 Range 缺口使用原生 Cache API 补齐，仅适用于构建时限制在 2 MiB 内的公开音视频，复用 WorkerKit 的限量流读取；不自建 Range 解析器，不缓存 Payload 私有文件。

### SonicJS 对比接入（2026-11-06）

使用已发布的 `@sonicjs-cms/core@3.0.0`（MIT）及原生 Hono app、CollectionConfig、Better Auth、RBAC 和 D1 迁移，只进入可选的完整示例。未修改依赖包源码，未新增 submodule。SonicJS 没有完整的管理端子路径挂载配置，因此一个 Worker 按两个同站点主机名分流，保留根路由、原生表单、Cookie 和内部链接；避免使用 HTML/JS 正则改写或全局切换 Cookie。仅增加明确的绑定组合、同源写请求检查与受限的 iframe 响应策略。两套 CMS 用各自的 D1/R2/认证，登录和数据不互相冒用。首次本地管理员通过已发布的 Better Auth 密码哈希与 SonicJS RBAC SDK 创建；已有用户不重置。升级时运行两套 CMS 的原生 workerd 功能和切换回归。

跨框架预览用浏览器原生 iframe 隔离样式。公开界面示例可在浏览器空闲时逐个准备，切换时复用已加载的页面。后端展示按需打开，切换时移除旧页面，返回后重新读取会话与业务数据。组件和页面标题沿用各上游的原生布局。

预览站静态资源加速使用 Cloudflare 原生 Static Assets、`_headers` 和 `run_worker_first` 排除规则（[官方说明](https://developers.cloudflare.com/workers/static-assets/binding/)），不引入运行时代理缓存。SonicJS 固定公共依赖随构建发布，保留 Tailwind/Alpine/Chart.js 的 MIT、HTMX 的 0BSD 与 Inter 的 OFL 许可证，并校验 SHA-256。按已发布 SDK 的实际能力，未发现 CDN URL 配置项，因此只用原生 HTMLRewriter 做资源属性和字体 URL 的有限替换，不修改安装包或原生业务代码。SDK 个别确认弹窗仍引用 Tailwind Plus Elements；它使用独立商业许可证，不在本地镜像清单内，不能将 SonicJS 自身的 MIT 误解为所有引用脚本都适用 MIT。

演示凭据按用户要求使用 `admin / password`。Payload 使用原生用户名认证；SonicJS 只在 localhost 或显式启用 `WORKERKIT_DEMO=1` 的指定演示身份上增加用户名到邮箱的别名适配，登录表单用 HTMLRewriter 调整，密码与会话继续由原生认证处理。未修改 npm 包，未增加免登录或密码跳过。账号重置是显式本地 CLI，通过原生密码哈希与 Payload Local API 完成；错误密码仍需拒绝。

### 可选前后端的业务底座

八套前端的业务工作台复用同一组任务与诊断 HTTP 接口，分别使用上游原生组件渲染。共享浏览器 API/会话实现从 `src/web` 移到 `src/client`，旧路径只兼容转发。任务执行继续使用现有 TaskManager；可选示例安装 agents 0.32.0 的 Scheduler/Lifecycle 与 cron-schedule 6.0.0，原生 SQLite DO 存储计划与运行记录，不再自写一套定时器。业务定义留在示例或生成项目的 `src/business/tasks.ts`。

Payload 的身份来自原生 auth；SonicJS 在公开 afterAuth 扩展点取得原生会话，再读取当前用户有效状态与 RBAC。SonicJS 的内置 API catch-all 先于 config.routes，因此使用公开认证后中间件组合，未修改依赖包。SonicJS 写操作保留原生 CSRF 校验，客户端发送原生 Cookie 对应的 Header。

创建器生成普通前端工程与单 Worker 后端，避免通用插件注册、业务 DSL 或运行时切换数据库引擎。源代码与 npm 版本固定、升级保护、兼容退役和未迁移能力见 [application-starter.md](application-starter.md)。


### 轻量管理与 NuxtHub（2026-11-06）

轻量模板直接使用 Nuxt UI 4.12.0 Dashboard、表格、表单、弹窗和通知。Hono 组合现有 KV 会话、SettingsRoutes、ApiKeys 和运行检查；只补消费应用所需的 HTTP 装配、命名空间、KV KeyStore 和最近审计存储。使用 KV 元数据分别存放使用时间，避免更新 lastUsedAt 时覆盖撤销状态。审计尽力写入，不宣称跨 KV 事务或强一致注销。

NuxtHub 0.10.12 的 package.json 声明 Apache-2.0，但随包 LICENSE 为 MIT（Vercel, Inc.）；保留原始许可文件并记录上游标识差异，不擅自消除歧义。Nuxt、Nuxt UI、Drizzle、SDK 均按应用自身 lockfile 固定，只安装在可选 NuxtHub 示例，未 fork 上游源码。真实使用 SQL / KV / Blob / Cache API；官方旧托管 Admin 不进入本例。各路线在同一个 Worker 中按明确路径组合，不新增代理 Worker；NuxtHub 和轻量模板不冒用 CMS 会话。

Cloudflare Node v2 的 `console.createTask` 暴露为抛错 stub，当前 Hookable 将它误判为可用调试功能。NuxtHub 的 Nitro `unenv.inject` 只在该构建中使用最小 console adapter，保留原生日志并隐藏这个非必要的 profiling 方法；不修改 Worker 全局或其他后端。升级 Hookable/Nitro 后应重新验证并评估移除。Nitro Cloudflare adapter 会在 H3 前缓存请求体，因此组合入口复用现有 `readBytesLimited` 限制写请求，不能只靠业务 handler 读取后才检查大小。

Dashboard Vue 仅作为官方模板与布局参考；业务页面由消费应用拥有，不新增嵌套 submodule。SDK 用 Git 审核提交，npm 依赖用 lockfile，源码模板用固定 commit 和 SHA，边界在技术地图中明确。


### 统一管理与创建器收尾（0.4.0）

配置、受限密钥、管理操作审计和运行检查从单管理员包装中分离为 `createManagementRoutes`，宿主提供现有身份与权限；Payload/SonicJS 不新增会话体系。任务 DO 外壳继续组合 agents Lifecycle/Scheduler、cron-schedule 和原 TaskManager，消费者声明业务定义；通过可选 `/task-worker` 入口使用，不给纯 HTTP 消费者强制引入调度依赖。界面按各方案原生组件装配，共用框架无关的操作客户端；完整令牌只在当前签发交互中显示，刷新、取消和身份重验证时清除。

NuxtHub 0.10.12 在模块 setup 中强制打开 Nitro deployConfig。自有 Worker 需要导出任务 DO，因此使用 Nuxt 原生 `nitro:config` hook 明确关闭该重定向，保留自己的 Wrangler 入口；不修改 NuxtHub 依赖源码。它可能在 close hook 提示没有自动 wrangler.json，使用的是应用自己的配置。

该版本 Nitro 的 Cloudflare adapter 只预读 POST/PUT/PATCH，DELETE 请求体仍留在平台 Request 上。NuxtHub 示例用 H3 平台上下文读取该 Request，并复用 SDK 的 8 KiB 有界读取，避免等待不会收到数据的合成 Node 流。没有修改 Nitro 包；浏览器回归覆盖笔记和文件的真实删除及超限拒绝。WorkerKit 诊断密钥也在 SonicJS 入口限定用途，避免将它误送入会在校验错误中输出输入令牌的上游 JWT 解析器。

创建器支持 16 个 CMS 组合、Nuxt UI 轻量起点及 NuxtHub 全栈起点。模板运行脚本以普通模块保存，快照升级与回滚先校验所有文件；不引入模板插件引擎、嵌套 submodule 或隐式业务覆盖。

新模板将 Tailwind、Vite/Node 适配器及 Oxide 固定为已验证的 4.3.4，避免首次安装因传递依赖浮动而与现有演示的 lockfile 不同。4.3.5 已在 npm 官方注册表发布，但本轮使用的镜像尚未完整同步；没有使用强制安装跳过依赖检查。后续升级应同时更新这一组版本并复跑新建项目检查。


## 0.5.0 增补（2026-11-07）

新管理路线采用 Better Auth 原生 D1、username/admin 插件，避免再维护用户、散列和会话引擎。SQLite DO 只承接官方库的密码工作负载与初始管理员串行化，认证算法、Cookie 和撤销仍属上游。公共 SDK 不强制安装 Better Auth，依赖仅属于实际选择该后端的示例/应用。

新增 Element Plus、Naive UI、Vuetify、Quasar、MUI Core、Mantine；直接使用 npm 原生组件。shadcn-vue 是官方 registry 的固定提交源码，保留许可证和逐文件来源/hash，不以自写仿制控件冒充。PureAdmin/Soybean 保留原生布局、主题、菜单，适配明确放在 examples；去掉假 JWT、模拟通知与未暴露的演示路由，身份和写操作来自真实后端。

演示侧栏随构建打包菜单图标。PureAdmin 与 Soybean 使用各自已有的 Iconify 图标集，Vben 使用上游已有的 Lucide，MUI 和 Mantine 通过各自的菜单组件使用仓库已有的 Ant Design 图标包。

SvelteKit/Astro 使用官方 Cloudflare adapter；React Router 使用原生 SSR、资源路由和 Context Provider；产物通过模块在同一 Worker 显式组合。共享代码仅有业务状态、接口契约、认证/绑定接线和真实测试，不创建跨框架 UI DSL。

详细清单与未采用项目的明确理由见 [项目调研](../examples/docs/alternatives.md)。原有兼容 SDK 在消费项目迁移前保留，旧 KV 认证不再作为新应用首选。


组件目录以各项目的官方文档清单为索引，构建时读取仓库内的目录数据。站内演示使用锁定版本的原生组件和本地示例数据，目录只列可在站内运行的示例，每一项附上对应的官方页面链接。shadcn-vue 的补充组件使用同一上游提交，许可证和逐文件 Git blob 记录随示例保存。目录只构建到比较站。
