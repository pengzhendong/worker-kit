export type SessionResetReason = 'signed-in' | 'signed-out' | 'expired' | 'identity-changed';
export interface SessionReset { version: number; reason: SessionResetReason }
export const requestCancelled = () => new DOMException('请求已取消', 'AbortError');
export function isRequestCancelled(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/** Session-scoped work, independent of the application's identity provider and cache library. */
export function createSessionScope() {
  let version = 0;
  const requests = new Set<AbortController>();
  const cleanups = new Set<() => void>();
  const listeners = new Set<(event: SessionReset) => void>();
  function reset(reason: SessionResetReason) {
    version++;
    for (const controller of requests) controller.abort();
    requests.clear();
    let failed = false;
    // Clear only registered user data; never clear all localStorage (theme/preferences survive).
    for (const cleanup of cleanups) {
      try {
        const result: unknown = cleanup();
        if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
          // Async adapters must cancel separately and synchronously clear their user cache here.
          void Promise.resolve(result).catch(() => {}); failed = true;
        }
      } catch { failed = true; }
    }
    for (const listener of listeners) { try { listener({ version, reason }); } catch { failed = true; } }
    if (failed) throw new Error('会话数据清理失败，请重新加载应用');
  }
  async function run<T>(task: (signal: AbortSignal) => Promise<T>, callerSignal?: AbortSignal | null): Promise<T> {
    const started = version; const controller = new AbortController();
    const abort = () => controller.abort();
    if (callerSignal?.aborted) throw requestCancelled();
    callerSignal?.addEventListener('abort', abort, { once: true });
    requests.add(controller);
    let rejectAbort: (() => void) | undefined;
    const cancelled = new Promise<never>((_, reject) => {
      rejectAbort = () => reject(requestCancelled());
      controller.signal.addEventListener('abort', rejectAbort, { once: true });
    });
    try {
      const result = await Promise.race([Promise.resolve().then(() => {
        if (controller.signal.aborted || started !== version) throw requestCancelled();
        return task(controller.signal);
      }), cancelled]);
      if (controller.signal.aborted || started !== version) throw requestCancelled();
      return result;
    } finally {
      requests.delete(controller);
      callerSignal?.removeEventListener('abort', abort);
      if (rejectAbort) controller.signal.removeEventListener('abort', rejectAbort);
    }
  }
  return {
    run, reset,
    get version() { return version; },
    /** Old responses cannot expire a newer session. Multiple simultaneous 401s reset once. */
    expire(expectedVersion: number) { if (expectedVersion === version) reset('expired'); },
    registerCleanup(cleanup: () => void) { cleanups.add(cleanup); return () => { cleanups.delete(cleanup); }; },
    subscribe(listener: (event: SessionReset) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}
export type SessionScope = ReturnType<typeof createSessionScope>;
