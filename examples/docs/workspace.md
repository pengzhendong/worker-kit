---
title: 业务工作台
---
<script setup>
import Workspace from './Workspace.vue'
</script>

# 业务工作台

查看当前后端的任务、运行记录与依赖状态。VitePress 适合文档与轻量交互页面。

<Workspace />

## 在 VitePress 页面读取 Worker API

在 Vue 组件的 `setup()` 中使用 `deferUntilMounted`，可以在浏览器挂载后读取同源 API。VitePress 预渲染时只输出初始加载状态。

```vue
<script setup>
import { createApiClient } from '@pengzhendong/worker-kit/client'
import { useApiResource } from '@pengzhendong/worker-kit/vue'

const { data, busy, error, refresh } = useApiResource(
  createApiClient(),
  '/api/workerkit/runtime',
  { deferUntilMounted: true },
)
</script>

<template>
  <button :disabled="busy" @click="refresh">刷新</button>
  <p v-if="busy">正在读取运行状态…</p>
  <p v-else-if="error" role="alert">{{ error }}</p>
  <pre v-else>{{ data }}</pre>
</template>
```

`./client` 和 `./vue` 不需要组件库。`./vue/runtime-overview`、`./vue/console-login` 和 `./vue/console.css` 适用于使用 Nuxt UI 的控制台。
