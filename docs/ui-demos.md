# 后台界面方案示范

七套后台使用相同的通用数据，并与 VitePress 一起整合到统一预览站，供比较视觉与交互；尚未作为 WorkerKit 公共 Vue 组件 API 发布，也没有迁移消费项目。示例没有连接认证或业务 API，不可作为生产后台直接部署。

| 方案 | 启动 | 构建 |
| --- | --- | --- |
| Nuxt UI 4.12.0 + Vue/Vite | `npm run dev:nuxt`，localhost:5180 | `npm run build:nuxt` |
| PrimeVue 4.5.4 + Sakai / Aura | `npm run dev:prime`，localhost:5181 | `npm run build:prime` |
| Vben BasicLayout + Ant Design Vue | `npm run dev:vben`，localhost:5182 | `npm run build:vben` |

根目录先 `npm ci`，各启动命令使用独立终端。端口冲突时报错。Nuxt UI 和 PrimeVue 依赖仅在示例声明，保留父项目 lockfile；服务端与公共运行时不增加 Vue 依赖。

## 统一预览与升级

`npm run demo` 构建并启动 http://localhost:5190 。入口可切换八套原生界面和桌面/手机宽度；每套也可独立打开。产物位于 `dist/ui-suite`，分别挂载 `/nuxt/`、`/prime/`、`/vben/`、`/pro/`、`/refine/`、`/tabler/`、`/adminlte/`、`/docs/`。VitePress 走默认主题，版本 1.6.4（稳定版）。

`npm run demo:build` 只构建，`npm run demo:preview` 使用已有构建。七个后台依然是通用示例，没有接入生产接口。新增 `@pengzhendong/worker-kit/client` 复用已有 API 客户端和会话原语；React、Vue 和文档组件可共享此无组件框架依赖的入口，不强制安装所有界面。

升级采用混合方式：组件库走 npm 精确版本/lockfile；源码模板走 `ui-upstreams.json` 固定 commit + SHA-256。`npm run upstreams:check` 只报告上游更新；`node scripts/ui-upstreams.mjs pin <name> <完整commit>` 下载并更新校验值；审阅 diff 后 `npm run upstreams:sync`，再构建和测试。更新 Vben 依赖锁使用 setup 的 `--install --update-lockfile`。Sakai 固定同步上游文件清单，品牌/菜单/页面独立维护；导航可访问名称适配遇到上游结构变化会失败，要求人工审阅。

WorkerKit 自身仍可作为消费项目的 submodule；此处不新增嵌套 submodule。只有需要长期维护上游 fork、修改其核心时，才建议改用 submodule。此方案可追踪、可复现，但不保证上游大版本零改动升级。

## 可操作的内容

- 概览：示例指标、时间范围切换、服务状态与最近执行。
- 任务：搜索、启停、模拟执行、新建及名称校验；执行后可以跨页查看日志。
- 资源：分类、搜索、图片与音视频预览、本地文件选择。文件不上传；刷新恢复示例。
- 日志：搜索、级别筛选、导出 JSON。
- 设置：表单、开关、浏览器本地保存；七套使用独立的存储键。
- 原生明暗主题、桌面侧栏与手机导航。Sakai 保留主题配置面板，Vben 保留标签页及布局偏好。

`examples/ui-demo/fixtures.json` 维护通用 fixture；`data.ts` 提供 Vue 适配，`store.js` 提供 React/Bootstrap 示例的本地交互状态。禁止在整份 fixture 中加入真实应用名称、域名、账户、生产状态或业务数据。统计数字均为示例。

## 上游与隔离

Nuxt UI 直接组合官方 Dashboard 组件，参考 https://github.com/nuxt-ui-templates/dashboard-vue 。使用 TypeScript 6.0.3；`typecheck.cjs` 显式选择此编译器，避免 hoisted vue-tsc 误用根目录原生 TypeScript 7。

Sakai 布局、配置面板和 SCSS 来自 https://github.com/primefaces/sakai-vue 的 `ec6b6ef53ad4fa7f2861277f50f2d9e236c40372` 及 sakai-assets 的 `eaa70ece4cfa9aeb8f60b36dce5a422b6bae8003`。保留 `examples/prime-dashboard/LICENSE.sakai.md`。消费示例替换品牌、菜单与内容，补充导航可访问名称及内容区独立滚动；固定使用模板声明的 PrimeVue 4 系列。

Vben 来自 https://github.com/vbenjs/vue-vben-admin 的 `26706d65c9401a7818cf83369081c26b68990ef7`。启动脚本校验下载到 gitignored 的 `.wrangler/ui-upstreams/vben-<commit>`，再生成 `.wrangler/ui-build/vben-<commit>` 工作目录，复制本目录 app 与通用 fixture，只安装使用到的 workspace 闭包。保留独立 pnpm lockfile 和 `examples/vben-dashboard/LICENSE.vben`；整个上游 monorepo 不加入 WorkerKit npm workspace。

Vben 只在生成的工作目录调整安装清单及 Tailwind 扫描范围，原始快照保持独立，复用官方 reference 插件与 BasicLayout，避免扫描无关上游应用和文档。使用 pnpm 11（本次 11.25.0）、registry.npmmirror.com，首次启动需网络。安装跳过上游脚本，不注册 git hooks。更新锁使用 `node examples/vben-dashboard/setup.mjs --install --update-lockfile`。

这些均为 MIT 开源试点。没有添加公共封装或替换现有 React 示例；确定方案后，再提取真实重复需求和会话适配，继续复用上游原生组件。

## 验证

三套构建通过。启动三个预览后，`npm run test:ui-demos` 使用本机 Chrome 验证任务搜索与跨页执行日志、视频播放与关闭、设置刷新持久化、明暗切换、390px 手机无横向溢出及导航。三套均通过，未出现未捕获的页面异常；截图在 gitignored 的 `test-results/ui-demos/`，不作为跨系统截图基准。

根目录 `npm run check` 通过（88 项基础测试、8 项工具测试、类型、构建和部署 dry-run）。旧后台固定 Linux UI 检查已运行，在开始本次工作前已有修改的 `examples/dashboard/web/ComponentsPage.tsx` 对应组件页出现行为和截图失败；没有修改该文件或接受新截图基准，不能将旧后台全量 UI 检查标为通过。

统一站点运行时执行 `npm run test:ui-suite`，验证 iframe 内八套页面、子路径与刷新、任务日志、视频 Range 加载和缺失资源返回 404。它验证真实构建产物；`test:ui-demos` 则检查独立开发预览。截图保留在 `test-results/ui-suite/`。其他候选及 star 对比见预览文档中的“其他开源候选”。

## 新增的四套界面

| 入口 | 官方依赖 | 集成边界 |
| --- | --- | --- |
| `/pro/` | ProComponents 2.8.10 / Ant Design 5.29.3 | 直接组合 ProLayout、ProTable、ModalForm；Vite 构建，不是完整 Umi 模板副本 |
| `/refine/` | Refine Core 5.0.12 / Ant Design 适配器 6.0.3 | ThemedLayout、真实内存 data provider、useTable/useUpdate/useCreate |
| `/tabler/` | Tabler Core 1.7.3 / Bootstrap 5.3.8 | 原生 CSS 布局与 Bootstrap Modal/Collapse |
| `/adminlte/` | AdminLTE 4.10.0 / Bootstrap 5.3.8 | 原生 CSS、PushMenu 及 Bootstrap 弹窗 |

上述发布包的许可证均为 MIT，通过两个独立 workspace 使用父项目 npm lockfile；没有增加 submodule 或公共运行时 peer，也不更改原有 Ant Design 6 示例。两个 React 方案固定使用兼容的 Ant Design 5，避免忽略 peerDependencies。框架原生布局仍负责响应式侧栏；React 示例为手机菜单增加可访问按钮，复用 ProLayout 受控 collapsed 和 Refine 官方布局 context。

七套后台共用 fixtures.json，Vue 以 ref 包装，新增 React/Bootstrap 示例只维护最小本地模拟状态。Refine 的任务查询、分页、过滤、创建和更新经过真实 data provider。所有文件仅在浏览器本地预览，设置分别存储，不含真实消费项目名称。

## 同一组组件体验

七套后台均增加 `/components/table`、`form`、`dialogs`、`preview`、`layout`、`theme` 入口，目录定义在 `examples/ui-demo/component-pages.json`。这只是示例导航元数据；组件实现保留在各框架应用内。表格、表单和文件预览直接复用各应用的任务、设置和资源页，弹窗、布局和主题使用各自原生组件。VitePress 的 `/components` 提供说明索引。

这些场景由 WorkerKit 编排，既不是各模板自带的业务菜单，也不依赖任何消费项目。布局页可填充 36 张卡片，弹窗页可比较确认、取消、Escape 与焦点，主题页可实际切换明暗。

Vben 的手机菜单状态由原生布局内部持有。演示包装层在路由跳转后触发其 `data-layout-region="sidebar-mask"` 原生关闭动作；没有改上游源码。升级后由手机菜单跳转测试验证这一适配。

## 单 Worker 的 WorkerKit + Payload 后台

`npm run dev:payload` 启动统一入口 http://kit.localhost:5184/ 。顶部可在八套 UI、Payload 和 SonicJS 之间切换，所有前端资产与后台 API 都放进同一个 Worker；`/admin` 保留原生后台独立入口。使用 Payload 原生后台、OpenNext 生产包与本地 workerd，实际连接本地 D1/R2，包含统一登录、角色权限、用户、媒体、演示记录与 WorkerKit 运行台。Hono 业务接口及 scheduled 事件与 Payload 在同一个 Worker 内运行，不使用多个 Worker 或 Service Binding。统一构建会先编译八套 UI，再将产物合并到 OpenNext 的 Static Assets；不需要另起 5190 预览服务。各 UI 的源代码与依赖仍独立，不会默认给所有轻量消费项目安装 Next.js。八套 UI 原有任务、日志等仍是样例；真实内容与运维使用 Payload，尚未把所有演示页改造成同一套业务页面。使用方式、兼容适配和免费套餐验证边界见 [Payload 示例](../examples/payload-dashboard/README.md)。

SonicJS 3.0.0 通过 npm 固定版本接入同一 Worker，按 `sonic.kit.localhost:5184` 分流以保留其根路由；Payload 保留 `kit.localhost:5184`。两套 CMS 分别登录和存储，初次预览账号相同，切换后各自会话保留。详见整合示例 README。

预览中心先加载当前界面；首屏布局和数据完成后，在浏览器空闲时逐个预加载其余前端，最多同时预加载一套。八套实例在本轮预览中保留。重复点击当前标签不刷新；切回已挂载的工作台时，通过浏览器原生 `postMessage` 通知其重新读取受原生认证保护的业务接口，先清空旧业务数据并显示已挂载的布局，再异步刷新数据。只接受父窗口及其来源匹配的通知；重新查询失败时展示错误或登录入口，不展示旧权限和业务数据。切换后端、进入原生 CMS 时丢弃旧实例；组件演示页保留原有路由和交互状态，原生 CMS 或收不到刷新确认时重新加载。预览选择器不进入生成项目；刷新通知仅在嵌入父窗口时启用，不缓存 API 响应或修改 CMS 会话。`npm run test:preview-switching` 验证复用、内存上限、退出登录、快速切换、手机模式及后端隔离，可用 `PAYLOAD_PREVIEW_URL`、`SONIC_PREVIEW_URL` 指定已部署的演示站点。

预加载只准备框架、样式与组件，不读取后台业务数据；首次点入时再重新读取原生认证接口。鼠标悬停或键盘聚焦会优先准备对应界面，前台点击会中断无关预加载；切换后端会取消旧来源的预加载。原生 Payload/SonicJS 页面不预加载，页面进入后台或浏览器启用 Save-Data/2G 时暂停；`?preload=off` 可关闭自动预加载。`npm run test:preview-preloading` 验证首屏优先、单并发、零后台业务读取、首次点击复用、意图优先、前台抢占、后端隔离和节流偏好。

顶部前端标签用固定大小的状态标记展示进度：灰圈为等待，转圈为准备中，绿点为界面已就绪，叹号为预加载未完成（仍可点击正常加载）。悬停说明与屏幕阅读器描述同步更新，区分界面资源准备和业务数据刷新；关闭/暂停预加载也有说明。标记不改变顶部高度，窄屏仍在标签栏内部横向滚动；减少动态效果偏好会停止转圈动画。状态直接跟随 iframe 加载和就绪消息，切换后端后重新计算。

选择器源码在 `examples/ui-suite/` 分为 HTML、样式、方案/状态文案与预加载控制器。独立预览和单 Worker 构建共用 `scripts/render-preview-shell.mjs`，通过现有 Vite 在构建时打包，再内联成同一个 HTML；源码拆分不会增加选择器的阻塞请求。布局就绪与业务刷新确认仍走同一套来源校验协议。

切换性能分别记录 `shellMs`（布局显示）和 `ms`（业务数据到达），不把缓存命中的布局时间当成首次加载时间。2026-11-06 线上验证：已打开前端及组件页切回约 50–100 ms，工作台数据随后约 0.8 秒完成刷新；首次打开仍需下载和初始化框架。读取业务数据设有 15 秒超时；旧请求晚于下一次激活才返回时丢弃结果，避免重新显示旧身份的数据。测试还会刻意挂起一次已登录响应，在期间退出登录，确认切换不被挂起请求阻塞，也不会显示旧数据。

八套工作台正文各保留一个大标题；Pro/Refine 复用外层页面容器的标题，业务组件只渲染操作栏和内容。工作台说明与页脚标明当前后端数据，浏览器演示说明只用于组件示例页。窄屏状态栏允许换行。`npm run test:workspace-layout` 检查八套前端 × 两个后端 × 桌面/手机的 32 种组合：标题数量与位置、文案、刷新入口及横向溢出，并输出截图供人工检查。

统一部署的构建脚本为各前端 `assets/` 中带内容哈希的 JS/CSS/字体生成 Cloudflare 原生 `_headers` 长期缓存规则，通过 `run_worker_first` 的排除模式直接交给 Static Assets，HTML 仍由 Worker 注入后端信息。SonicJS 登录页与仪表盘常用的 Tailwind 3.4.17、HTMX、Alpine、Chart.js 和 Inter 字体也随同一个 Worker 发布：版本、下载源、SHA-256 与许可证在 `examples/payload-dashboard/sonic-assets.json`，构建校验摘要后复制资源；`HTMLRewriter` 只替换固定的公共资源 URL，保留原生业务脚本、路由、表单和会话。首次构建需要下载，之后使用本地校验缓存；上游资源改变时构建失败，不静默回退到外部 CDN。HTML、CMS 与 API 不使用这些长期缓存规则。

`node scripts/check-static-assets.mjs` 在浏览器中阻断外部来源验证 SonicJS 原生登录、仪表盘、图表及字体，再检查八套前端的缓存头与刷新时脚本实际复用情况。运维接口在单个 Hono 请求内复用已经校验的 principal，避免同一请求重复读取 RBAC；下一次请求仍重新校验身份与权限，不做跨请求权限缓存。统一 Worker 启用 Smart Placement，交给 Cloudflare 根据实际流量分析后台位置；这需要平台采样，不能将启用配置等同于已经得到加速效果。
