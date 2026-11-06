# 快速了解

WorkerKit 为 Cloudflare Workers 提供可组合的后台基础能力。消费项目保留自己的业务页面、配置和部署资源。

## 运行统一预览

```sh
npm ci
npm run demo
```

访问 `http://localhost:5190`，切换七套应用后台与本 VitePress 文档。第一次需要构建，Vben 还需要 pnpm 11 与网络下载；后续可以 `npm run demo:preview` 使用已有构建。

## 选择界面

| 方案 | 用途 |
| --- | --- |
| Nuxt UI | 清爽的应用界面，直接组合 Vue 原生组件 |
| PrimeVue / Sakai | 表格、目录和资源管理，保留主题配置面板 |
| Vben Admin | 多标签页、布局偏好等完整后台体验 |
| Ant Design Pro | 官方 ProLayout / ProTable / ModalForm，Vite 接入示例 |
| Refine | 原生数据 provider、查询与更新流程，配套 Ant Design |
| Tabler | Bootstrap 原生应用界面 |
| AdminLTE | Bootstrap 后台布局、侧栏与明暗主题 |
| VitePress | 指南、参考文档与知识内容 |

这些示例使用通用 fixture，没有连接认证或业务接口。预览中心统一入口，八套界面独立构建；正式项目按需选用相应方案。
