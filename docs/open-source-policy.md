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
