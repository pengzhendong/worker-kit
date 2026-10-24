import { useCallback, useEffect, useState } from 'react';
import type { createApiClient } from './api';
import { isRequestCancelled } from './session';

/** An uncached GET query. Supply a session-scoped client for identity isolation. No automatic retries. */
export function useApiQuery<T>(request: ReturnType<typeof createApiClient>, path: string | null) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{ path: string | null; version: number; data?: T; error: string; loading: boolean }>({ path: null, version: -1, error: '', loading: true });
  const refresh = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    if (path === null) { setState({ path, version, error: '', loading: false }); return; }
    const controller = new AbortController();
    setState((previous) => ({ path, version, data: previous.path === path ? previous.data : undefined, error: '', loading: true }));
    request<T>(path, { signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setState({ path, version, data, error: '', loading: false });
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted && !isRequestCancelled(failure)) setState((previous) => ({ ...previous, path, version, error: failure instanceof TypeError ? '网络连接失败，请稍后重试' : failure instanceof Error ? failure.message : '请求失败', loading: false }));
    });
    return () => controller.abort();
  }, [request, path, version]);
  const samePath = state.path === path;
  return { data: samePath ? state.data : undefined, error: samePath && state.version === version ? state.error : '', loading: path !== null && (!samePath || state.version !== version || state.loading), refresh };
}
