export interface HealthCheckResult { name: string; status: 'ok' | 'error' | 'timeout'; durationMs: number }
/** Bounded, read-only checks supplied by the application. Never return values, errors or bindings. */
export async function runHealthChecks(checks: readonly { name: string; check: () => Promise<unknown> }[], options: { timeoutMs?: number } = {}) {
  const timeoutMs = options.timeoutMs ?? 1500;
  if (!checks.length || checks.length > 16 || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 5000 || new Set(checks.map((check) => check.name)).size !== checks.length) throw new Error('Invalid health check configuration');
  const results = await Promise.all(checks.map(async ({ name, check }): Promise<HealthCheckResult> => {
    const started = performance.now(); let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const status = await Promise.race([
        Promise.resolve().then(check).then(() => 'ok' as const, () => 'error' as const),
        new Promise<'timeout'>((resolve) => { timer = setTimeout(() => resolve('timeout'), timeoutMs); }),
      ]);
      return { name, status, durationMs: Math.round(performance.now() - started) };
    } finally { if (timer !== undefined) clearTimeout(timer); }
  }));
  return { ok: results.every((result) => result.status === 'ok'), checks: results };
}
