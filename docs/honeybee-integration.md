# Honeybee 首次接入验证

本次只在 `~/Documents/Codex/2026-10-24/you-sh/work/honeybee-contract-check` 的独立副本验证。原 `~/code/honeybee` 有未提交的前端与其他改动，复制时保留了当时的工作区状态，没有修改原目录、原 Git 状态、认证配置或部署。没有访问真实订阅源和生产 KV。

## 接入范围

- 在消费项目根目录增加 `vendor/worker-kit` Git submodule，父项目使用 `file:vendor/worker-kit` 依赖和一份自己的 lockfile；最新复验固定在共享库提交 `1371db7`。工具链要求 Node ≥22.12。
- 通过独立 Worker 入口增加 `GET /api/admin/history` 和 `POST /api/admin/history/restore`；其他请求及 `VmessProxyService` 继续交给原 Worker。
- 原认证模块只导出已有的 `getAuthConfig` 与 `isAuthenticated`，供适配层复用。新端点沿用 Honeybee 的签名 Cookie 和来源检查，不替换登录系统，也不沿用旧的本地免登录开关。
- 新列表将 Honeybee 原有的、有数量上限的历史索引转换为 `PageList<T>`，支持页码、搜索和声明过的排序。没有扫描整个 KV；响应省略内部 KV 键、哈希和订阅链接。
- 恢复操作调用原来的 `restoreHistorySnapshot`，失败返回标准错误，成功只返回版本 ID 与恢复时间。旧 `/history` 和 `/history/restore` 保持原有响应和行为。
- 消费应用的历史选择器改用共享 `createApiClient` 和新的列表类型，仍显示最近十个版本。旧恢复按钮继续使用原业务响应；本次没有迁移整个 Honeybee 控制台。

## 实际发现的问题

原 `node --test` 会递归发现 submodule 下的库测试，以及命名包含 test 的脚本。这些测试需要库自己的 workerd 环境，不能由消费项目的 Node 测试器运行。副本改为 `node --test test/*.test.js`，共享库和消费应用各自运行自己的检查。

WorkerKit 提供的是 TypeScript 源码入口，由 Wrangler/Vite/esbuild 编译。Honeybee 的新增适配代码用独立 tsconfig 检查，契约测试由 esbuild 编译后在 Node 中运行。测试保留动态 import 分块，避免 Node 提前加载 Cloudflare sockets；真实 Worker 构建和 dry-run 使用 Cloudflare 的原生环境。本地源码 file 依赖会把共享库的开发工具信息纳入父项目 lockfile，本次没有另建子模块安装目录或第二份消费项目 lockfile。

升级复验还检查了父项目实际安装树：WorkerKit 的 overrides 不会自动应用到父项目。副本同步 Miniflare/Undici 与测试插件/Zod 的补丁约束，并显式把 Zod 4.6.7 固定为父项目开发依赖；只加 overrides 时曾仍提升旧版 Zod，`npm ls` 会报告 invalid。重新 `npm ci --ignore-scripts` 后，`npm ls undici zod` 正常，实际分别为 7.30.1 与 4.6.7；React、Hono 和错误边界各使用父项目的一份安装。

## 验证方法

在副本根目录运行：

```sh
npm ci --ignore-scripts
npm ls undici zod
npm run typecheck:workerkit
npm test
npm run test:workerkit
npm run build:admin
npm run build:workerkit
npx wrangler deploy --dry-run --config wrangler.workerkit.jsonc
```

配置文件是无真实域名和资源 ID 的独立检查配置；上面的最后一步只进行 dry-run。不能直接把检查配置作为生产配置。

验证包括 52 项 Honeybee 原测试，以及 7 项新增契约接入检查：已有 Cookie 互通、未登录与篡改会话拒绝访问、列表筛选排序分页、字段错误到表单辅助函数、真实旧业务函数的历史恢复、跨来源和不存在记录的失败结果、旧接口兼容。

新增接入测试调用副本里的实际 Honeybee 业务与认证代码，KV 使用内存替身，不涉及生产数据。WorkerKit 自身另有真实 workerd/D1/R2 测试。

## Wrangler 本地与浏览器复验

2026-10-25 另用独立配置在本地 5175 端口启动实际 Wrangler。`.dev.vars` 仅包含专用测试凭据和虚构源站 `https://source.example`，没有本地免登录开关。用 Wrangler 向副本的本地 KV 写入两个空节点历史夹具，不读取原项目凭据、真实订阅或生产 KV。

真实服务检查包括：未登录 401；原 Honeybee 签名 Cookie 登录；新接口列表的分页、排序和安全字段；新恢复接口写入本地 KV 后当前版本更新；旧 `/history` 继续返回原格式；跨来源恢复返回 403 且当前版本不变。浏览器确认原控制台能加载两条历史、切换选择，刷新后显示恢复后的当前版本。Cloudflare 节点因未配置而显示未配置状态，没有用假节点冒充可用服务。验收后已停止这个临时服务；WorkerKit 的 5173 预览继续运行。

这补齐了独立副本的真实运行验收，仍不能替代正式切换时的生产配置、真实订阅和流式代理检查。

## 补丁与下一步

接入补丁在 `examples/integrations/honeybee.patch`，基于 2026-10-24 当时的本地工作区快照，包含 submodule、父项目依赖、薄适配层、前端调用和测试；现已更新到上述固定版本与依赖补丁。它尚未应用到原 Honeybee 仓库。新版补丁已在匹配快照的另一份干净副本通过 `git apply --check`。实际应用前仍应在匹配的工作区副本检查。

WorkerKit 尚未建立远程仓库，所以验证副本的 submodule URL 使用本机仓库路径。发布远程仓库后应替换 URL，并保留经过验证的 Git 提交固定版本。正式迁移还需将新入口与实际 Wrangler 配置合并、进行浏览器验收，再单独部署。
