# WorkerKit 界面约定

这是共享组件与消费应用共同遵守的约定。默认值在 `src/web/design.ts`，由组件直接使用；修改公共约定时同时修改本文件、行为测试与经过人工检查的截图。业务内容、导航和数据仍由消费应用决定。

## 接入与主题

```tsx
import { WorkerKitProvider } from '@pengzhendong/worker-kit/web';
import '@pengzhendong/worker-kit/web/styles.css';

<WorkerKitProvider theme={{ token: { colorPrimary: '#315bd6' } }}>
  <Application />
</WorkerKitProvider>
```

样式表只在应用入口导入一次，负责页面 margin、字体和 box-sizing 的基础重置。`WorkerKitProvider` 使用 Ant Design 的明暗主题算法，并持久化用户选择。应用可通过标准 `ThemeConfig` 覆盖品牌 token；保持尺寸与交互约定，避免每页单独覆盖 `.ant-*` 的布局。

组件文案默认使用 Ant Design 的 zh-CN，空状态、分页和确认按钮保持中文；应用可通过 Provider 的 `locale` 属性传入其他 Ant Design locale。业务文案由消费项目负责。

浅色品牌色为 #315bd6；深色模式采用 #7c9cff 作为品牌基础色，并为实色按钮采用深色文字，保证图标、链接和按钮不会直接沿用浅色模式的低亮度蓝色。颜色定义分别在 `workerKitTokens` 与 `workerKitDarkTokens` 中。

| 项目 | 默认约定 | 执行位置 |
| --- | --- | --- |
| 基础文字 | 14 px，行高 1.6，系统字体 | `workerKitTokens` |
| 页面标题 | 28 px，标题到说明 8 px，标题区到内容 24 px | `PageHeader` |
| 常用间距 | 以 4 px 为单位，优先 8 / 12 / 16 / 24 / 32 | Ant Design spacing token 与组件 |
| 操作控件 | 默认高 32 px，小号 24 px，大号 40 px | Ant Design control token |
| 卡片圆角 | 基础 token 10 px，由组件算法派生 | `workerKitTokens` |
| 导航项 | 高 44 px，图标容器 20 × 20，图文间距 12 px，中心线对齐 | `AdminShell`、`IconBox` |
| 顶栏主题切换 | 图标按钮高 32 px，与顶栏共用垂直中心线；不重复显示账户操作 | `AdminShell` 的 Flex 布局 |
| 侧栏用户入口 | 固定在底部，按钮高 56 px，头像 32 px；头像、用户名和展开图标居中 | `AdminShell` 的账户菜单 |
| 桌面折叠侧栏 | 展开 232 px，折叠 72 px；折叠时图标居中、名称通过提示显示，底部保留头像入口 | `AdminShell`、Ant Design Sider / Menu |
| 页面边距 | ≥768 px 时 32 px，否则 16 px；内容最大宽 1440 px | `AdminShell` |
| 紧凑资源列表 | `compactContent` 使用 16 px 内容边距；`PageToolbar` 到列表也为 16 px，标题与 32 px 控件垂直居中 | `AdminShell`、`PageToolbar` |
| 紧凑混合资源 | 64 px 行高、56×40 px 缩略图；名称、作者、预览、大小和下载同行；手机使用 40×40 px 缩略图与简化操作 | `MediaList`、`MediaRow` |
| 资源卡片 | 16 px 网格间距与内边距，标题最多两行，同一行作者与操作沿底部对齐 | `MediaGrid`、`MediaCard`（可选媒体入口） |
| 文件上传 | 示例使用 88 px 横条，文件列表紧随其后 | `workerKitLayout.uploadHeight` |

消费应用可通过 `WorkerKitProvider` 的 `theme` 覆盖 Ant Design token；传入 `(dark) => ThemeConfig` 可分别提供深浅色品牌色、链接色和按钮文字色。保持品牌色相一致，并分别检查浅色背景与深色背景的对比度，避免将 logo 的亮色直接用于白底小字。

图标优先使用同一组 SVG，采用 currentColor。自定义图标组件应传递 className、style 与 aria 属性；`IconBox` 已处理导航图标的容器对齐。侧栏折叠按钮采用 18 px 圆角面板线框与竖向分隔线，不添加方向箭头；展开与折叠共用图形，由可访问名称和 Tooltip 说明动作。只有图标的按钮必须有可访问名称，必要时配 Tooltip。选中、成功、危险等状态都应有文字，不能仅用颜色表达。

`PageHeader` 操作栏统一垂直居中。复选框与按钮混排时，不拉伸复选框外层；方框、标签文字与相邻按钮的垂直中心应一致，避免方框居中而文字靠上。

业务 CSS 可使用 Provider 生成的 `--wk-color-primary`、`--wk-color-primary-bg`、`--wk-color-primary-text`、`--wk-color-primary-border`、`--wk-color-surface`、`--wk-color-text-secondary`、`--wk-color-success`。它们来自当前 Ant Design 主题，随明暗模式和品牌设置一起变化。禁止给深色模式继续套用固定浅色底。

业务文字也使用当前主题的 `--wk-font-family`、`--wk-font-family-code`、`--wk-font-size`、`--wk-font-size-sm`、`--wk-font-size-lg`、`--wk-line-height`、`--wk-line-height-sm`。正文、表头、表单标签、操作按钮、状态和主要说明默认 14 px / 1.6；时间、地址、协议徽标及附注可用 12 px，不再用 10–11 px 压缩业务信息。不要让原生 `<small>` 的浏览器默认比例把说明缩到 11.67 px。标题保留各自层级，图标尺寸不按文字字号批量替换。变量作用于 Provider 的应用容器；原生浮层在容器之外时，应用需传递当前 token 或提供相同默认值。

## 布局与滚动

应用负责在自己的 HTML 配置 favicon；演示应用与 API 文档共用本地 `/favicon.svg`。`AdminShell` 可通过 `brandIcon` 传入自己的图片或 SVG；默认显示应用名称首字母，消费项目不必覆盖框架 CSS。

- `AdminShell` 占满 100dvh，顶栏高 64 px；页面外层不产生滚动。
- 顶栏使用正常行高与直接居中的 Flex 子项，避免 64 px 行高传入嵌套包装层后造成按钮基线偏移。
- ≥1024 px 显示 232 px 侧栏。主内容独立滚动，侧栏和顶栏位置保持不变。
- 桌面顶栏的图标按钮可收起或展开侧栏，提供可访问名称、`aria-expanded` 和关联的侧栏 ID。折叠后菜单保留名称与选中状态，悬停提示完整名称，用户菜单仍可用键盘打开。偏好默认保存在当前 origin 的 `workerkit.sidebar.collapsed`，消费应用可用 `sidebarStorageKey` 指定自己的键；存储受限时仍可在当前页面切换。
- 折叠只改变桌面侧栏宽度，不卸载业务页面。手机抽屉始终显示完整菜单和用户信息，返回桌面时恢复折叠偏好。
- 矮窗口中的侧栏导航区独立滚动，品牌和底部用户入口保持固定；滚动导航不能带动主内容。
- 当前用户只显示在侧栏底部；点击向上展开账户菜单，支持键盘操作、Escape 和点击外部关闭。账户页面、设置与 API 中心入口由消费应用通过 `userMenuItems` 传入，退出调用 `onLogout`。不显示无操作的工作空间占位文案。
- 侧栏标题可通过 `navigationLabel={false}` 隐藏。`items` 可传原生层级的 `children` 与 `extra`，分组默认只展开/收起，叶节点触发导航。选中的子页面会展开其祖先，顶栏显示 `activeKey` 对应的页面名称。`menuProps` 可传 Ant Design 原生 `openKeys`、`onOpenChange`、`selectedKeys`，由业务决定手风琴、展开后默认进入首项、三级分类筛选等行为。`sidebarActions` 放置导航搜索，桌面折叠时隐藏，手机抽屉中保留。折叠栏用浮出子菜单，悬停不会触发业务的自动导航；手机展开预览保留抽屉，选择叶节点后关闭。
- 多级菜单使用 12 px 的递进缩进，二级标题与一级图标后的文字对齐，避免三级标签被挤到侧栏中央。带 `sidebarActions` 的桌面品牌区高 64 px，与顶栏对齐；搜索使用默认 32 px 控件，与内容区搜索保持相同高度。
- <1024 px 使用 Drawer 导航，底部保留相同的用户入口。内容滚到任意位置后仍能打开；主导航或账户菜单选中页面后均关闭抽屉。
- `activeKey` 变化后主内容回到顶部。
- 窄屏工具栏与表单应换行。宽表格在容器内部横向滚动，不能撑宽整个页面。

## 页面与数据状态

- 模块声明派生菜单、名称与路径；页面访问和按钮显示使用服务端返回的权限。权限尚未加载或加载失败时不挂载受保护页面；直接 URL 越权显示 403，未知或停用页面显示 404。
- 只读页面保留查询与列表，隐藏新增、编辑、删除、导出及上传等未授予的操作；没有可用操作时移除空白操作列，设置表单只读。界面隐藏不代替服务端校验。

- 公共页面标题使用 `PageHeader`，主要操作放在 actions 区，次要操作放在列表工具栏。
- 统计使用 `StatCard`；未取得数据时使用占位值，不能伪造在线状态或业务数量。
- 运行状态使用同组图标、状态文字和主题色共同表达；检查记录显示时间与结果，支持键盘聚焦。缺失的平台指标显示“—”，零请求不计算错误率；依赖检查耗时、CPU 时间与隔离环境内存分别标明含义。见 [运行状态](runtime-status.md)。
- 加载中保留明确的 Spin、Skeleton 或按钮 loading 状态，写操作避免重复提交。
- 空列表展示空状态，保留创建或上传入口；空数据不显示为请求失败。
- 请求失败展示可读错误和重试入口；有旧数据时保留旧内容。不能静默替换为“0 条”。
- 登录错误区分凭据、限流、服务与网络故障。业务 401 只触发一次会话失效，403 和网络错误保留身份；离开页面取消查询，取消不弹失败消息。
- 身份变更必须先取消旧请求、同步清理注册的用户缓存并重建权限与页面状态，保留主题偏好。不同查询参数不能短暂显示旧参数的数据。接入方法见 `docs/lifecycle-and-operations.md`。
- 页面渲染失败显示紧凑恢复卡片并保留导航，切页重置边界；根部异常提供应用恢复入口。请求与事件错误仍在调用处处理，不向用户显示堆栈。开发示例可以主动演示错误，但不写入业务数据。
- 后端字段错误通过 `getFormErrors` 映射到表单，失败时保留草稿；窄屏表单字段按行换行。批量部分失败显示数量和逐项原因，清除成功项的选择、保留失败项，写入期间避免重复提交。接入格式见 `docs/admin-contract.md`。
- 文件上传与删除等操作需要成功/失败反馈。不可恢复的删除必须确认。
- 先检查默认、加载、空、失败、窄屏和深色模式，再为新页面建立截图基准。

## API 中心

接口列表和文档共用 OpenAPI；鉴权方式与操作权限明确显示。Token 元数据表中名称列保持可读宽度，手机在表格容器内横向滚动，不能把中文挤成竖排。令牌明文仅创建后临时显示，关闭、切页和身份变更后清除，不进入 URL、截图基准或浏览器存储。

Scalar 放在独立文档中隔离样式与 hash；跟随父页主题，在线调试明确说明写请求会影响当前数据。父侧栏与顶栏保持固定，不因文档内部滚动而移动。

## 验收

演示应用左侧的“组件与交互”提供可操作的参考：页面组合、弹窗表单与确认、数据状态与消息反馈。源码在 `examples/dashboard/web/ComponentsPage.tsx`，组合了共享的 `PageHeader`、`StatCard`、布局尺寸与 Ant Design 原生组件。可搜索、批量启停、选择文件、模拟失败与重试，并通过“重置演示”还原。示例只操作页面内的临时数据，文件只展示元信息，不会上传。

修改共享界面后运行 `npm run check` 和 `npm run test:ui`。设计选择由人工判断；截图测试检查已确认的外观有没有意外变化，滚动和导航由行为断言检查。初始基准不代表最终审美已经通过用户验收。

新增公共组件时先复用现有 token 和 Ant Design 组件；只有真实消费需求重复出现后才提取新的公共封装。不为了规范引入另一套组件库或业务 DSL。

## 业务顶栏与紧凑标题

`AdminShell.headerActions` 接收应用自己的 React 节点，例如发布按钮、发布状态和刷新。按钮仍由应用处理，框架不接管业务工作流；窄屏时应用应收起次要状态文字，避免挤压导航和主题入口。

设置 `pageTitleInHeader` 后，固定顶栏使用唯一的一级页面标题，内部 `PageHeader` 仅保留说明和页面操作，不再重复大标题。该选项默认关闭以兼容已有页面；IPTV 接入采用此紧凑模式。
