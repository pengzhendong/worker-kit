# WorkerKit 0.5.0 验证记录 · 2026-11-07

比较站：<https://kit.pzd17.top/>。同一个 `worker-kit` 服务承载主站与 SonicJS 子域。最终生产版本 `6114f7be-08bb-4ba3-818e-b889df055d5f`。本次新增认证数据库，仅应用自己的 Better Auth 初始迁移；既有 CMS、NuxtHub 及任务存储沿用原绑定。

| 检查 | 实际结果 |
| --- | --- |
| 17 套 UI × 3 个后端 | 本地 workerd 与线上共 51 种组合分别通过浏览器验证；实际登录并读取工作台，不以 HTML 200 代替 |
| 新增九套界面 | 原生设置表单、一次显示的密钥签发和撤销、审计、Scalar 参考文档、手机宽度；三个组件示例另查独立内容滚动、抽屉、弹窗和主题 |
| Better Auth | 空库创建首个管理员，原生用户名/密码认证、D1 会话撤销、公开注册关闭、原生 Admin API 创建只读用户、服务器权限拒绝；公开站额外保护共享演示账号 |
| SvelteKit / Astro / React Router | 线上 SSR、浏览器交互、真实 KV 读写、登录拒绝、来源限制、大小限制、手机布局通过；记录还原。网络较慢时在交互就绪前禁用表单 |
| NuxtHub 与旧入口 | 保留原生 CMS 能力；本地 NuxtHub 登录、独立身份、真实 SQL、KV、Blob 与缓存、管理功能及移动端检查通过 |
| 独立项目 | 9 个新增前端生成后安装并构建；Hono、SvelteKit、Astro、React Router 完成独立安装、setup、类型检查、构建、Wrangler dry-run |
| 预加载 | 原有和新增共 17 套验证顺序准备，最多同时准备一套，无后台业务读取；已准备的 16 个非首选标签首次切换无需新文档，本地界面切换 46–137 ms |
| SDK 与兼容 UI | 104 个 workerd 测试、18 个工具测试通过；Linux 兼容套件 201 通过、10 跳过，3 个并行时序用例单独复查，桌面与手机合计 6 个通过，未更新截图基准 |
| 生产构建 | Worker 29,498.75 KiB 未压缩、6,260.38 KiB gzip；生产配置 dry-run 与真实部署完成。静态资源独立交付 |

本次在线请求验证覆盖上述真实路径；浏览器和 HTTP 耗时是端到端时间，不用来推断 Worker CPU。免费套餐的配额及 R2 启用条件见[调研与接入结论](../examples/docs/alternatives.md)。

复查命令：`npm run check`、`npm run test:ui`、`npm run test:matrix`、`npm run test:component-libraries`、`npm run test:standard`、`npm run test:frameworks`、`npm run test:preview-preloading`。浏览器集成命令默认使用已启动的本地统一 Worker。演示写入用例会还原配置、撤销测试密钥或暂停测试任务。
