import { TaskRejectedError } from './task-manager';
import type { TaskDefinition, TaskInputs } from './task-manager';

interface GitHubTarget {
  repository: string;
  workflow: string;
  ref: string;
  token: string;
}

export function githubTask(target: GitHubTarget): Pick<TaskDefinition, 'run' | 'status'> {
  if (!/^[\w.-]+\/[\w.-]+$/.test(target.repository)) throw new Error('Invalid GitHub repository');
  const base = 'https://api.github.com/repos/' + target.repository + '/actions/';
  function call(path: string, body?: object) {
    return fetch(base + path, {
      method: body ? 'POST' : 'GET',
      headers: {
        authorization: 'Bearer ' + target.token,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2026-03-10',
        'user-agent': 'workerkit-tasks',
        'content-type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });
  }
  return {
    async run(inputs: TaskInputs) {
      const response = await call('workflows/' + encodeURIComponent(target.workflow) + '/dispatches', {
        ref: target.ref, inputs,
      });
      if (response.status >= 400 && response.status < 500) throw new TaskRejectedError('GitHub 拒绝触发（HTTP ' + response.status + '）');
      if (!response.ok) throw new Error('GitHub dispatch failed');
      const data = await response.json<{ workflow_run_id: number; html_url?: string }>();
      if (!Number.isSafeInteger(data.workflow_run_id) || data.workflow_run_id <= 0) throw new Error('Missing GitHub run ID');
      return { state: 'submitted', externalId: String(data.workflow_run_id), url: data.html_url };
    },
    async status(id) {
      if (!/^\d+$/.test(id)) throw new Error('Invalid GitHub run ID');
      const response = await call('runs/' + id);
      if (!response.ok) throw new Error('GitHub run lookup failed');
      const data = await response.json<{ status: string; conclusion: string | null }>();
      if (data.status !== 'completed') return 'submitted';
      return data.conclusion === 'success' ? 'succeeded' : 'failed';
    },
  };
}

/** Dispatch a short, allowlisted action through a Cloudflare Service Binding. */
export function workerTask(binding: Fetcher, path: string): Pick<TaskDefinition, 'run'> {
  const url = new URL(path, 'https://workerkit.internal');
  if (url.origin !== 'https://workerkit.internal' || !path.startsWith('/') || url.search || url.hash) {
    throw new Error('Invalid task action path');
  }
  return {
    async run(inputs, { id, report }) {
      const response = await binding.fetch(new Request(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': id },
        body: JSON.stringify({ runId: id, inputs }),
        signal: AbortSignal.timeout(10_000),
      }));
      if (!response.ok) throw new TaskRejectedError('业务 Worker 返回 HTTP ' + response.status);
      if (response.headers.get('content-type')?.includes('application/json')) {
        const result = await response.json<{ progress?: { completed: number; total?: number; message?: string } }>();
        if (result?.progress) report(result.progress);
      }
      return { state: 'succeeded' };
    },
  };
}
