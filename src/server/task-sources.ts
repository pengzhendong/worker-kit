export type TaskRow = [source: string, name: string, schedule: string, status: string, url: string];

export interface TaskSourceEnv {
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
  GITHUB_TOKEN?: string;
}

interface GitHubRepository {
  repo: string;
  public?: boolean;
}

export interface GitHubTaskSource extends GitHubRepository {
  workflows: string[];
}

interface WorkflowSchedule {
  cron: string;
  timezone?: string;
}

interface WorkflowConfig {
  on?: { schedule?: WorkflowSchedule[] };
}

interface GitHubWorkflow {
  name: string;
  state: string;
  html_url: string;
}

interface GitHubWorkflowRun {
  conclusion: string | null;
  status: string;
  created_at: string;
  html_url: string;
}

async function api<T>(url: string, token: string | undefined, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'worker-kit-task-sources', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...headers },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('上游 HTTP ' + response.status);
  return response.json() as Promise<T>;
}

export async function listCloudflareSchedules(worker: string, env: TaskSourceEnv): Promise<TaskRow[]> {
  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN) throw new Error('缺少 Cloudflare 账号或读取凭据');
  const account = encodeURIComponent(env.CF_ACCOUNT_ID);
  const script = encodeURIComponent(worker);
  const base = 'https://api.cloudflare.com/client/v4/accounts/' + account;
  const data = await api<{ success: boolean; result?: { schedules?: { cron: string }[] } }>(base + '/workers/scripts/' + script + '/schedules', env.CF_API_TOKEN);
  if (!data.success || !Array.isArray(data.result?.schedules)) throw new Error('无法读取 Cron 配置');
  return data.result.schedules.map(({ cron }: { cron: string }): TaskRow => ['Cloudflare', worker, cron + ' · UTC', '查看平台运行记录',
    'https://dash.cloudflare.com/' + account + '/workers/services/view/' + script + '/production']);
}

function githubRepositoryApi({ repo, public: isPublic }: GitHubRepository, env: TaskSourceEnv) {
  if (!env.GITHUB_TOKEN && !isPublic) throw new Error('缺少 GitHub 读取凭据');
  if (!/^[^/]+\/[^/]+$/.test(repo)) throw new Error('GitHub 仓库应为 owner/repo');
  const [owner, name] = repo.split('/').map(encodeURIComponent);
  const base = 'https://api.github.com/repos/' + owner + '/' + name;
  return <T>(path: string) => api<T>(base + path, env.GITHUB_TOKEN, { Accept: 'application/vnd.github+json' });
}

function workflowSchedule(contents: { content: string }, parseWorkflow: (source: string) => WorkflowConfig) {
  const bytes = Uint8Array.from(atob(contents.content.replace(/\s/g, '')), c => c.charCodeAt(0));
  const schedule = parseWorkflow(new TextDecoder().decode(bytes))?.on?.schedule;
  return Array.isArray(schedule) ? schedule : [];
}

function workflowRows(repo: string, workflow: GitHubWorkflow, schedule: WorkflowSchedule[], run?: GitHubWorkflowRun): TaskRow[] {
  return schedule.map(({ cron, timezone }) => [
    'GitHub', repo + ' / ' + workflow.name, cron + ' · ' + (timezone ?? 'UTC'),
    workflow.state + ' · ' + (run ? (run.conclusion ?? run.status) + ' · ' + run.created_at : '暂无定时运行'),
    run?.html_url ?? workflow.html_url,
  ]);
}

export async function listGitHubSchedules(source: GitHubTaskSource, env: TaskSourceEnv, parseWorkflow: (source: string) => WorkflowConfig): Promise<TaskRow[]> {
  const { repo, workflows } = source;
  const get = githubRepositoryApi(source, env);
  return (await Promise.all(workflows.map(async (file) => {
    const id = encodeURIComponent(file);
    const [contents, workflow, runs] = await Promise.all([
      get<{ content: string }>('/contents/.github/workflows/' + id),
      get<GitHubWorkflow>('/actions/workflows/' + id),
      get<{ workflow_runs: GitHubWorkflowRun[] }>('/actions/workflows/' + id + '/runs?event=schedule&per_page=1'),
    ]);
    return workflowRows(repo, workflow, workflowSchedule(contents, parseWorkflow), runs.workflow_runs[0]);
  }))).flat();
}

export async function discoverGitHubSchedules(source: GitHubRepository, env: TaskSourceEnv, parseWorkflow: (source: string) => WorkflowConfig) {
  const get = githubRepositoryApi(source, env);
  const tasks: TaskRow[] = [];
  const errors: string[] = [];
  const pageSize = 100;
  const batchSize = 5;

  for (let page = 1; ; page++) {
    const { workflows, total_count } = await get<{ workflows: (GitHubWorkflow & { id: number; path: string })[]; total_count: number }>(
      `/actions/workflows?per_page=${pageSize}&page=${page}`,
    );
    const files = workflows.filter(workflow => workflow.state !== 'deleted' && /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(workflow.path));
    for (let start = 0; start < files.length; start += batchSize) {
      const batch = files.slice(start, start + batchSize);
      const results = await Promise.allSettled(batch.map(async workflow => {
        const path = workflow.path.split('/').map(encodeURIComponent).join('/');
        const contents = await get<{ content: string }>('/contents/' + path);
        const schedule = workflowSchedule(contents, parseWorkflow);
        if (!schedule.length) return [];
        const runs = await get<{ workflow_runs: GitHubWorkflowRun[] }>(`/actions/workflows/${workflow.id}/runs?event=schedule&per_page=1`);
        return workflowRows(source.repo, workflow, schedule, runs.workflow_runs[0]);
      }));
      for (const [index, result] of results.entries()) {
        if (result.status === 'fulfilled') tasks.push(...result.value);
        else errors.push(`${source.repo} / ${batch[index].path.split('/').pop()} · ${result.reason.message}`);
      }
    }
    if (workflows.length < pageSize || page * pageSize >= total_count) break;
  }
  return { tasks, errors };
}
