import assert from 'node:assert/strict';
import test from 'node:test';
import {
  activateFrame,
  previewMessageEntry,
  suspendFrame,
} from '../../examples/ui-suite/preview-protocol.js';
const fixture = () => {
  const messages = [];
  const entry = {
    key: 'https://frame.test/workspace',
    frame: { contentWindow: { postMessage: (...args) => messages.push(args) } },
  };
  return { entry, messages };
};
test('preview messages must match a still-owned window, expected origin and known message type', () => {
  const { entry } = fixture(),
    entries = new Map([[entry.key, entry]]);
  const event = {
    source: entry.frame.contentWindow,
    origin: 'https://frame.test',
    data: { type: 'workerkit:preview-ready' },
  };
  assert.equal(previewMessageEntry(entries, event), entry);
  assert.equal(
    previewMessageEntry(entries, {
      ...event,
      origin: 'https://untrusted.test',
    }),
    undefined,
  );
  assert.equal(
    previewMessageEntry(entries, { ...event, source: {} }),
    undefined,
  );
  assert.equal(
    previewMessageEntry(entries, { ...event, data: { type: 'unknown' } }),
    undefined,
  );
  entries.clear();
  assert.equal(previewMessageEntry(entries, event), undefined);
});
test('activation retries one id, settles once and cancels timers when discarded', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const { entry, messages } = fixture();
  const first = activateFrame(entry);
  const id = entry.request;
  t.mock.timers.tick(250);
  assert.ok(messages.length >= 2);
  assert.ok(
    messages.every(
      ([data, origin]) => data.id === id && origin === 'https://frame.test',
    ),
  );
  entry.finish(true);
  assert.equal(await first, true);
  const count = messages.length;
  t.mock.timers.tick(10000);
  assert.equal(messages.length, count);
  const second = activateFrame(entry);
  entry.finish(false);
  assert.equal(await second, false);
  const after = messages.length;
  t.mock.timers.tick(10000);
  assert.equal(messages.length, after);
});
test('suspension changes the request generation without carrying user data', () => {
  const { entry, messages } = fixture();
  entry.request = 'old';
  suspendFrame(entry);
  assert.notEqual(entry.request, 'old');
  assert.deepEqual(Object.keys(messages[0][0]).sort(), ['id', 'type']);
  assert.equal(entry.settled, false);
});
