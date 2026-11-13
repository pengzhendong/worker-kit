# WorkerKit

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

## 创建与本地预览

```sh
npm run create -- ../my-worker --frontend nuxt --backend hono
```

查看 `npm run create -- --help` 获取生成器支持的组合。新项目的绑定、Secrets 和部署步骤见[首次部署指南](examples/docs/guide.md)。

在 WorkerKit 仓库执行 `npm ci` 和 `npm run dev:payload` 可打开文档及示例。也可直接访问[新版后台](https://kit.pzd17.top/pro-layout/)、[兼容版后台](https://kit.pzd17.top/compat/)及[框架演示与文档](https://kit.pzd17.top/)。

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
