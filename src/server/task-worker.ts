import { DurableObject } from 'cloudflare:workers';
import { Lifecycle } from 'agents/lifecycle';
import { Scheduler, type Schedule } from 'agents/schedules';
import { parseCronExpression } from 'cron-schedule';
import { TaskManager } from './task-manager';
import type { TaskDefinition } from './task-manager';

/** Native agents scheduler + existing TaskManager; consumers supply business definitions. */
export function createTaskWorker<E extends object>(options: {
  backends: readonly string[];
  definitions(env: E, backend: string): Record<string, TaskDefinition>;
}) {
  return class WorkerKitTasks extends DurableObject<E> {
    private instance?: TaskManager;
    constructor(ctx: DurableObjectState, env: E) {
      super(ctx, env);
      ctx.storage.sql.exec(
        'CREATE TABLE IF NOT EXISTS wk_context (id INTEGER PRIMARY KEY CHECK (id = 1), backend TEXT NOT NULL)',
      );
    }
    scheduler = new Scheduler({
      callbacks: {
        runPlan: (id: string, schedule: Schedule<string>): Promise<unknown> =>
          this.manager.execute(id, schedule),
      },
      retry: { maxAttempts: 1 },
    });
    lifecycle = Lifecycle.install(this).use(this.scheduler);
    get manager(): TaskManager {
      const backend = this.ctx.storage.sql
        .exec<{
          backend: string;
        }>('SELECT backend FROM wk_context WHERE id = 1')
        .toArray()[0]?.backend;
      if (!backend) throw new Error('Task backend has not been initialized');
      return (this.instance ??= new TaskManager(
        this.ctx.storage.sql,
        {
          set: async (schedule, id): Promise<string> => {
            if (schedule.kind === 'interval')
              return (
                await this.scheduler.every(schedule.minutes * 60, 'runPlan', id)
              ).id;
            // parseTaskSchedule currently allows Shanghai or UTC only.
            const offset = 8 * 3600000;
            const when = schedule.timeZone
              ? new Date(
                  parseCronExpression(schedule.cron)
                    .getNextDate(new Date(Date.now() + offset))
                    .getTime() - offset,
                )
              : schedule.cron;
            return (await this.scheduler.set(when, 'runPlan', id)).id;
          },
          cancel: (id) => this.scheduler.cancel(id),
          next: async (id) => (await this.scheduler.get(id))?.time,
        },
        options.definitions(this.env, backend),
      ));
    }
    async fetch(request: Request) {
      const backend = request.headers.get('X-WorkerKit-Backend');
      if (!backend || !options.backends.includes(backend))
        return new Response(null, { status: 403 });
      this.ctx.storage.sql.exec(
        'INSERT OR IGNORE INTO wk_context VALUES (1, ?)',
        backend,
      );
      const current = this.ctx.storage.sql
        .exec<{
          backend: string;
        }>('SELECT backend FROM wk_context WHERE id = 1')
        .toArray()[0].backend;
      if (current !== backend) return new Response(null, { status: 409 });
      await this.lifecycle.start();
      return this.manager.handle(request);
    }
  };
}
