// Only bind the upstream template's user menu to its selected backend. The
// backend's native authentication implementation still owns every session.
export function backendLoginUrl(
  returnTo = location.pathname + location.search,
) {
  const backend = document.body.dataset.workerkitBackend;
  const path =
    backend === 'standard'
      ? '/standard/'
      : backend === 'sonic'
        ? '/auth/login'
        : '/admin/login';
  return path + '?redirect=' + encodeURIComponent(returnTo);
}
export async function logoutBackend() {
  const backend = document.body.dataset.workerkitBackend;
  const path =
    backend === 'standard'
      ? '/standard/api/auth/logout'
      : backend === 'sonic'
        ? '/auth/logout'
        : '/api/users/logout';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (backend === 'sonic') {
    const csrf = document.cookie
      .split(';')
      .map((item) => item.trim())
      .find((item) => item.startsWith('csrf_token='));
    if (csrf)
      headers['X-CSRF-Token'] = decodeURIComponent(
        csrf.slice('csrf_token='.length),
      );
  }
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers,
    body: '{}',
  });
  if (!response.ok && response.status !== 401) throw Error('退出失败，请重试');
  location.assign(backendLoginUrl());
}
