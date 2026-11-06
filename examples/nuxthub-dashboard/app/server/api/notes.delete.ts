import { db, schema } from 'hub:db';
import { eq } from 'drizzle-orm';
import { smallInput } from '../utils/input';
export default defineEventHandler(async event => { const input=await smallInput(event);if(typeof input.id!=='string'||! /^[a-f0-9-]{36}$/.test(input.id))throw createError({statusCode:400,message:'记录标识无效'});await db.delete(schema.hubNotes).where(eq(schema.hubNotes.id,input.id));return {deleted:true}; });
