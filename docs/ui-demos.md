# WorkerKit 界面示例

[统一预览](https://kit.pzd17.top/)包含 17 套界面。每套都直接使用对应的原生组件或布局，真实工作台通过相同的业务协议连接 Payload、SonicJS 或 Hono + Better Auth。组件体验里的固定数据明确标注为示例；这些页面不作为业务后端能力计算。

- Vue 组件库：Nuxt UI、Element Plus、Naive UI、shadcn-vue、Vuetify、Quasar。
- Vue 后台模板：Sakai（PrimeVue）、Vben Admin、PureAdmin（Element Plus）、Soybean（Naive UI）。
- React：MUI Core、Mantine、Ant Design Pro 组件、Refine。
- Bootstrap：Tabler、AdminLTE。
- 文档：VitePress。

使用 `npm ci` 后运行 `npm run dev:payload`，打开 `http://kit.localhost:5184/`。统一 Worker 同时提供静态资源、三套管理后端、原生 CMS 页面和全栈入口。只比较原有前端组件夹具可运行 `npm run demo`，它不启动真实业务后端。所有实际部署验证针对统一 Worker。

顶部界面标签在浏览器空闲时依次准备，绿点表示界面已就绪。只在界面选中后获取受保护的业务数据；切换后端丢弃旧身份。直接打开原生 CMS 时保留同后端准备好的界面。节省流量模式跳过自动准备。

[技术地图](../examples/docs/architecture.md)说明组件库、模板、全栈框架、后端各负责什么；[调研表](../examples/docs/alternatives.md)包含 star、接入边界和未采用原因；[升级说明](../examples/docs/upgrades.md)记录 npm 包与源码模板的不同维护方式。真实业务模板由 `workerkit create` 生成，不需要部署整套比较站。

`npm run test:matrix` 验证 17 × 3 个后端组合；`npm run test:preview-preloading` 检查空闲预加载、前台优先、取消和身份隔离；`npm run test:component-libraries` 检查新增组件的真实设置、密钥、审计和布局；`npm run test:frameworks` 检查原生 SSR、会话与 KV。
