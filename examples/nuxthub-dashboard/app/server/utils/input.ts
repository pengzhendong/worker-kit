export async function smallInput(event: any) {
 const raw = await readRawBody(event, false);
 if (!raw || raw.byteLength > 8192) throw createError({ statusCode: 400, message: '请求格式无效或过大' });
 let value: unknown; try { value = JSON.parse(new TextDecoder().decode(raw)); } catch { throw createError({ statusCode: 400, message: '请求 JSON 无效' }); }
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw createError({ statusCode: 400, message: '请求格式无效' });
 return value as Record<string, unknown>;
}
