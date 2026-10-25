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

// Plain JSON Schema / OpenAPI 3.1 objects; no generator or validator dependency.
const string = { type: 'string' as const };
const timestamp = { ...string, format: 'date-time' };
const number = { type: 'number' as const, minimum: 0 };
const nullValue = { type: 'null' as const };
export const runtimeSnapshotSchema = {
  type: 'object' as const,
  required: ['application', 'runtime', 'environment', 'checkedAt', 'ok', 'version', 'checks'],
  properties: {
    application: { type: 'object' as const, required: ['name', 'version'], properties: { name: string, version: string } },
    runtime: { ...string, const: 'Cloudflare Workers' }, environment: string, checkedAt: timestamp, ok: { type: 'boolean' as const },
    version: { type: 'object' as const, required: ['id', 'tag', 'createdAt'], properties: {
      id: { anyOf: [string, nullValue] }, tag: { anyOf: [string, nullValue] }, createdAt: { anyOf: [timestamp, nullValue] },
    } },
    checks: { type: 'array' as const, items: { type: 'object' as const, required: ['name', 'kind', 'description', 'status', 'durationMs'], properties: {
      name: string, kind: { ...string, enum: ['database', 'kv', 'storage', 'service'] }, description: string,
      status: { ...string, enum: ['ok', 'error', 'timeout'] }, durationMs: number,
    } } },
  },
};
export const runtimeMetricsSchema = {
  type: 'object' as const,
  required: ['source', 'status', 'message', 'from', 'to', 'requests', 'errors', 'cpuMsP50', 'cpuMsP99', 'wallMsP50', 'wallMsP99', 'memoryBytesP50', 'memoryBytesP99'],
  properties: {
    source: { ...string, const: 'cloudflare' }, status: { ...string, enum: ['ok', 'not-configured', 'error'] }, message: string, from: timestamp, to: timestamp,
    requests: { anyOf: [number, nullValue] }, errors: { anyOf: [number, nullValue] },
    cpuMsP50: { anyOf: [number, nullValue] }, cpuMsP99: { anyOf: [number, nullValue] },
    wallMsP50: { anyOf: [number, nullValue] }, wallMsP99: { anyOf: [number, nullValue] },
    memoryBytesP50: { anyOf: [number, nullValue] }, memoryBytesP99: { anyOf: [number, nullValue] },
  },
};
