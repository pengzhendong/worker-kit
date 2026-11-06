# 其他开源候选

以下为 2026-11-05 查询 GitHub 项目页的约数，star 会变化。组件库、页面模板与应用框架的统计不能直接代表相同能力。

| 项目 | Star | 技术与取舍 |
| --- | --- | --- |
| [Ant Design Pro](https://github.com/ant-design/ant-design-pro) | 38.9k | React / Ant Design 后台工程。希望复用现有 React 页面时值得优先评估，配套依赖仍需检查兼容性。 |
| [Refine](https://github.com/refinedev/refine) | 36k | React 管理应用框架，适合数据资源、查询、权限与 CRUD；需要选择并组合 UI。 |
| [Tabler](https://github.com/tabler/tabler) | 42k | Bootstrap 页面与界面套件，现成页面丰富；接入 Vue 的状态和表单需要应用侧适配。 |
| [AdminLTE](https://github.com/ColorlibHQ/AdminLTE) | 45.7k | Bootstrap 后台模板，适合偏传统后台页面的组合。 |
| [Vben Admin](https://github.com/vbenjs/vue-vben-admin) | 33.8k | Vue 后台工程，本预览已实际使用其 BasicLayout 和偏好设置。 |
| [Pure Admin](https://github.com/pure-admin/vue-pure-admin) | 20.7k | Vue 3 / Element Plus，值得作为完整 Vue 后台候选。 |
| [Soybean Admin](https://github.com/soybeanjs/soybean-admin) | 15.3k | Vue 3 / Naive UI，适合比较另一种后台视觉和组件体系。 |

[vue-element-admin](https://github.com/PanJiaChen/vue-element-admin) 约 90.1k，但[当前主分支依赖](https://github.com/PanJiaChen/vue-element-admin/blob/master/package.json)仍为 Vue 2.6.10 / Element UI 2。对新的 Vue 3 项目，不建议仅因 star 多而采用旧栈。

对于 WorkerKit：希望使用 Vue 的完整后台，继续重点看 Vben；重视视觉一致性与组件升级，优先比较 Nuxt UI 和 PrimeVue；希望少迁移现有 React 页面，再评估 Ant Design Pro 或 Refine。

## 已加入统一预览

Ant Design Pro、Refine、Tabler 与 AdminLTE 均已作为可操作示例加入。Ant Design Pro 展示官方 ProLayout、ProTable、ModalForm 的 Vite 组合，不包含完整 Umi 工程；Refine 使用其原生布局、data provider 与 useTable/useUpdate/useCreate。两者均配 Ant Design 5，因此视觉相近，重点比较交互和工程能力。

Tabler 与 AdminLTE 使用 npm 发布包中的原生样式，复用 Bootstrap Modal/Collapse 及 AdminLTE PushMenu。四套均展示通用任务、资源、日志和设置，不连接生产接口。
