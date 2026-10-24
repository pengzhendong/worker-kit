import type { OpenAPIV3_1 as O } from 'openapi-types';
import { createRoot } from 'react-dom/client';
import { ApiReferenceReact } from '@scalar/api-reference-react';
import { AppErrorBoundary, WorkerKitProvider, useApiQuery } from '@pengzhendong/worker-kit/web';
import { Alert, Spin } from 'antd';
import { createApiClient } from '@pengzhendong/worker-kit/web';
import '@scalar/api-reference-react/style.css';

const lifetime = new AbortController();
window.addEventListener('pagehide', () => lifetime.abort(), { once: true });
const referenceFetch: typeof fetch = async (input, init) => {
  const request = new Request(input instanceof Request ? input : new URL(String(input), location.origin), init);
  if (new URL(request.url).origin !== location.origin) throw new Error('API 文档仅允许请求当前应用');
  const response = await fetch(request, { credentials: request.headers.has('Authorization') ? 'omit' : 'same-origin', cache: 'no-store', redirect: 'error', signal: AbortSignal.any([lifetime.signal, request.signal]) });
  if (response.status === 401 && !request.headers.has('Authorization')) parent.postMessage({ type: 'workerkit:api-session-expired' }, location.origin);
  return response;
};
const api = createApiClient({ fetcher: referenceFetch });
function Reference() {
  const { data, error, loading, refresh } = useApiQuery<O.Document>(api, '/api/admin/openapi.json');
  if (loading) return <Spin style={{ padding: 32 }} />;
  if (error || !data) return <Alert type="error" title={error || '无法读取 API 文档'} action={<button onClick={refresh}>重试</button>} />;
  const selected = new URLSearchParams(location.search).get('operation');
  const paths: O.PathsObject = {};
  let title = data.info.title;
  if (selected) for (const [path, item] of Object.entries(data.paths ?? {})) {
    for (const method of ['get', 'post', 'put', 'delete', 'patch'] as const) {
      if (item?.[method]?.operationId === selected) { paths[path] = { [method]: item[method] }; title = item[method]!.summary ?? title; }
    }
  }
  const content = { ...data, servers: [{ url: location.origin }], ...(selected ? { info: { ...data.info, title }, paths } : {}) };
  return <ApiReferenceReact configuration={{ content, theme: 'default', layout: 'classic', showSidebar: false, defaultOpenAllTags: true, defaultOpenFirstTag: true, forceDarkModeState: new URLSearchParams(location.search).get('theme') === 'dark' ? 'dark' : 'light', hideDarkModeToggle: true, withDefaultFonts: false, persistAuth: false, telemetry: false, proxyUrl: '', agent: { disabled: true }, hideClientButton: true, showDeveloperTools: 'never', customCss: '.selected-client-action, .generate-sdk-button { display: none !important; }', customFetch: referenceFetch, localization: { locale: 'zh-CN' } }} />;
}
createRoot(document.getElementById('root')!).render(<AppErrorBoundary scope="application"><WorkerKitProvider><Reference /></WorkerKitProvider></AppErrorBoundary>);
