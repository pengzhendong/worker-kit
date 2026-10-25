export type RuntimeCheckKind = 'database' | 'kv' | 'storage' | 'service';
export interface RuntimeCheck { name: string; kind: RuntimeCheckKind; description: string; status: 'ok' | 'error' | 'timeout'; durationMs: number }
export interface RuntimeSnapshot {
  application: { name: string; version: string };
  runtime: 'Cloudflare Workers';
  environment: string;
  checkedAt: string;
  ok: boolean;
  version: { id: string | null; tag: string | null; createdAt: string | null };
  checks: RuntimeCheck[];
}
/** Analytics is sampled and delayed. No data, unavailable data and zero are different states. */
export interface RuntimeMetrics {
  source: 'cloudflare';
  status: 'ok' | 'not-configured' | 'error';
  message: string;
  from: string;
  to: string;
  requests: number | null;
  errors: number | null;
  cpuMsP50: number | null;
  cpuMsP99: number | null;
  wallMsP50: number | null;
  wallMsP99: number | null;
  memoryBytesP50: number | null;
  memoryBytesP99: number | null;
}
