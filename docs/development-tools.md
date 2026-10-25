# 开发工具目录

启动 dashboard 后，左侧“开发工具”（`/#tools`）介绍已有能力及其使用场景。它属于示例应用，没有向共享库增加工具注册系统或存储编辑器。

## 本地调试

| 工具 | 用途 | 当前入口 |
| --- | --- | --- |
| Local Explorer | Cloudflare 原生本地调试控制台 | `/cdn-cgi/local/explorer/` |
| D1 | 浏览表、编辑记录、执行 SQL | `DB` 绑定面板 |
| KV | 浏览和编辑键值，查看元信息 | `SETTINGS` 绑定面板 |
| R2 | 浏览对象、查看元信息、上传和删除文件 | `FILES` 绑定面板 |
| 请求追踪 | 查看请求执行、绑定调用及耗时 | Explorer 的 Traces |
| 事件与日志 | 查看请求事件与 Worker console 输出 | Explorer 的 Events |
| Worker 调试器 | 断点、变量与逐步执行 | `/__debug` |
| Explorer API | 查看 OpenAPI 定义，供脚本或 AI 工具调用 | `/cdn-cgi/local/explorer/api` |
| 服务健康检查 | 检查 Worker 响应与服务标识 | `/health` |

链接在新标签打开，不自动执行查询或修改数据。原生存储面板连接当前开发服务器的本地数据，编辑会改变预览数据。运行日志与应用中的业务操作日志用途不同；健康接口也不能证明所有存储均正常。

绑定名来自当前 dashboard 的 Wrangler 配置，消费项目更改绑定时应同步调整自己的工具链接。原生面板由当前 Cloudflare 开发服务器提供，入口可能随工具版本变化，升级时需重新检查。使用说明见 [Cloudflare Local Explorer](https://developers.cloudflare.com/workers/local-development/local-explorer/)。

Worker 调试器入口会跳转到 Cloudflare DevTools 网页并连接本地调试端口；需要浏览器能够加载该网页。已确认入口会跳转到 DevTools，本次没有验证断点和逐步执行。

## 项目工具

页面列出仓库根目录可运行的命令，说明用途并提供复制按钮；页面本身不会执行终端命令。

- `npm run check`：类型生成、TypeScript、workerd 测试、构建、生产页面排除检查、部署 dry-run。
- `npm run doctor`：离线检查依赖、submodule、绑定、迁移文件与观测配置，不读取 Secrets、不执行安装或迁移。
- `npm run upgrade:check`：完整 check 后执行正常视觉比较，不更新基准、不部署。
- `npm run test:ui`：固定 Linux 浏览器的界面与交互回归，需要 Docker。
- `npx playwright show-report`：查看测试结果、失败截图、差异图与 trace。
- `npm run types`：重新生成绑定类型。
- `npm run build`：构建 Worker 和前端。
- `npm run deploy:dry-run`：构建后检查部署产物，不发布。

同页提供资源管理、系统设置、文件管理、操作日志、组件与交互的说明及应用内跳转，方便对照业务管理功能与原生调试工具。

## 模块与权限

展示实际模块 ID、页面路径、菜单位置与顺序、访问条件，以及当前服务端授予的逐操作权限。可以跳转到已授权页面，不在此编辑权限或模拟用户身份。声明与接入方式见[模块与权限](modules.md)。

## 按需扩展

Durable Objects 的 SQLite 面板、Workflows、邮件、定时任务和 Flagship 特性开关均列出用途与前置配置。当前示例没有配置这些能力，卡片明确显示“当前未配置”，不提供假入口。确有业务需要时，由消费项目使用 Cloudflare 原生绑定和处理函数接入。

线上资源管理提供 Cloudflare 控制台链接，具体账户和资源由使用者选择。

## 运行与恢复

第五个页签展示当前会话与请求策略，提供受权限保护的 D1/KV/R2 限时只读诊断、局部渲染错误与重试演示、原生指标和日志入口，以及操作日志保留策略。初始不伪造连接结果，不后台轮询。保留策略默认关闭，启用后清理也需要权限和明确确认，每次最多 1000 条；不会自动删除。

健康探测、错误边界和预检的适用范围见[应用生命周期与运行检查](lifecycle-and-operations.md)。

API 中心是正式应用模块，提供接口列表、文档与访问令牌；与仅开发环境提供的工具目录分开。详见[API 中心](api-center.md)。

## 开发与生产边界

开发页面使用 `import.meta.env.DEV` 条件加载，生产中不显示导航，不保留对应页面或本地调试链接。构建后的 `scripts/check-production-ui.mjs` 检查前端产物，发现开发页面或调试地址时使 `npm run check` 失败。

UI 测试在桌面浅色、桌面深色、手机浅色下检查五页签截图、链接目的地与新标签属性、命令、模块声明、恢复行为和未配置状态，以及应用内跳转。原生面板需要实际 Workers 开发服务器，独立前端测试不代替原生入口验收。

D1 迁移以完整文件名作为应用记录。历史文件同号时 doctor 提醒检查顺序，默认警告，`--strict` 下仍失败；空文件和缺少编号仍失败。不要为消除警告给已应用的迁移改名，否则可能被当作未应用迁移。IPTV 的两份 `0002_*` 已通过隔离库按原名完整应用验证。
