import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { Context, MiddlewareHandler } from 'hono';
import { ApiError } from './app';
import type { WorkerEnv } from './app';
import type { CursorList } from '../contracts';
import { readCursorQuery } from './query';

export interface FileInfo { key: string; name: string; size: number; uploadedAt: string; contentType: string }

/** Private file endpoints. Mount authentication before these routes. */
export function createFileRoutes<B extends object>(options: {
  bucket: (bindings: B) => R2Bucket;
  prefix?: string;
  maxBytes?: number;
  onChange?: (context: Context<WorkerEnv<B>>, event: { action: string; target: string }) => Promise<void>;
}) {
  const app = new Hono<WorkerEnv<B>>();
  type C = Context<WorkerEnv<B>>;
  const prefix = options.prefix ?? 'uploads/';
  const maxBytes = options.maxBytes ?? 10 * 1024 * 1024;
  if (!prefix.endsWith('/') || !prefix || !Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error('Invalid file storage configuration');
  const limit: MiddlewareHandler<WorkerEnv<B>> = bodyLimit({ maxSize: maxBytes + 65_536, onError: () => { throw new ApiError(413, 'file_too_large', '文件超过上传大小限制'); } });
  function objectKey(c: C) {
    const key = c.req.query('key');
    if (!key || !key.startsWith(prefix) || key.length > 1024) throw new ApiError(400, 'invalid_file_key', '文件标识无效');
    return key;
  }
  const info = (object: R2Object): FileInfo => ({ key: object.key, name: object.customMetadata?.name ?? object.key.slice(prefix.length), size: object.size,
    uploadedAt: object.uploaded.toISOString(), contentType: object.httpMetadata?.contentType ?? 'application/octet-stream' });
  app.get('/', async (c: C) => {
    const query = readCursorQuery(new URL(c.req.url).searchParams);
    const list = await options.bucket(c.env).list({ prefix, limit: query.pageSize, cursor: query.cursor, include: ['customMetadata', 'httpMetadata'] });
    return c.json({ items: list.objects.map(info), cursor: list.truncated ? list.cursor : null, maxBytes } satisfies CursorList<FileInfo> & { maxBytes: number });
  });
  app.post('/', limit, async (c: C) => {
    let form: FormData;
    try { form = await c.req.formData(); } catch { throw new ApiError(400, 'invalid_upload', '请选择文件'); }
    const file = form.get('file');
    if (!(file instanceof File) || !file.name) throw new ApiError(400, 'invalid_upload', '请选择文件');
    if (file.size > maxBytes) throw new ApiError(413, 'file_too_large', '文件超过上传大小限制');
    const name = file.name.replace(/[\x00-\x1f\x7f/\\]/g, '_').slice(0, 160);
    const key = `${prefix}${crypto.randomUUID()}`;
    const object = await options.bucket(c.env).put(key, file.stream(), { httpMetadata: { contentType: file.type || 'application/octet-stream' }, customMetadata: { name } });
    await options.onChange?.(c, { action: 'file.upload', target: name });
    return c.json(info(object), 201);
  });
  app.get('/download', async (c: C) => {
    const object = await options.bucket(c.env).get(objectKey(c));
    if (!object) throw new ApiError(404, 'file_not_found', '文件不存在');
    const name = object.customMetadata?.name ?? 'download';
    return new Response(object.body, { headers: {
      'Content-Type': 'application/octet-stream', 'Content-Length': String(object.size),
      'Content-Disposition': `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(name).replace(/['()*]/g, (value) => `%${value.charCodeAt(0).toString(16).toUpperCase()}`)}`,
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    } });
  });
  app.delete('/', async (c: C) => {
    const key = objectKey(c);
    const object = await options.bucket(c.env).head(key);
    if (!object) throw new ApiError(404, 'file_not_found', '文件不存在');
    await options.bucket(c.env).delete(key);
    await options.onChange?.(c, { action: 'file.delete', target: object.customMetadata?.name ?? key });
    return c.body(null, 204);
  });
  return app;
}
