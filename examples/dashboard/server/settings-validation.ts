import { ApiError } from '@pengzhendong/worker-kit/server';
import type { SettingsValues } from '@pengzhendong/worker-kit/server';
import type { FieldIssue } from '@pengzhendong/worker-kit/contracts';

export function validateSettings(values: SettingsValues) {
  const fields: FieldIssue[] = [];
  if (typeof values.siteName !== 'string' || !values.siteName.trim() || values.siteName.length > 40) fields.push({ path: ['siteName'], message: '应用名称不能为空且不能超过 40 个字符' });
  if (typeof values.description !== 'string' || values.description.length > 200) fields.push({ path: ['description'], message: '应用描述不能超过 200 个字符' });
  if (typeof values.contactEmail !== 'string' || values.contactEmail.length > 254 || values.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contactEmail)) fields.push({ path: ['contactEmail'], message: '请输入有效邮箱' });
  if (![10, 20, 50, 100].includes(Number(values.pageSize))) fields.push({ path: ['pageSize'], message: '每页条数必须为 10、20、50 或 100' });
  if (fields.length) throw new ApiError(422, 'validation_failed', '请检查设置内容', fields);
}
