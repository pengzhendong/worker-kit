export type TaskRow = [source: string, name: string, schedule: string, status: string, url: string];

export interface TaskSourceEnv {
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
  GITHUB_TOKEN?: string;
}

export interface GitHubTaskSource {
  repo: string;
  workflows: string[];
}

interface WorkflowConfig {
  on?: { schedule?: { cron: string; timezone?: string }[] };
}

async function api<T>(url: string, token: string | undefined, headers: Record<string, string> = {}) {
  if (!token) throw new Error('缺少服务端凭据');
  const response = await fetch(url, {
    headers: { Authorization: 'Bearer ' + token, 'User-Agent': 'worker-console', ...headers },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('上游 HTTP ' + response.status);
  return response.json() as Promise<T>;
}

export async function listCloudflareSchedules(worker: string, env: TaskSourceEnv): Promise<TaskRow[]> {
  const account = encodeURIComponent(env.CF_ACCOUNT_ID ?? '');
  const script = encodeURIComponent(worker);
  const base = 'https://api.cloudflare.com/client/v4/accounts/' + account;
  const data = await api<{ success: boolean; result?: { schedules?: { cron: string }[] } }>(base + '/workers/scripts/' + script + '/schedules', env.CF_API_TOKEN);
  if (!data.success || !Array.isArray(data.result?.schedules)) throw new Error('无法读取 Cron 配置');
  return data.result.schedules.map(({ cron }: { cron: string }): TaskRow => ['Cloudflare', worker, cron, '查看平台运行记录',
    'https://dash.cloudflare.com/' + account + '/workers/services/view/' + script + '/production']);
}

export async function listGitHubSchedules({ repo, workflows }: GitHubTaskSource, env: TaskSourceEnv, parseWorkflow: (source: string) => WorkflowConfig): Promise<TaskRow[]> {
  const [owner, name] = repo.split('/').map(encodeURIComponent);
  const base = 'https://api.github.com/repos/' + owner + '/' + name;
  const get = <T>(path: string) => api<T>(base + path, env.GITHUB_TOKEN, { Accept: 'application/vnd.github+json' });
  return (await Promise.all(workflows.map(async (file) => {
    const id = encodeURIComponent(file);
    const [contents, workflow, runs] = await Promise.all([
      get<{ content: string }>('/contents/.github/workflows/' + id),
      get<{ name: string; state: string; html_url: string }>('/actions/workflows/' + id),
      get<{ workflow_runs: { conclusion: string | null; status: string; created_at: string; html_url: string }[] }>('/actions/workflows/' + id + '/runs?event=schedule&per_page=1'),
    ]);
    const bytes = Uint8Array.from(atob(contents.content.replace(/\s/g, '')), c => c.charCodeAt(0));
    const schedule = parseWorkflow(new TextDecoder().decode(bytes))?.on?.schedule ?? [];
    const run = runs.workflow_runs[0];
    return schedule.map(({ cron, timezone }): TaskRow => [
      'GitHub', repo + ' / ' + workflow.name, cron + ' · ' + (timezone ?? 'UTC'),
      workflow.state + ' · ' + (run ? (run.conclusion ?? run.status) + ' · ' + run.created_at : '暂无定时运行'),
      run?.html_url ?? workflow.html_url,
    ]);
  }))).flat();
}

