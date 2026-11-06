import type { H3Event } from 'h3';
import { readBytesLimited } from '@pengzhendong/worker-kit/http';
import { hubRequest } from './admin';

export async function smallInput(event: H3Event) {
  let raw: Uint8Array | undefined;
  if (event.method === 'DELETE') {
    const request = hubRequest(event);
    try {
      raw = await readBytesLimited(request.body, 8192, request.signal);
    } catch {
      throw createError({ statusCode: 400, message: '请求格式无效或过大' });
    }
  } else raw = await readRawBody(event, false);
  if (!raw?.byteLength || raw.byteLength > 8192)
    throw createError({ statusCode: 400, message: '请求格式无效或过大' });
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    throw createError({ statusCode: 400, message: '请求 JSON 无效' });
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw createError({ statusCode: 400, message: '请求格式无效' });
  return value as Record<string, unknown>;
}
