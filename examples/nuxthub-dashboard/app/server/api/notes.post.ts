import { db, schema } from 'hub:db';
import { smallInput } from '../utils/input';
export default defineEventHandler(async event => {
 const input = await smallInput(event); if(typeof input.title !== 'string' || !input.title.trim() || input.title.length > 80) throw createError({ statusCode: 422, message: '标题需为 1–80 个字符' });
 const note = { id: crypto.randomUUID(), title: input.title.trim(), createdAt: new Date().toISOString() }; await db.insert(schema.hubNotes).values(note); return note;
});
