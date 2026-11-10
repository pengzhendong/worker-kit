import assert from 'node:assert/strict';
import test from 'node:test';
import { publishTaskNotification } from '@pengzhendong/worker-kit/task-notifications';

const payload = { title: '采集失败', message: '读取数据超时' };

test('optional ntfy transport sends UTF-8 JSON to the configured server', async () => {
  const result = await publishTaskNotification(
    {
      ...payload,
      topicUrl: 'https://notify.example/ntfy/private-topic',
      token: 'sample-token',
    },
    async (url, request) => {
      assert.equal(url.href, 'https://notify.example/ntfy/');
      assert.equal(request.method, 'POST');
      assert.equal(request.redirect, 'error');
      assert.equal(request.headers.get('Authorization'), 'Bearer sample-token');
      assert.deepEqual(JSON.parse(request.body), {
        ...payload,
        topic: 'private-topic',
      });
      return new Response(null, { status: 200 });
    },
  );
  assert.equal(result, 'sent');
});

test('missing or invalid configuration sends nothing and transport errors are contained', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    throw new Error('network failure');
  };
  assert.equal(await publishTaskNotification(payload, fetcher), 'disabled');
  assert.equal(
    await publishTaskNotification(
      { ...payload, topicUrl: 'http://notify.example/test' },
      fetcher,
    ),
    'failed',
  );
  assert.equal(calls, 0);
  const configured = { ...payload, topicUrl: 'https://notify.example/test' };
  assert.equal(await publishTaskNotification(configured, fetcher), 'failed');
  assert.equal(
    await publishTaskNotification(
      configured,
      async () => new Response(null, { status: 403 }),
    ),
    'failed',
  );
  assert.equal(calls, 1);
});
