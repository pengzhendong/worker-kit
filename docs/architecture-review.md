# 复用边界与开源检查（2026-10-25）

结论：当前不需要再加一套管理框架或大功能。实际缺口是 API 中心仍藏在示例应用，消费项目要复制界面。现已提取可选的接口目录与 Scalar 入口，并用 Honeybee 原项目验证。品牌支持应用图标，示例 HTML 也补上 SVG favicon。

## 已经直接使用

| 能力 | 实际依赖 | 本库保留的职责 |
| --- | --- | --- |
| 路由、中间件、安全头、Cookie | Hono | 错误契约、应用日志字段、业务认证策略与绑定适配 |
| 管理端控件、主题与抽屉 | React / Ant Design | 固定滚动分区、底部用户菜单与统一尺寸 |
| React 错误恢复 | react-error-boundary | 根部和页面组合、会话切换时重置 |
| 文档生成与浏览器 | hono-openapi / Scalar | 显式路由权限、同源请求、独立入口和会话取消 |
| 示例业务字段验证 | Zod | 运行错误转公共字段错误，Schema 由应用所有 |
| 本地绑定、类型、构建与日志 | Wrangler / Cloudflare Vite plugin | 薄配置组合、离线 doctor，不自建云存储编辑器 |

## 检查过但暂不替换

- [Hono CSRF](https://hono.dev/docs/middleware/builtin/csrf) 接受其允许的 Origin 或 Sec-Fetch-Site。现有管理写入要求准确匹配 Origin，直接替换会改变策略，保留小的同源校验器。
- [Hono Request ID](https://hono.dev/docs/middleware/builtin/request-id) 有原生中间件。当前每次生成内部 ID 并写入日志和错误体，替换几行代码却改变外部 ID 信任策略没有收益。
- [Hono timeout](https://hono.dev/docs/middleware/builtin/timeout) 负责请求超时；健康组合器要分别给多个只读依赖返回超时结果，职责不同。超时不代表中断不支持取消的绑定操作。
- [TanStack QueryClient](https://tanstack.com/query/latest/docs/framework/react/reference/QueryClient) 适合未来的共享缓存。当前查询 hook 无缓存，会话范围还负责写请求取消、身份版本与同步草稿清理，不能只用 QueryClient 替代。出现跨页面缓存需求时再接入。
- [Better Auth API Key](https://better-auth.com/docs/plugins/api-key/reference) 值得在多用户、组织或更多认证方式出现时整体评估。当前存储接口很小，示例 D1 主库读用于撤销一致性；Honeybee 沿用原 Cookie 和订阅 token，不为文档增加身份数据库。

## 本次落实

1. ApiCenter / ScalarReference 独立导出，普通 server/web 不携带 Scalar；Token 面板和认证说明由消费应用提供。
2. Honeybee 删除重复后台壳、主题和 requestJson，使用公共模块、请求和错误恢复，保留订阅、历史、节点与流式代理业务。
3. 消费项目使用 GitHub submodule 和父项目 lockfile，重新 npm ci 后验证实际依赖树与 doctor。
4. 完整比较原视觉基准，并在真实预览检查文档、主题、账户菜单与滚动。

后续按实际需要再做共享缓存、并发写入版本、跨标签身份广播、外部告警和多用户认证，不把这些待选项包装成现有生产能力。
