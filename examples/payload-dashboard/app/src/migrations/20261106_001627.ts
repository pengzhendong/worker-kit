import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`users\` ADD \`role\` text DEFAULT 'viewer' NOT NULL;`)
  // WorkerKit owns this operations table; Payload owns collection tables.
  await db.run(sql`UPDATE users SET role = 'admin' WHERE id = (SELECT MIN(id) FROM users)`);
  await db.run(sql`CREATE TABLE workerkit_operation_runs (
    id text PRIMARY KEY NOT NULL, trigger text NOT NULL, status text NOT NULL,
    started_at text NOT NULL, finished_at text NOT NULL, checks text NOT NULL, scheduled_at text
  )`);
  await db.run(sql`CREATE INDEX workerkit_runs_started_idx ON workerkit_operation_runs (started_at)`);

}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`role\`;`)
  await db.run(sql`DROP TABLE workerkit_operation_runs`);

}
