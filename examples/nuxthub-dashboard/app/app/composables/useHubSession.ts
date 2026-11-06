import {
  ApiClientError,
  createApiClient,
  createSessionScope,
  isRequestCancelled,
} from '@pengzhendong/worker-kit/client';
export function useHubSession() {
  const root = useRuntimeConfig().app.baseURL;
  const session = shallowRef<{ username: string } | null>(null);
  const checking = ref(true),
    busy = ref(false),
    error = ref('');
  const form = reactive({ username: '', password: '' });
  const scope = createSessionScope(),
    lifetime = new AbortController(),
    toast = useToast();
  const auth = createApiClient({ baseUrl: root + 'api/admin' });
  const api = createApiClient({ baseUrl: root + 'api/admin', scope });
  const unsubscribe = scope.subscribe((event) => {
    if (event.reason === 'expired' || event.reason === 'signed-out') {
      session.value = null;
      form.password = '';
      busy.value = false;
      toast.clear();
    }
  });
  onScopeDispose(() => {
    lifetime.abort();
    unsubscribe();
    scope.reset('signed-out');
  });
  async function inspect() {
    try {
      session.value = await auth<{ username: string }>('/auth/session', {
        signal: lifetime.signal,
      });
    } catch (cause) {
      if (
        !isRequestCancelled(cause) &&
        !(cause instanceof ApiClientError && cause.status === 401)
      )
        error.value = cause instanceof Error ? cause.message : '无法读取会话';
    } finally {
      checking.value = false;
    }
  }
  async function login() {
    if (busy.value) return;
    busy.value = true;
    error.value = '';
    try {
      const user = await auth<{ username: string }>('/auth/login', {
        method: 'POST',
        signal: lifetime.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      scope.reset('signed-in');
      session.value = user;
      form.password = '';
    } catch (cause) {
      if (!isRequestCancelled(cause))
        error.value = cause instanceof Error ? cause.message : '登录失败';
    } finally {
      busy.value = false;
    }
  }
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST', signal: lifetime.signal });
      scope.reset('signed-out');
    } catch (cause) {
      if (!isRequestCancelled(cause)) error.value = '退出失败，请重试';
    }
  }
  onMounted(inspect);
  return { root, session, checking, busy, error, form, scope, login, logout };
}
