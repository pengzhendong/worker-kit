import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`users\` ADD \`username\` text;`)
  await db.run(sql`CREATE UNIQUE INDEX \`users_username_idx\` ON \`users\` (\`username\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`users_username_idx\`;`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`username\`;`)
}
