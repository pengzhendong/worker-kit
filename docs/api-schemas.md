# 接口 Schema 与契约检查

演示应用使用 Zod 4.6.7 定义业务字段，在 `examples/dashboard/server/schemas.ts` 集中维护。运行时使用原生 `safeParse`，OpenAPI 使用原生 `z.toJSONSchema` 转换同一个对象，继续交给 hono-openapi 和 Scalar 展示。没有另建路由 DSL，也没有要求共享 server 的消费者安装 Zod。

## 已统一的范围

| 接口 | 共用规则 | 保留的 HTTP 行为 |
| --- | --- | --- |
| POST/PUT 资源 | 名称、类型、状态、地址和描述 | 非对象 400；字段错误 422；保存前修剪名称；16KB 上限 |
| POST 资源批量操作 | 1–100 个有效 ID、启停状态 | 无效请求 400；去重；逐项返回成功与失败 |
| PUT 设置 | 同一份字段 Schema 派生部分更新描述；合并已有值后校验完整设置 | 未声明键或通用类型错误 400；业务范围错误 422；校验失败不写 KV |
| POST API Key | 名称、权限数组、整数有效期 | 格式错误 422；签发服务另检查当前权限，不能越权；8KB 上限 |
| POST 日志清理 | 精确确认字串 | 缺少确认 400；保留策略与实际清理规则另由服务检查 |

认证和授权先于业务字段校验。无效 JSON 继续返回 `400 invalid_json`，原字段路径和中文消息通过 `ApiError` 返回；同一路径的同一条消息不重复，多个不同消息仍保留。请求取消、批量结果、文件下载和 Token 一次展示不受影响。

资源完整响应、更新响应和设置响应也由这些字段派生，workerd 检查实际序列化结果能通过对应 Schema；不会为每个线上响应强制增加一次解析。

## 使用方式

```ts
const parsed = resourceInputSchema.safeParse(input);
if (!parsed.success) {
  throw new ApiError(422, 'validation_failed', '请检查表单内容', formIssues(parsed.error.issues));
}
// OpenAPI requestBody 使用同一个 resourceInputSchema。
const schema = z.toJSONSchema(resourceInputSchema, { io: 'input' });
```

输入转换必须使用 `io: 'input'`：Zod 默认忽略的额外键不应被文档误写成一律拒绝。设置部分更新明确使用 strict 对象，服务端也拒绝未声明键。响应使用 `io: 'output'`。

JSON Schema 正则没有 JavaScript 的 flags。地址规则显式表达大小写，文档和运行时都接受 `HTTPS://`；空字符串与纯换行必须区分。资源示例随 Schema 定义，并通过真实 HTTP 创建请求验证，避免文档默认填出无效的空名称。

## 检查和边界

`test/schema-contracts.test.ts` 检查生成文档里的字段范围、地址正则、示例请求、真实 HTTP 边界、写入不变、部分设置合并、错误码和鉴权顺序，以及创建/修改/列表/导出的响应。已有 Token、权限、批量和存储测试继续覆盖业务授权与副作用。

本次统一的是应用自己的 JSON 写入字段。登录、私有文件和分页查询仍使用共享库原有校验器；它们的运行限制和安全策略由原生路由保证，文档覆盖测试仍保留。没有宣称全部 29 个操作都进行运行时响应校验。新业务接口可以按 [Hono 的验证约定](https://hono.dev/docs/guides/validation) 直接使用 [hono-openapi 的 Standard Schema validator](https://honohub.dev/docs/openapi)，不必复制示例的兼容处理。

参考：[Zod 原生 JSON Schema](https://zod.dev/json-schema)、[Hono OpenAPI](https://hono.dev/examples/hono-openapi)。
