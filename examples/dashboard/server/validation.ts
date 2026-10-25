import type { Context } from 'hono';
import { ApiError } from '@pengzhendong/worker-kit/server';
import type { FieldIssue } from '@pengzhendong/worker-kit/contracts';
import type { z } from 'zod';

export async function readJson(c: Context): Promise<unknown> {
  try { return await c.req.json(); }
  catch { throw new ApiError(400, 'invalid_json', '请求 JSON 无效'); }
}
export function formIssues(issues: readonly z.core.$ZodIssue[]): FieldIssue[] {
  const seen = new Set<string>();
  return issues.map((issue) => ({
    path: issue.path.filter((part): part is string | number => typeof part === 'string' || typeof part === 'number'),
    message: issue.message,
  })).filter((issue) => {
    const key = JSON.stringify([issue.path, issue.message]);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}
