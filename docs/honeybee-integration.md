# Honeybee 接入记录

2026-10-25 已在原 `~/code/honeybee` 完成管理端接入。原工作区先留存快照，再单独提交为 `2c49d01`，迁移在此基础上进行。WorkerKit 位于私有 GitHub 仓库，Honeybee 通过 `vendor/worker-kit` 固定提交，父项目保留一份 lockfile。

本次完成本地代码切换、测试与实际预览，没有部署。Honeybee README 说明其 Git 集成会在推送时部署，因此没有推送生产分支。Cloudflare 构建还需确认有权限拉取新建的私有 submodule。

## 接入范围

- 复用 AdminShell、主题、页面标题、固定滚动分区、移动抽屉与底部账户菜单，品牌继续使用 Honeybee 原图标。
- 纯 `modules.ts` 声明派生菜单、路径和操作权限；API 中心放在账户菜单。单管理员由服务端明确授予已启用操作，客户端不能自报授权。
- 删除重复布局、主题与 requestJson，使用公共请求、标准错误、401 会话失效和页面错误恢复。切换源站、离开页面会取消旧请求，保留原版本检查和三路测速并发限制。
- 复用可选 ApiCenter 和独立 ScalarReference，用 esbuild 双入口和明确 CSP 提供同源资源。没有复制另一套示例 API 界面。
- 新管理应用复用 Hono、日志、请求 ID、错误、分页与原生 hono-openapi，认证继续使用原 Honeybee 签名 Cookie。新接口配置缺失时拒绝访问，不接受旧本地免登录标记；写操作要求准确匹配的同源 Origin。

## 管理接口

| 方法与路径 | 实现 |
| --- | --- |
| GET `/api/admin/session` | 当前账户和服务端模块权限 |
| POST `/api/admin/logout` | 复用原 Cookie 删除 |
| GET `/api/admin/openapi.json` | 受保护的 9 个操作文档 |
| GET `/api/admin/history` | 有数量上限的 KV 历史索引转 PageList；省略内部键、哈希和订阅链接 |
| POST `/api/admin/history/restore` | 原恢复函数；成功只返回版本与时间，失败不伪报成功 |
| GET `/api/admin/subscription` | 原订阅缓存状态 |
| POST `/api/admin/subscription/refresh` | 原刷新和质量保护；业务拒绝检查 refresh.status |
| GET `/api/admin/nodes` | 原当前、历史或候选节点；传递选定源站 |
| POST `/api/admin/nodes/probe` | 原单节点握手测试；JSON 与体积限制 |

新 Worker 入口只分流 `/api/admin/*`。原 `/subscription`、`/cloudflare.yaml`、`/health`、`/history*`、`/node-status*` 和命名导出的 VmessProxyService 继续由原业务处理。缓存键、生产绑定、订阅 token、RPC 和流式响应保持原实现。原公共订阅刷新拒绝的状态码不变；没有为了文档新加 D1 或通用 Token。

## 安装与检查

要求 Node ≥22.12；在 Honeybee 父项目运行：

```sh
git submodule update --init --recursive
npm ci --ignore-scripts
npm ls undici zod react hono react-error-boundary
npm run doctor -- --strict
npm run check
```

不要在子模块内安装。消费项目改用 `node --test test/*.test.js`，避免 Node 误发现库自己的 workerd 测试。适配层有独立类型检查，契约检查由 esbuild 编译后运行 Node 测试器，保留动态 import 分块避免提前加载 Cloudflare sockets。

父项目 overrides 固定 Undici 7.30.1 和测试插件 Zod 4.6.7，并显式固定根 Zod。npm 曾保留插件下旧 Zod，执行 `npm update zod --ignore-scripts` 后重新 npm ci 与 npm ls 通过。React、Hono、错误边界均为父项目单份安装；子模块 overrides 不会自动应用到父项目。

通过 50 项业务测试、12 项适配检查、类型检查、严格 doctor、双入口构建和 Worker dry-run。移除的两项旧 requestJson 单元测试对应已删除的重复传输函数；公共客户端由 WorkerKit 检查覆盖，新的消费项目检查验证其与原业务错误的实际适配。

## 真实本地验收

使用原项目源码和构建产物在 5175 启动真实 Wrangler。独立配置、测试凭据和本地 KV 存放于隔离工作目录，源站为虚构 https://source.example，包含两个空节点历史夹具。没有读取原项目 .dev.vars、真实订阅和生产 KV，也不用假节点冒充真实服务。

验证登录、未登录拒绝、会话权限、历史查询与恢复、跨来源拒绝、旧接口兼容、节点、OpenAPI 和注销。浏览器确认公共布局、账户菜单、API 目录、Scalar、主题与业务状态。长页正文滚动约 257px 时 body、侧栏、顶栏不移动，页面切换后内容回顶。未配置 Cloudflare 节点明确显示不可用。

WorkerKit 自身另通过 73 项 workerd、5 项工具测试和固定 Linux 131 项 UI 回归（5 项条件跳过），没有更新视觉基准。以上不能证明真实订阅源、线上 Secrets、私有仓库授权和生产资源已经可用。

## 历史补丁

`examples/integrations/honeybee.patch` 仅保留首次独立副本试接记录，基于旧工作区和本机 submodule URL，不是当前迁移脚本。现行实现以 Honeybee 父项目源码、Git 指针和 lockfile 为准。
