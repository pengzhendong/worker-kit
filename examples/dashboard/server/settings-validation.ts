import { ApiError } from '@pengzhendong/worker-kit/server';
import type { SettingsValues } from '@pengzhendong/worker-kit/server';
import { settingsSchema } from './schemas';
import { formIssues } from './validation';

export function validateSettings(values: SettingsValues) {
  const result = settingsSchema.safeParse(values);
  if (!result.success) throw new ApiError(422, 'validation_failed', '请检查设置内容', formIssues(result.error.issues));
}
