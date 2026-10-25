import { z } from 'zod';

// Application-owned schemas. The shared server entry stays independent of Zod/OpenAPI.
const name = (limit: number, message: string) => z.string({ error: message }).min(1, message).max(limit, message).regex(/\S/, message);
export const resourceInputSchema = z.object({
  name: name(80, '名称不能为空，且不能超过 80 个字符').meta({ examples: ['示例配置'] }),
  kind: z.enum(['订阅源', '存储', '任务', '配置'], { error: '请选择有效的资源类型' }),
  status: z.enum(['enabled', 'disabled'], { error: '请选择有效的资源状态' }),
  // Spell out case-insensitivity: JSON Schema patterns do not carry JS RegExp flags.
  address: z.string({ error: '地址必须是文本，且不能超过 2000 个字符' }).max(2000, '地址必须是文本，且不能超过 2000 个字符').regex(/^(?:[hH][tT][tT][pP][sS]?:\/\/|(?![\s\S]))/, '地址必须以 http:// 或 https:// 开头').meta({ examples: ['https://example.com/resource'] }),
  description: z.string({ error: '描述必须是文本，且不能超过 1000 个字符' }).max(1000, '描述必须是文本，且不能超过 1000 个字符'),
}).meta({ examples: [{ name: '示例配置', kind: '配置', status: 'enabled', address: 'https://example.com/resource', description: '' }] });
export const resourceSchema = resourceInputSchema.extend({ id: z.string(), created_at: z.iso.datetime(), updated_at: z.iso.datetime() });
export const resourceUpdateSchema = resourceSchema.omit({ created_at: true });
export const settingsSchema = z.object({
  siteName: name(40, '应用名称不能为空且不能超过 40 个字符'),
  description: z.string().max(200, '应用描述不能超过 200 个字符'),
  contactEmail: z.string().max(254, '请输入有效邮箱').regex(/^(?:[^\s@]+@[^\s@]+\.[^\s@]+$|(?![\s\S]))/, '请输入有效邮箱'),
  pageSize: z.literal([10, 20, 50, 100], { error: '每页条数必须为 10、20、50 或 100' }),
  showWelcome: z.boolean(),
});
export const settingsPatchSchema = z.object({ values: settingsSchema.partial().strict() });
export const savedSettingsSchema = z.object({ values: settingsSchema, updatedAt: z.iso.datetime().nullable() });
export const resourceBatchSchema = z.object({
  ids: z.array(z.string().min(1).max(100).regex(/\S/)).min(1).max(100),
  status: resourceInputSchema.shape.status,
});
export const auditPruneSchema = z.object({ confirmation: z.literal('delete-expired-audit-events') });
export const apiKeyInputSchema = z.object({
  name: name(80, '请填写名称，且不能超过 80 个字符'),
  permissions: z.array(z.string()).min(1).max(100),
  expiresInDays: z.number().int().min(1).max(365),
});

/** Native Zod conversion; no second set of hand-maintained field constraints. */
export const inputJsonSchema = (schema: z.ZodType) => z.toJSONSchema(schema, { io: 'input' });
export const outputJsonSchema = (schema: z.ZodType) => z.toJSONSchema(schema, { io: 'output' });
