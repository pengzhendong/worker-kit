import { db, schema } from 'hub:db';
import { kv } from 'hub:kv';
import { blob } from 'hub:blob';
import { desc } from 'drizzle-orm';
const cached = defineCachedFunction(async () => ({ generatedAt: new Date().toISOString() }), { maxAge: 60, name: 'workerkit-hub-probe', getKey: () => 'sample' });
export default defineEventHandler(async () => {
 const [notes, label, files, cache] = await Promise.all([db.select().from(schema.hubNotes).orderBy(desc(schema.hubNotes.createdAt)).limit(20), kv.get<string>('workbench:label'), blob.list({ prefix: 'demo/', limit: 10 }), cached()]);
 return { notes, label: label || '', files: files.blobs.map(file => ({ pathname: file.pathname, size: file.size, uploadedAt: file.uploadedAt })), cache, drivers: { db: 'NuxtHub / Drizzle / D1', kv: 'NuxtHub KV', blob: 'NuxtHub Blob / R2', cache: 'Nitro Cache / KV' } };
});
