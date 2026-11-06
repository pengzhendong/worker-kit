export type TaskInputs = Record<string, string>;
export type TaskProgress = { completed: number; total?: number; message?: string };
export type TaskOutput = { value?: string; logs: string[] };
export type TaskOutcome = { state: 'submitted'; externalId: string; url?: string } | { state: 'succeeded'; output?: TaskOutput };
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
  output?: TaskOutput;
}
