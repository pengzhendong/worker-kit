# 管理端接入契约 v1

目标是让不同 Worker 项目复用列表查询、表单错误和操作结果的处理方式。业务继续使用普通 Hono 路由和 React 页面，数据库表、字段定义、操作权限与副作用属于消费项目。没有资源注册中心、动态页面生成器或通用查询语言。

公共类型从 `@pengzhendong/worker-kit/contracts` 导入。该入口没有 React、Hono 或存储依赖；`adminContractVersion = 1` 是契约版本，和包版本独立。TypeScript 类型只约束开发期，服务器仍必须校验请求。

## 页码列表

请求使用 `page`、`pageSize`、可选 `q`、`sort`、`order`，业务筛选字段显式声明。页码从 1 开始，默认每页 20，最多 100，最大页码 10000。服务可显式调整这些上限。搜索文本最多 100 个字符。

```ts
import { readPageQuery } from '@pengzhendong/worker-kit/server';
import type { PageList } from '@pengzhendong/worker-kit/contracts';

const query = readPageQuery(new URL(c.req.url).searchParams, {
  sortFields: ['name', 'updated_at'] as const,
  filterFields: ['status'] as const,
  defaultSort: { field: 'updated_at', order: 'desc' },
});
// query: page, pageSize, offset, q, sort, filters
```

```json
{ "items": [{ "id": "source-1", "name": "主订阅" }], "total": 25, "page": 1, "pageSize": 20 }
```

`total` 是筛选后的总数，空页使用 `items: []`。排序必须由服务端把声明过的字段映射到固定数据库列，筛选值使用参数绑定；不能把 `sort` 直接拼入 SQL。排序追加稳定的唯一键作为同值时的次序。允许的筛选值（例如状态枚举）仍由业务校验。

未知参数、重复参数、非整数或越界的分页、不支持的排序字段/方向返回 HTTP 400 `invalid_query`。不再静默裁剪无效分页值。`sort` 和 `order` 应同时提供。导出接口可复用筛选和排序，但自己的数量限制必须明确。

## 游标列表

R2 等游标数据源使用 `readCursorQuery()`，默认每页 100、最多 100，允许 `cursor` 和 `pageSize`。游标是不透明的字符串，客户端只负责保存和原样传回。请求第一页时省略游标或传空字符串。

```json
{ "items": [{ "key": "uploads/object", "name": "说明.txt" }], "cursor": "opaque-next-cursor" }
```

最后一页的 `cursor` 为 `null`。不填假的 `total`，不将当前页长度作为总数，不为展示页码额外遍历整个 R2 桶。客户端可保存已经访问过的游标来支持“上一页”。文件接口仍可附带 `maxBytes` 等业务元信息。

两类列表都使用 `items`，项目按数据源选择 `PageList<T>` 或 `CursorList<T>`。记录的主键由业务决定；文件使用 `key`，不强制改成 `id`。

## 字段校验错误

输入格式不是 JSON 使用 HTTP 400；有效 JSON 的字段校验失败使用 HTTP 422。认证失败为 401，权限或来源被拒绝为 403，资源冲突可以使用 409。所有失败保留可读文案、稳定错误码和请求 ID。

```ts
throw new ApiError(422, 'validation_failed', '请检查表单内容', [
  { path: ['name'], message: '名称不能为空' },
  { path: ['sources', 0, 'address'], message: '请输入有效地址' },
]);
```

```json
{
  "error": {
    "code": "validation_failed",
    "message": "请检查表单内容",
    "fields": [{ "path": ["name"], "message": "名称不能为空" }]
  },
  "requestId": "server-generated-id"
}
```

字段路径用数组表示，数字代表数组下标；一个路径可以有多个错误。不能在错误里回显密码、Cookie、令牌或原始请求体。HTTP 5xx 屏蔽内部错误及字段细节，不把数据库异常当成用户输入错误。

```tsx
import { getFormErrors } from '@pengzhendong/worker-kit/web';

try {
  await api('/api/admin/resources', request);
  closeDialog();
} catch (error) {
  const fields = getFormErrors(error);
  if (fields.length) form.setFields(fields);
  else showError(error);
}
```

`createApiClient` 保留状态码、错误码、请求 ID 和字段错误；`getFormErrors` 只映射 400/422 的字段信息，合并相同路径，兼容 Ant Design `form.setFields`。无效路径、原型相关路径和异常字段内容会被忽略。表单失败时保留草稿，修正后可重新提交。401/403 和全局故障仍由消费应用处理，不伪装成某个输入框的问题。

## 操作结果

单项操作成功时直接返回业务结果；无需响应体时使用 HTTP 204。任务启动可以返回 HTTP 202 和业务任务标识，但本版没有共享任务执行器。调用方不得把“任务已提交”当成“任务已完成”。

批量操作使用 `BatchResult<Id>`：

```json
{
  "succeeded": ["source-1"],
  "failed": [{ "id": "source-2", "code": "resource_not_found", "message": "资源不存在或已被删除" }]
}
```

每个去重后的请求 ID 必须恰好出现在成功或失败数组中一次。不能仅返回受影响行数，让界面误以为所有项都成功。演示接口最多接收 100 个 ID；重复 ID 去重，非法请求整体返回 400。

部分成功使用 HTTP 200，并明确返回逐项失败；整个请求认证失败、格式错误或数据库事务失败时，使用对应 HTTP 错误。演示应用的 D1 更新和审计在同一 batch 事务中，`UPDATE ... RETURNING id` 给出实际成功的 ID，不把缺失记录算作更新成功。旧 `updated` 字段暂时保留，值等于 `succeeded.length`。

界面显示成功/失败数量和逐项原因，清除成功项的选择，保留失败项；写入期间阻止重复提交。请求超时不证明写入没有发生，客户端不自动重试写请求；需要可靠重试的业务自行定义幂等性。R2/KV 和 D1 的跨存储操作不能假设存在整体事务。

## 认证、扩展与兼容

路由必须显式接入服务端认证。按钮是否显示只是界面表现；服务端始终验证会话、来源和适用的操作权限。可以保留消费项目现有的认证实现，契约不要求替换登录系统。

允许附加业务元信息，保留独立业务操作路由。JSON 日期使用带时区的 ISO 8601 字符串。当前没有多用户权限模型、多租户、动态表单或自动生成管理页面。

本次对已有示例的影响：

- 列表和文件响应结构保持兼容，新增允许的排序和分页参数。
- 资源字段校验从概括性的 HTTP 400 改为 HTTP 422 和字段错误。
- 列表查询变为严格校验；原先被忽略的未知参数和被裁剪的非法分页将返回 400。
- 批量接口增加逐项结果，保留旧计数字段。消费界面应迁移到逐项结果。
- 原有错误结构、请求 ID、认证和其他业务端点保留。

submodule 使用消费项目记录的 Git 提交固定版本。升级先阅读兼容说明、运行消费项目测试和契约测试，再更新 gitlink；不要让每次构建自动跟随共享库 main。

## 验证

`test/contracts.test.ts` 覆盖请求白名单和边界、字段错误跨 HTTP 到表单的映射、错误脱敏、实际 D1 的筛选排序分页和部分 ID 缺失、实际 R2 的游标翻页。`e2e/resources.spec.ts` 验证排序请求、后端字段错误保留草稿并重试、批量部分失败保留正确选择并显示明细。

首次现有项目试接使用 Honeybee 的独立副本，记录见 `docs/honeybee-integration.md`。生产存储和现有项目原目录不参与这些测试。
