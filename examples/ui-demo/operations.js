import { ApiClientError, createApiClient } from '../../src/client/index.ts';

const previewParentOrigin =
  typeof window !== 'undefined' && window.parent !== window && document.referrer
    ? new URL(document.referrer).origin
    : null;
const isPublicPreviewPage = () =>
  !document.querySelector('[data-workspace]') &&
  (/^\/(nuxt|prime|vben|pro|refine|tabler|adminlte)\/(?:tasks|resources|logs|settings|components\/(?:table|form|dialogs|preview|layout|theme))?\/?$/.test(
    location.pathname,
  ) ||
    /^\/docs\/(?:index|guide|components|features|upgrades|alternatives|architecture|migration)?(?:\.html)?\/?$/.test(
      location.pathname,
    ));
const fromPreviewParent = (event) =>
  previewParentOrigin &&
  event.source === window.parent &&
  event.origin === previewParentOrigin &&
  ['workerkit:preview-refresh', 'workerkit:preview-suspend'].includes(
    event.data?.type,
  ) &&
  typeof event.data.id === 'string';
// Public component demos have no server identity/data. Keep their forms, dialogs
// and route mounted too; leaving Workspace must not force a framework reboot.
if (previewParentOrigin)
  window.addEventListener('message', (event) => {
    if (fromPreviewParent(event) && isPublicPreviewPage())
      window.parent.postMessage(
        { type: 'workerkit:preview-cleared', id: event.data.id, public: true },
        previewParentOrigin,
      );
  });

// Framework-neutral client; rendering stays in each upstream's native components.
export function createOperationsClient(options = {}) {
  const api = createApiClient({
    baseUrl: options.baseUrl || '/api/workerkit',
    scope: options.scope,
  });
  const listeners = new Set();
  let state = {
    data: null,
    busy: false,
    error: '',
    unauthorized: false,
    issuedToken: '',
  };
  let keysCursor, auditCursor;
  let controller;
  let pending;
  let revision = 0;
  let disposed = false;
  let preloadOnly =
    !!previewParentOrigin && window.name === 'workerkit-preload';
  let activationId;
  const emit = (patch) => {
    if (disposed) return;
    state = { ...state, ...patch };
    listeners.forEach((fn) => fn());
  };
  const read = async (signal) => {
    if (state.issuedToken) emit({ issuedToken: '' });
    const started = revision;
    const query = new URLSearchParams();
    if (keysCursor) query.set('keysCursor', keysCursor);
    if (auditCursor) query.set('auditCursor', auditCursor);
    const data = await api('/workspace' + (query.size ? '?' + query : ''), {
      signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
    });
    if (started !== revision || disposed) return;
    emit({
      data: { ...data, runs: data.runs.slice(0, 5) },
      unauthorized: false,
    });
  };
  const action = (run) => {
    if (state.busy || disposed) return pending;
    pending = (async () => {
      const started = revision;
      controller = new AbortController();
      emit({ busy: true, error: '' });
      try {
        await run(controller.signal, started);
      } catch (error) {
        if (!controller.signal.aborted && started === revision)
          emit({
            data: null,
            issuedToken: '',
            unauthorized:
              error instanceof ApiClientError && error.status === 401,
            error:
              error instanceof ApiClientError
                ? error.message
                : error?.name === 'TimeoutError'
                  ? '请求超时，请重试'
                  : '操作失败，请重试',
          });
      } finally {
        emit({ busy: false });
        if (started === revision)
          notify({ type: 'workerkit:preview-settled', id: activationId });
      }
    })();
    return pending;
  };
  // The showcase may keep this app mounted. Revalidate before revealing it again;
  // old identity/permissions/data must never flash after an external logout.
  const parentOrigin = previewParentOrigin;
  const notify = (message) => {
    if (parentOrigin) window.parent.postMessage(message, parentOrigin);
  };
  const onPreview = async (event) => {
    if (!fromPreviewParent(event)) return;
    const id = event.data.id;
    if (event.data.type === 'workerkit:preview-suspend') {
      ++revision;
      controller?.abort();
      preloadOnly = true;
      activationId = undefined;
      keysCursor = auditCursor = undefined;
      emit({
        data: null,
        busy: false,
        unauthorized: false,
        error: '',
        issuedToken: '',
      });
      notify({ type: 'workerkit:preview-cleared', id });
      return;
    }
    window.name = '';
    preloadOnly = false;
    if (isPublicPreviewPage() || activationId === id) return;
    activationId = id;
    const started = ++revision;
    emit({ data: null, unauthorized: false, error: '', issuedToken: '' });
    // Reveal the mounted framework once old private content has been cleared.
    // Network refresh continues inside the app instead of blocking the whole preview.
    setTimeout(() => {
      if (!disposed && started === revision)
        notify({ type: 'workerkit:preview-cleared', id });
    }, 0);
    await pending;
    if (disposed || started !== revision) return;
    await action(read);
    // Let the native framework commit its render before the parent reveals us.
    setTimeout(() => {
      if (!disposed && started === revision)
        notify({ type: 'workerkit:preview-refreshed', id });
    }, 0);
  };
  if (parentOrigin) window.addEventListener('message', onPreview);
  notify({ type: 'workerkit:preview-ready', ready: true });
  const mutate = (suffix, body, signal, method = 'POST') => {
    const csrf = document.cookie
      .split('; ')
      .find((value) => value.startsWith('csrf_token='))
      ?.slice('csrf_token='.length);
    return api(suffix, {
      method,
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...(csrf ? { 'X-CSRF-Token': decodeURIComponent(csrf) } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  };
  const write = (path, body, signal) => {
    const csrf = document.cookie
      .split('; ')
      .find((value) => value.startsWith('csrf_token='))
      ?.slice('csrf_token='.length);
    return api('/managed-tasks' + path, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...(csrf ? { 'X-CSRF-Token': decodeURIComponent(csrf) } : {}),
      },
      body: JSON.stringify(body),
    });
  };
  return {
    snapshot: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    refresh: () => (preloadOnly ? Promise.resolve() : action(read)),
    create: (task, minutes, inputs = {}) =>
      action(async (signal) => {
        await write(
          '',
          {
            task,
            schedule: { kind: 'interval', minutes: Number(minutes) },
            inputs,
          },
          signal,
        );
        await read(signal);
      }),
    change: (path, id) =>
      action(async (signal) => {
        await write('/' + path, { id }, signal);
        await read(signal);
      }),
    saveSettings: (values) =>
      action(async (signal, started) => {
        const saved = await mutate('/settings', { values }, signal, 'PUT');
        await read(signal);
        if (started === revision && state.data?.management)
          emit({
            data: {
              ...state.data,
              management: { ...state.data.management, settings: saved },
            },
          });
      }),
    issueKey: (name, expiresInDays) =>
      action(async (signal, started) => {
        const issued = await mutate(
          '/keys',
          {
            name,
            expiresInDays: Number(expiresInDays),
            permissions: ['runtime:read'],
          },
          signal,
        );
        await read(signal);
        if (started === revision && state.data?.management) {
          const current = state.data.management.keys;
          emit({
            issuedToken: issued.token,
            data: {
              ...state.data,
              management: {
                ...state.data.management,
                keys: {
                  ...current,
                  items: [
                    issued.key,
                    ...(current?.items || []).filter(
                      (item) => item.id !== issued.key.id,
                    ),
                  ],
                },
              },
            },
          });
        }
      }),
    closeToken: () => emit({ issuedToken: '' }),
    revokeKey: (id) =>
      action(async (signal, started) => {
        const previous = state.data?.management?.keys?.items.find(
          (item) => item.id === id,
        );
        await mutate(
          '/keys/' + encodeURIComponent(id),
          undefined,
          signal,
          'DELETE',
        );
        await read(signal);
        if (started === revision && state.data?.management?.keys)
          emit({
            data: {
              ...state.data,
              management: {
                ...state.data.management,
                keys: {
                  ...state.data.management.keys,
                  items: previous
                    ? [
                        { ...previous, revokedAt: new Date().toISOString() },
                        ...state.data.management.keys.items.filter(
                          (item) => item.id !== id,
                        ),
                      ]
                    : state.data.management.keys.items,
                },
              },
            },
          });
      }),
    pageKeys: (cursor) => {
      keysCursor = cursor || undefined;
      return action(read);
    },
    pageAudit: (cursor) => {
      auditCursor = cursor || undefined;
      return action(read);
    },
    apiUrl: (suffix) => (options.baseUrl || '/api/workerkit') + suffix,
    dispose() {
      disposed = true;
      controller?.abort();
      if (parentOrigin) window.removeEventListener('message', onPreview);
      notify({
        type: 'workerkit:preview-ready',
        ready: parentOrigin ? isPublicPreviewPage() : false,
      });
      listeners.clear();
      state = {
        data: null,
        busy: false,
        error: '',
        unauthorized: false,
        issuedToken: '',
      };
    },
    loginUrl: () =>
      options.loginUrl ||
      (document.body.dataset.workerkitBackend === 'sonic'
        ? '/auth/login'
        : '/admin/login') +
        '?redirect=' +
        encodeURIComponent(location.pathname + location.search),
  };
}
export const runLabel = {
  running: '运行中',
  succeeded: '成功',
  failed: '失败',
  submitted: '已提交',
  unknown: '待确认',
};
export const formatTime = (value) =>
  value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—';
