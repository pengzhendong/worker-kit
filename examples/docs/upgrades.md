# 升级维护

## 包与模板分开管理

Nuxt UI、PrimeVue、VitePress 使用 npm 精确版本及 lockfile。执行 `npm outdated --workspaces` 检查更新，在升级分支更新对应 workspace 的包后重新构建验证。

Sakai 和 Vben 属于源码模板，不提供与组件库相同的升级契约。上游 commit 与压缩包 SHA-256 记录在根目录 `ui-upstreams.json`；下载校验后保存在忽略的缓存目录，示例内容单独维护。

```sh
npm run upstreams:check
npm run upstreams:sync
npm run demo:build
npm run test:ui-suite
```

`npm run check:ui-suite` 会构建 17 套界面并启动隔离的测试预览，验证后关闭；本机需要 Chrome。`npm run upgrade:check` 还包含基础检查和旧后台 Linux UI 检查，任一失败都会停止。

检查命令只报告更新，不自动改变版本。使用 `node scripts/ui-upstreams.mjs pin <name> <完整commit>` 下载并记录新校验值，审阅 manifest diff 后同步。升级模板时审阅上游差异、修改锁定版本和校验值、同步源码，再验证界面与兼容性；Sakai 跨 PrimeVue 大版本时还需同步更新配套依赖。

## 为什么没有嵌套 submodule

WorkerKit 自身可继续由消费项目作为 submodule 引用。组件库使用包管理器；预览模板用固定源码快照，避免所有消费者递归拉取后台 monorepo。需要长期修改上游核心、维护独立 fork 时，再考虑 submodule。

固定版本让构建可重现，无法保证所有上游大版本升级都零改动。遇到模板接口不兼容应停止并修复适配，不能跳过 peer 检查或自动接受截图。


## 新路线的验证

轻量模板通过 `npm run create -- ../my-worker --frontend nuxt --backend native` 建立独立项目，再安装、setup、check 和真实浏览器检查。设置 schema 与业务字段留在应用，`kit:sync` 不覆盖业务页面和部署配置。

NuxtHub 的依赖和 lockfile 在 `examples/nuxthub-dashboard/app`；使用 `npm run build:hub` 和该目录的 `npm run check`，组合后运行 `npm run test:native-hub` 验证真实存储、同源写请求、独立会话与移动界面。D1 迁移是单独步骤，不因构建成功就自动应用到线上。

展示站需要最后执行统一构建、部署 dry-run 和线上入口检查。免费套餐 CPU、首次加载和缓存后切换是不同指标，不能互相替代；按真实 Observability 数据评估。

## 自动回归与回滚

`npm run test:integration` 启动并关闭独立的本地统一 Worker，复查原有 CMS 界面和兼容后端的真实行为；执行前先运行 `npm run build:payload`，5184 端口必须空闲。它不会接管现有预览。CI 使用固定 Playwright 容器与 Chromium，本机默认使用 Chrome。

`npm run test:generated` 在临时目录创建轻量与 NuxtHub 项目，执行全新安装、setup、类型检查、构建和真实任务验证；同时检查源码快照的升级、回滚与业务文件保护。

快照项目升级前核对来源提交与摘要。`kit:sync` 只替换未修改的 vendor，并保留 `worker-kit.previous-TIMESTAMP`；需要撤回时执行：

```sh
npm run kit:rollback -- --backup worker-kit.previous-TIMESTAMP
npm install
npm run check
```

当前 vendor 或备份有修改时拒绝覆盖。回滚只恢复 SDK，页面、配置、数据迁移与 Secret 仍归应用；数据库迁移必须另行审核。submodule 项目继续用 Git 固定和恢复提交，不与快照命令混用。


## 新增方案的上游升级方式

- npm 库：在所选应用的 package.json 和 lockfile 中固定、审核升级；服务端 SDK 不导入 UI 依赖。
- Sakai / Vben / PureAdmin / Soybean：ui-upstreams.json 固定 Git commit + 压缩包 SHA256；scripts/ui-upstreams.mjs 下载校验。适配器明确保存在 examples，升级先审核原生布局、路由与依赖，再构建和浏览器验证。依赖源码缓存不可修改。
- shadcn-vue：官方 registry 源码进入应用；shadcn-source.json 记录提交、Git blob 与最终文件 SHA256。升级看源码 diff，保留应用定制；不是只执行 npm update。
- 全栈：Nuxt/Nitro、SvelteKit/adapter、Astro/adapter、React Router 各自拥有应用 lockfile。框架和官方适配器一起检查；使用原生构建 API，不在包源码里打补丁。
- 业务创建器：vendor/worker-kit 是带散列的 SDK 源码快照，kit:sync 只更新 vendor；前端业务文件、框架源码、迁移、锁文件和 Secret 属于应用。原有消费项目继续可用 submodule，二者不要同时成为同一份源码的升级入口。

因此无需把每一个 npm UI 库再变成 submodule。源码模板只固定明确的上游来源；依赖用包管理器升级，WorkerKit 共享源码使用快照或现有 submodule。

新增方案检查：`npm run test:matrix` 检查 17 × 3 个真实后端组合，`npm run test:component-libraries` 检查新增原生组件，`npm run test:standard` 检查 Better Auth、任务与权限，`npm run test:frameworks` 检查三套新增全栈。默认连接已启动的本地统一 Worker。
