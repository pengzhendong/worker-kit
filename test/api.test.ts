import { expect, it } from 'vitest';
import { ApiClientError, createApiClient } from '../src/web/api';

it('preserves status and error information without redirecting', async () => {
  const request = createApiClient({ fetcher: (async () => Response.json({ error: { code: 'unauthorized', message: '请先登录' }, requestId: 'request-1' }, { status: 401 })) as typeof fetch });
  await expect(request('/api/admin/overview')).rejects.toMatchObject({ status: 401, code: 'unauthorized', requestId: 'request-1' });
});

it('handles empty responses and rejects invalid JSON responses', async () => {
  const empty = createApiClient({ fetcher: (async () => new Response(null, { status: 204 })) as typeof fetch });
  expect(await empty('/api/auth/logout')).toBeUndefined();
  const html = createApiClient({ fetcher: (async () => new Response('<html>error</html>', { status: 502 })) as typeof fetch });
  await expect(html('/api/admin/overview')).rejects.toBeInstanceOf(ApiClientError);
  await expect(html('//another-host')).rejects.toThrow('single slash');
});
