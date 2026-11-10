/**
 * Publish to an explicitly configured ntfy topic. Delivery is best effort.
 * @param {{ topicUrl?: string, token?: string, title: string, message: string }} options
 * @param {typeof fetch} [fetcher]
 * @returns {Promise<'disabled' | 'sent' | 'failed'>}
 */
export async function publishTaskNotification(
  { topicUrl, token, title, message },
  fetcher = fetch,
) {
  if (!topicUrl) return 'disabled';
  try {
    const url = new URL(topicUrl);
    const topic = url.pathname.split('/').at(-1);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !topic ||
      !/^[-_a-zA-Z0-9]{1,64}$/.test(topic)
    )
      return 'failed';

    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetcher(new URL('./', url), {
      method: 'POST',
      headers,
      body: JSON.stringify({ topic, title, message }),
      redirect: 'error',
      signal: AbortSignal.timeout(3000),
    });
    await response.body?.cancel().catch(() => {});
    return response.ok ? 'sent' : 'failed';
  } catch {
    return 'failed';
  }
}
