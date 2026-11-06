import type { TaskRun } from '../../src/contracts/task-run';
import type { RuntimeSnapshot } from '../../src/contracts/runtime';
export type Workspace = {
  backend: string;
  user: { id: string; name: string; permissions: string[] };
  runtime: RuntimeSnapshot;
  definitions: { id: string; label: string; fields: { name: string; label: string; required?: boolean }[] }[];
  plans: { id: string; task: string; scheduleId?: string; schedule: { kind: string; minutes?: number; cron?: string }; nextAt?: number }[];
  runs: TaskRun[];
};
export function createOperationsClient(): {
  snapshot(): { data: Workspace | null; busy: boolean; error: string; unauthorized: boolean };
  subscribe(fn: () => void): () => void;
  refresh(): Promise<void>;
  create(task: string, minutes: number | string, inputs?: Record<string, string>): Promise<void>;
  change(action: string, id: string): Promise<void>;
  dispose(): void;
  loginUrl(): string;
};
export const runLabel: Record<string, string>;
export function formatTime(value?: string | number): string;
