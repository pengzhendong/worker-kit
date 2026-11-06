# 组件体验

七套后台采用相同的六类体验入口，方便比较各框架的原生交互与视觉。菜单和示例场景由 WorkerKit 编排；组件来自各自上游，不代表上游模板的默认业务功能。

| 入口 | 可以试什么 | 路径 |
| --- | --- | --- |
| 表格 | 搜索、状态筛选、行操作；部分方案另有分页和列设置 | `/components/table` |
| 表单 | 必填校验、选择、数字输入、开关、保存后刷新 | `/components/form` |
| 弹窗 | 普通弹窗、确认与取消、Escape 关闭、焦点 | `/components/dialogs` |
| 文件预览 | 图片、视频、音频、文件分类及添加本地文件 | `/components/preview` |
| 布局 | 宽屏与手机布局、填充 36 张卡片、侧栏及内容滚动 | `/components/layout` |
| 主题 | 明暗切换、按钮层级、禁用态、状态色 | `/components/theme` |

表格、表单和文件预览复用任务、设置及资源页的真实演示交互，以便用同一组数据比较。保存仅影响当前浏览器，任务和文件操作仅影响本地示例。

## 打开后台

<a href="/nuxt/components/table" target="_top">Nuxt UI</a> · <a href="/prime/components/table" target="_top">PrimeVue / Sakai</a> · <a href="/vben/components/table" target="_top">Vben Admin</a> · <a href="/pro/components/table" target="_top">Ant Design Pro</a> · <a href="/refine/components/table" target="_top">Refine</a> · <a href="/tabler/components/table" target="_top">Tabler</a> · <a href="/adminlte/components/table" target="_top">AdminLTE</a>

也可在<a href="/" target="_top">统一预览中心</a>切换方案与手机宽度。

VitePress 这一页提供索引和说明；它的核心用途是文档站。后台组件示例分别运行在上面的七套应用中。
