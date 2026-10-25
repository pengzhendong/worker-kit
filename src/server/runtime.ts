import type { RuntimeSnapshot, RuntimeCheckKind, RuntimeMetrics } from '../contracts';
import { runHealthChecks } from './health.ts';
import { readTextLimited } from './streams.ts';

export interface RuntimeStatusOptions {
  application: { name: string; version: string };
  environment: string;
  version?: { id?: string; tag?: string; timestamp?: string };
  checks: readonly { name: string; kind: RuntimeCheckKind; description: string; check: () => Promise<unknown> }[];
  timeoutMs?: number;
}
/** Project-owned read-only checks; only allowlisted version fields leave the Worker. */
export async function inspectRuntime(options: RuntimeStatusOptions): Promise<RuntimeSnapshot> {
  const checkedAt = new Date().toISOString();
  const result = options.checks.length ? await runHealthChecks(options.checks, { timeoutMs: options.timeoutMs }) : { ok: true, checks: [] };
  const text = (value: unknown) => typeof value === 'string' && value.length <= 256 && value ? value : null;
  const timestamp = text(options.version?.timestamp);
  return {
    application: { name: options.application.name, version: options.application.version },
    runtime: 'Cloudflare Workers', environment: options.environment, checkedAt, ok: result.ok,
    version: { id: text(options.version?.id), tag: text(options.version?.tag), createdAt: timestamp && Number.isFinite(Date.parse(timestamp)) ? new Date(timestamp).toISOString() : null },
    checks: result.checks.map((check, index) => ({ ...check, kind: options.checks[index]!.kind, description: options.checks[index]!.description })),
  };
}

export interface CloudflareMetricsOptions { accountId?: string; scriptName?: string; apiToken?: string }
const query = `query WorkerKitRuntime($account: string, $script: string, $from: string, $to: string) {
  viewer { accounts(filter: {accountTag: $account}) {
    workersInvocationsAdaptive(limit: 1, filter: {scriptName: $script, datetime_geq: $from, datetime_lt: $to}) {
      sum { requests errors }
      quantiles { cpuTimeP50 cpuTimeP99 wallTimeP50 wallTimeP99 memoryUsageBytesP50 memoryUsageBytesP99 }
    }
  } }
}`;
/** Fixed endpoint, Worker and one-hour window. Never accepts browser-provided account IDs or tokens. */
export async function readCloudflareMetrics(config: CloudflareMetricsOptions, options: { fetcher?: typeof fetch; now?: number; signal?: AbortSignal } = {}): Promise<RuntimeMetrics> {
  const now = options.now ?? Date.now();
  const result: RuntimeMetrics = {
    source: 'cloudflare', status: 'not-configured', message: '尚未接入 Cloudflare 指标',
    from: new Date(now - 3_600_000).toISOString(), to: new Date(now).toISOString(),
    requests: null, errors: null, cpuMsP50: null, cpuMsP99: null, wallMsP50: null, wallMsP99: null, memoryBytesP50: null, memoryBytesP99: null,
  };
  if (!config.accountId && !config.scriptName && !config.apiToken) return result;
  if (!config.accountId || !/^[a-f0-9]{32}$/i.test(config.accountId) || !config.scriptName || !/^[a-z0-9][a-z0-9_-]{0,62}$/i.test(config.scriptName) || !config.apiToken?.trim()) {
    return { ...result, status: 'error', message: 'Cloudflare 指标配置不完整或无效' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  const signal = options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal;
  try {
    signal.throwIfAborted();
    const response = await (options.fetcher ?? fetch)('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST', redirect: 'error', signal,
      headers: { Authorization: `Bearer ${config.apiToken}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables: { account: config.accountId, script: config.scriptName, from: result.from, to: result.to } }),
    });
    if (!response.ok) throw new Error('Upstream unavailable');
    if (!response.body) throw new Error('Empty analytics response');
    const body = await readTextLimited(response.body, 65_536, signal);
    const payload = JSON.parse(body);
    if (payload.errors != null && (!Array.isArray(payload.errors) || payload.errors.length) || !Array.isArray(payload.data?.viewer?.accounts) || payload.data.viewer.accounts.length !== 1) throw new Error('Analytics unavailable');
    const rows = payload.data.viewer.accounts[0].workersInvocationsAdaptive;
    if (!Array.isArray(rows) || rows.length > 1) throw new Error('Invalid analytics response');
    if (!rows.length) return { ...result, status: 'ok', message: '过去一小时暂无请求数据', requests: 0, errors: 0 };
    const row = rows[0];
    const number = (value: unknown) => { if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('Invalid analytics value'); return value; };
    const requests = number(row.sum?.requests), errors = number(row.sum?.errors);
    if (errors > requests) throw new Error('Invalid analytics counts');
    const quantile = (name: string, divisor = 1) => requests === 0 || row.quantiles?.[name] == null ? null : number(row.quantiles[name]) / divisor;
    return { ...result, status: 'ok', message: 'Cloudflare 过去一小时聚合数据，可能采样并延迟', requests, errors,
      cpuMsP50: quantile('cpuTimeP50', 1000), cpuMsP99: quantile('cpuTimeP99', 1000), wallMsP50: quantile('wallTimeP50', 1000), wallMsP99: quantile('wallTimeP99', 1000),
      memoryBytesP50: quantile('memoryUsageBytesP50'), memoryBytesP99: quantile('memoryUsageBytesP99'),
    };
  } catch {
    // The platform's raw errors may contain account details, query fragments or credentials.
    return { ...result, status: 'error', message: '无法读取 Cloudflare 指标，请检查只读权限与平台可用性' };
  } finally { clearTimeout(timer); }
}
