import type { ManagementSnapshot } from '../../src/contracts/management';
import type { createSessionScope } from '@pengzhendong/worker-kit/client';
import type { TaskRun } from '../../src/contracts/task-run';
import type { RuntimeSnapshot } from '../../src/contracts/runtime';
export type Workspace = {
  management?: ManagementSnapshot;
  backend: string;
  user: { id: string; name: string; permissions: string[] };
  runtime: RuntimeSnapshot;
  definitions: {
    id: string;
    label: string;
    fields: { name: string; label: string; required?: boolean }[];
  }[];
  plans: {
    id: string;
    task: string;
    scheduleId?: string;
    schedule: { kind: string; minutes?: number; cron?: string };
    nextAt?: number;
  }[];
  runs: TaskRun[];
};
export function createOperationsClient(options?: {
  baseUrl?: string;
  loginUrl?: string;
  scope?: ReturnType<typeof createSessionScope>;
}): {
  snapshot(): {
    data: Workspace | null;
    busy: boolean;
    error: string;
    unauthorized: boolean;
    issuedToken: string;
  };
  subscribe(fn: () => void): () => void;
  refresh(): Promise<void>;
  create(
    task: string,
    minutes: number | string,
    inputs?: Record<string, string>,
  ): Promise<void>;
  change(action: string, id: string): Promise<void>;
  saveSettings(
    values: Record<string, string | number | boolean>,
  ): Promise<void>;
  issueKey(name: string, expiresInDays: number | string): Promise<void>;
  closeToken(): void;
  revokeKey(id: string): Promise<void>;
  pageKeys(cursor?: string | null): Promise<void>;
  pageAudit(cursor?: string | null): Promise<void>;
  apiUrl(suffix: string): string;
  dispose(): void;
  loginUrl(): string;
};
export const runLabel: Record<string, string>;
export function formatTime(value?: string | number): string;
