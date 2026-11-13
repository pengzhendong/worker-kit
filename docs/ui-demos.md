# WorkerKit 界面示例

[首页](https://kit.pzd17.top/)默认打开框架演示，顶部提供[新版后台](https://kit.pzd17.top/pro-layout/)和兼容版的入口。新版使用 ProLayout。[兼容版](https://kit.pzd17.top/compat/)使用 AdminShell，两版共用账户、会话和演示数据。

[框架演示](https://kit.pzd17.top/)收录 9 套组件库、8 套后台模板和一套 VitePress 文档。前端演示默认打开表格。六项对比示例依次为表格、表单、弹窗、布局、主题和文件。各套使用自己的组件和样式。上游地址集中在 [演示目录](../examples/ui-suite/catalog.js)。

- Vue 组件库：Nuxt UI、PrimeVue、Element Plus、Naive UI、shadcn-vue、Vuetify、Quasar。
- Vue 后台模板：Sakai（PrimeVue）、Vben Admin、PureAdmin（Element Plus）、Soybean（Naive UI）。
- React：MUI Core、Mantine、Ant Design Pro 组件、Refine。
- Bootstrap：Tabler、AdminLTE。
- 文档：VitePress。

使用 `npm ci` 后运行 `npm run dev:payload`，打开 `http://kit.localhost:5184/`。本地后台使用 `admin` 和 `examples/payload-dashboard/app/.env` 内的 `DASHBOARD_ADMIN_PASSWORD` 登录。统一 Worker 提供前端演示、三套管理后端、原生 CMS 页面和全栈示例。只启动前端预览入口和本地示例可运行 `npm run demo`。

预览默认打开「组件库」。用左上方的类别选择器切换组件库、后台模板、文档或后端，各类别会记住当前选择。顶部的「官方演示」在新标签页打开当前项目的上游示例。选择任一组件库后，可以从左侧第一项打开「组件目录」，按名称和用途搜索并直接操作组件。浏览器空闲时依次载入本站演示，绿点表示页面已载入。节省流量模式跳过自动载入。

各套表格使用相同的三条任务，支持搜索、启用状态筛选、分页、开关和模拟运行。表单使用相同的六项设置，保存结果按界面留在当前浏览器。各套文件页共用图片、音频和视频样本，也可选择本地文件预览。

「后端」为 Payload 和 SonicJS 各提供一个入口。登录后，从各自后台的「应用运维」进入任务、设置、密钥和审计。离开后端时移除对应页面，返回时重新读取当前会话。开发和验收用的本地示例可直接打开，例如 `/quasar/components/table` 和 `/nuxt/workspace`。

[技术地图](../examples/docs/architecture.md)说明组件库、模板、全栈框架、后端各负责什么；[升级说明](../examples/docs/upgrades.md)记录 npm 包与源码模板的不同维护方式。真实业务模板由 `workerkit create` 生成，可用 `--frontend primevue` 选组件库起点，或用 `--frontend sakai` 选 Sakai 模板，不需要部署整套比较站。

`npm run test:matrix` 验证 18 × 3 个后端组合。`npm run test:preview-preloading` 和 `npm run test:preview-switching` 验证本地演示、官方跳转、预加载、页面复用和后端会话。`npm run test:component-libraries` 检查真实设置、密钥、审计和布局。`npm run test:frameworks` 检查原生 SSR、会话与 KV。
