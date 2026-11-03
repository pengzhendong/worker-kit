import { parseTaskSchedule } from '../contracts/task-schedule';
import type { TaskSchedule } from '../contracts/task-schedule';

export type TaskInputs = Record<string, string>;
export type TaskProgress = { completed: number; total?: number; message?: string };
export type TaskOutcome = { state: 'submitted'; externalId: string; url?: string } | { state: 'succeeded' };
export type TaskStatus = 'running' | 'succeeded' | 'failed' | 'submitted' | 'unknown';
export interface TaskRun {
  id: string;
  planId: string;
  task: string;
  startedAt: number;
  finishedAt?: number;
  status: TaskStatus;
  progress?: TaskProgress;
  externalId?: string;
  url?: string;
  error?: string;
}
export interface TaskDefinition {
  label: string;
  target: 'cloudflare' | 'github';
  fields: readonly { name: string; label: string; required?: boolean }[];
  run(inputs: TaskInputs, context: { id: string; report: (progress: TaskProgress) => void }): Promise<TaskOutcome>;
  status?(externalId: string): Promise<'submitted' | 'succeeded' | 'failed'>;
}
interface TaskPlan {
  id: string;
  task: string;
  inputs: TaskInputs;
  cron?: string;
  schedule?: TaskSchedule;
  scheduleId?: string;
}

export interface SchedulePort {
  set(schedule: TaskSchedule, planId: string): Promise<string>;
  cancel(id: string): Promise<unknown>;
  next(id: string): Promise<number | undefined>;
}

function planSchedule(plan: TaskPlan): TaskSchedule {
  return plan.schedule ?? { kind: 'cron', cron: plan.cron ?? '' };
}

class TaskInputError extends Error {}
export class TaskRejectedError extends Error {}

export class TaskManager {
  private changes: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly sql: SqlStorage,
    private readonly clock: SchedulePort,
    private readonly definitions: Readonly<Record<string, TaskDefinition>>,
  ) {
    sql.exec('CREATE TABLE IF NOT EXISTS wk_plans (id TEXT PRIMARY KEY, value TEXT NOT NULL)');
    sql.exec('CREATE TABLE IF NOT EXISTS wk_runs (id TEXT PRIMARY KEY, started INTEGER NOT NULL, value TEXT NOT NULL)');
  }

  private task(id: string) {
    if (!Object.hasOwn(this.definitions, id)) throw new TaskInputError('任务目标不存在');
    return this.definitions[id];
  }

  private plan(id: string) {
    const row = this.sql.exec<{ value: string }>('SELECT value FROM wk_plans WHERE id = ?', id).toArray()[0];
    if (!row) throw new TaskInputError('计划不存在');
    return JSON.parse(row.value) as TaskPlan;
  }

  private save(plan: TaskPlan) {
    this.sql.exec('INSERT OR REPLACE INTO wk_plans VALUES (?, ?)', plan.id, JSON.stringify(plan));
  }

  private saveRun(run: TaskRun) {
    this.sql.exec('UPDATE wk_runs SET value = ? WHERE id = ?', JSON.stringify(run), run.id);
  }

  async execute(planId: string, occurrence?: { id: string; time: number }) {
    const plan = this.plan(planId);
    if (occurrence && occurrence.id !== plan.scheduleId) return;
    const id = occurrence ? plan.id + ':' + occurrence.time : crypto.randomUUID();
    const run: TaskRun = { id, planId, task: plan.task, startedAt: Date.now(), status: 'running' };
    const claimed = this.sql.exec('INSERT OR IGNORE INTO wk_runs VALUES (?, ?, ?) RETURNING id', id, run.startedAt, JSON.stringify(run)).toArray();
    if (!claimed.length) return;
    try {
      const outcome = await this.task(plan.task).run(plan.inputs, {
        id,
        report: progress => {
          if (!Number.isFinite(progress.completed) || progress.completed < 0 ||
              (progress.total !== undefined && (!Number.isFinite(progress.total) || progress.total < progress.completed))) return;
          run.progress = { completed: progress.completed, total: progress.total, message: progress.message?.slice(0, 160) };
          this.saveRun(run);
        },
      });
      run.status = outcome.state;
      if (outcome.state === 'submitted') {
        run.externalId = outcome.externalId;
        run.url = outcome.url;
      } else run.finishedAt = Date.now();
    } catch (error) {
      // A transport failure can occur after an external dispatch was accepted.
      run.status = this.definitions[plan.task]?.target === 'github' && !(error instanceof TaskRejectedError) ? 'unknown' : 'failed';
      run.error = error instanceof TaskRejectedError ? error.message : run.status === 'unknown' ? '未能确认外部任务是否收到请求' : '执行失败';
      run.finishedAt = Date.now();
    }
    this.saveRun(run);
    // Keep deduplication records longer than the history shown in the UI.
    this.sql.exec('DELETE FROM wk_runs WHERE started < ?', Date.now() - 30 * 86400000);
    return run;
  }

  private async inventory() {
    const plans = this.sql.exec<{ value: string }>('SELECT value FROM wk_plans ORDER BY rowid DESC').toArray()
      .map(row => JSON.parse(row.value) as TaskPlan);
    const runs = this.sql.exec<{ value: string }>('SELECT value FROM wk_runs ORDER BY started DESC LIMIT 50').toArray()
      .map(row => JSON.parse(row.value) as TaskRun);
    await Promise.all(runs.filter(run => run.status === 'submitted' && run.externalId).slice(0, 5).map(async run => {
      try {
        const status = await this.definitions[run.task]?.status?.(run.externalId!);
        if (status && status !== run.status) {
          run.status = status;
          run.finishedAt = Date.now();
          this.saveRun(run);
        }
      } catch { /* A failed status lookup preserves the submitted state. */ }
    }));
    return {
      definitions: Object.entries(this.definitions).map(([id, { label, target, fields }]) => ({ id, label, target, fields })),
      plans: await Promise.all(plans.map(async plan => ({
        ...plan, schedule: planSchedule(plan), nextAt: plan.scheduleId ? await this.clock.next(plan.scheduleId) : undefined,
      }))),
      runs: runs.map(run => run.status === 'running' && Date.now() - run.startedAt > 60_000 ? { ...run, status: 'unknown' } : run),
    };
  }

  async handle(request: Request) {
    const path = new URL(request.url).pathname;
    if (request.method === 'GET' && path === '/api/managed-tasks') return Response.json(await this.inventory());
    if (request.method !== 'POST') return new Response(null, { status: 405 });
    if (path === '/api/managed-tasks/run') return this.change(request, path);
    const operation = this.changes.then(() => this.change(request, path));
    this.changes = operation.catch(() => {});
    return operation;
  }

  private async change(request: Request, path: string) {
    try {
      const raw = await request.text();
      if (raw.length > 8192) throw new TaskInputError('请求过大');
      let body;
      try { body = JSON.parse(raw); } catch { throw new TaskInputError('无效的 JSON'); }
      if (!body || typeof body !== 'object') throw new TaskInputError('无效的任务参数');
      if (path === '/api/managed-tasks' || path === '/api/managed-tasks/edit') {
        const previous = path.endsWith('/edit') ? this.plan(body.id) : undefined;
        const taskId = previous?.task ?? body.task;
        const task = this.task(taskId);
        let schedule: TaskSchedule;
        try { schedule = parseTaskSchedule(body.schedule ?? { kind: 'cron', cron: body.cron }); }
        catch (error) { throw new TaskInputError(error instanceof Error ? error.message : '运行频率无效'); }
        const inputs: TaskInputs = {};
        for (const field of task.fields) {
          const value = body.inputs?.[field.name] ?? '';
          if (typeof value !== 'string' || value.length > 500 || (field.required && !value.trim())) {
            throw new TaskInputError('请检查参数：' + field.label);
          }
          if (value) inputs[field.name] = value;
        }
        const plan: TaskPlan = { id: previous?.id ?? crypto.randomUUID(), task: taskId, inputs, schedule };
        if (!previous || previous.scheduleId || JSON.stringify(planSchedule(previous)) !== JSON.stringify(schedule)) {
          try { plan.scheduleId = await this.clock.set(schedule, plan.id); }
          catch { throw new TaskInputError('无法保存计划，请检查 Cron'); }
        }
        if (previous && !previous.scheduleId && plan.scheduleId) {
          await this.clock.cancel(plan.scheduleId);
          delete plan.scheduleId;
        }
        this.save(plan);
        if (previous?.scheduleId && previous.scheduleId !== plan.scheduleId) await this.clock.cancel(previous.scheduleId);
        return Response.json(plan, { status: previous ? 200 : 201 });
      }
      const plan = this.plan(body.id);
      if (path === '/api/managed-tasks/run') return Response.json(await this.execute(plan.id));
      if (path === '/api/managed-tasks/pause') {
        const scheduleId = plan.scheduleId;
        delete plan.scheduleId;
        this.save(plan);
        if (scheduleId) await this.clock.cancel(scheduleId);
        return Response.json(plan);
      }
      if (path === '/api/managed-tasks/resume') {
        this.task(plan.task);
        if (!plan.scheduleId) plan.scheduleId = await this.clock.set(planSchedule(plan), plan.id);
        this.save(plan);
        return Response.json(plan);
      }
      return new Response(null, { status: 404 });
    } catch (error) {
      return Response.json({ error: error instanceof TaskInputError ? error.message : '任务操作失败' }, {
        status: error instanceof TaskInputError ? 400 : 500,
      });
    }
  }
}
