import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Alert, Spin } from 'antd';
import { ApiReferenceReact } from '@scalar/api-reference-react';
import type { OpenAPIV3_1 as O } from 'openapi-types';
import { createApiClient } from './api';
import { useApiQuery } from './query';
import '@scalar/api-reference-react/style.css';

/** Mount in an application-owned standalone HTML document to isolate Scalar's styles/hash. */
export function ScalarReference({ specUrl = '/api/admin/openapi.json' }: { specUrl?: string }) {
  const lifetime = useRef(new AbortController());
  useEffect(() => {
    const controller = new AbortController(); lifetime.current = controller;
    const abort = () => controller.abort();
    window.addEventListener('pagehide', abort, { once: true });
    return () => { window.removeEventListener('pagehide', abort); controller.abort(); };
  }, []);
  const referenceFetch = useCallback<typeof fetch>(async (input, init) => {
    const request = new Request(input instanceof Request ? input : new URL(String(input), location.origin), init);
    if (new URL(request.url).origin !== location.origin) throw new Error('API 文档仅允许请求当前应用');
    const response = await fetch(request, { credentials: request.headers.has('Authorization') ? 'omit' : 'same-origin', cache: 'no-store', redirect: 'error', signal: AbortSignal.any([lifetime.current.signal, request.signal]) });
    if (response.status === 401 && !request.headers.has('Authorization')) parent.postMessage({ type: 'workerkit:api-session-expired' }, location.origin);
    return response;
  }, []);
  const api = useMemo(() => createApiClient({ fetcher: referenceFetch }), [referenceFetch]);
  const { data, error, loading, refresh } = useApiQuery<O.Document>(api, specUrl);
  if (loading) return <Spin style={{ padding: 32 }} />;
  if (error || !data) return <Alert type="error" title={error || '无法读取 API 文档'} action={<button onClick={refresh}>重试</button>} />;
  const selected = new URLSearchParams(location.search).get('operation');
  const paths: O.PathsObject = {};
  let title = data.info.title;
  if (selected) for (const [path, item] of Object.entries(data.paths ?? {})) {
    for (const method of ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'] as const) {
      if (item?.[method]?.operationId === selected) { paths[path] = { ...(item.parameters ? { parameters: item.parameters } : {}), [method]: item[method] }; title = item[method]!.summary ?? title; }
    }
  }
  const content = { ...data, servers: [{ url: location.origin }], ...(selected ? { info: { ...data.info, title }, paths } : {}) };
  return <ApiReferenceReact configuration={{ content, theme: 'default', layout: 'classic', showSidebar: false, defaultOpenAllTags: true, defaultOpenFirstTag: true, forceDarkModeState: new URLSearchParams(location.search).get('theme') === 'dark' ? 'dark' : 'light', hideDarkModeToggle: true, withDefaultFonts: false, persistAuth: false, telemetry: false, proxyUrl: '', agent: { disabled: true }, hideClientButton: true, showDeveloperTools: 'never', customCss: '.selected-client-action, .generate-sdk-button { display: none !important; }', customFetch: referenceFetch, localization: { locale: 'zh-CN' } }} />;
}
