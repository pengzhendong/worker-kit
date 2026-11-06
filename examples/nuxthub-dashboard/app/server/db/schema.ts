import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const hubNotes = sqliteTable('workerkit_hub_notes', { id: text('id').primaryKey(), title: text('title').notNull(), createdAt: text('created_at').notNull() });
