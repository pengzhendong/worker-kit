<div align="center">
  <img src="examples/docs/public/favicon.svg" width="112" height="112" alt="WorkerKit 图标">
  <h1>WorkerKit</h1>
  <p><strong>适用于 Cloudflare Workers 的共享后台布局、认证与运行工具。</strong></p>
  <p><a href="https://kit.pzd17.top/">在线演示</a> · <a href="#接入现有-worker">现有 Worker 接入</a> · <a href="#模块文档">模块文档</a></p>
</div>

Cloudflare Workers 的共享基础库。通过 Git submodule 引入后台布局、认证与运行工具。路由、业务页面、数据和部署配置由应用管理。

## 接入现有 Worker

在业务仓库添加 WorkerKit，并提交 submodule 指针和依赖锁文件：

```sh
git submodule add https://github.com/pengzhendong/worker-kit.git vendor/worker-kit
npm install ./vendor/worker-kit
```

已有克隆先执行 `git submodule update --init --recursive`，再执行 `npm ci`。具体接入步骤见[现有 Worker 接入](examples/docs/migration.md)。

React 后台使用 `WorkerKitProvider` 和 `WorkerKitConsoleLayout`，项目需安装 React、React DOM、Ant Design、Ant Design ProComponents 和 `react-error-boundary`。在入口导入一次 `@pengzhendong/worker-kit/web/styles.css`。

```tsx
import { WorkerKitProvider } from '@pengzhendong/worker-kit/web';
import { WorkerKitConsoleLayout } from '@pengzhendong/worker-kit/web/console-layout';
import '@pengzhendong/worker-kit/web/styles.css';
```

应用提供品牌、当前页面、菜单和账户操作。布局负责顶栏、侧栏、手机抽屉、账户弹层和折叠偏好。样式与交互见[界面规范](docs/ui-guidelines.md)。

## 新建应用

```sh
npm run create -- ../my-worker --frontend nuxt --backend hono
```

这是 Nuxt UI + Hono + Better Auth 的脚手架示例。生成项目通过 `kit:sync` 升级内置的 WorkerKit 源码快照；已有 submodule 项目通过 Git 更新指针。其他组合见 `npm run create -- --help`，安装与部署见[首次部署指南](examples/docs/guide.md)。

## 浏览演示

[线上首页](https://kit.pzd17.top/)默认打开框架演示。[ProLayout 后台](https://kit.pzd17.top/pro-layout/)和 [AdminShell 后台](https://kit.pzd17.top/compat/)共用会话、API 和数据。演示账号为 `admin / password`。

在仓库根目录执行 `npm ci` 和 `npm run dev:payload` 可运行本地展示站。入口与发布步骤见[界面演示](docs/ui-demos.md)和[升级维护](examples/docs/upgrades.md)。

## 模块文档

| 能力 | 文档 |
| --- | --- |
| 登录、请求取消、运行检查与升级 | [应用生命周期](docs/lifecycle-and-operations.md) |
| 路由、菜单与操作权限 | [模块声明](docs/modules.md) |
| API 文档、访问令牌与字段校验 | [API 中心](docs/api-center.md) · [Schema](docs/api-schemas.md) |
| 请求、依赖和平台指标 | [运行状态](docs/runtime-status.md) |
| 图片、音频、视频与虚拟列表 | [媒体组件](docs/media.md) |
| 类型检查、预检和界面回归 | [开发工具](docs/development-tools.md) · [界面回归](docs/visual-testing.md) |
| 可选模板与扩展 | [功能清单](examples/docs/features.md) |

升级时更新 submodule 指针，按需重建父项目 lockfile，然后运行应用的检查和部署 dry-run。共享库升级不会自动迁移业务数据。
