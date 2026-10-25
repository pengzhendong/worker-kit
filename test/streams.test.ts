import { expect, it } from 'vitest';
import { BodyLimitError, readBytesLimited, readTextLimited } from '../src/server/streams.ts';

it('counts UTF-8 bytes across chunks, allows the exact limit and releases the reader', async () => {
  const stream = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new Uint8Array([0xe4])); c.enqueue(new Uint8Array([0xb8, 0xad])); c.close(); } });
  expect(await readTextLimited(stream, 3)).toBe('中');
  expect(stream.locked).toBe(false);
  expect(await readBytesLimited(null, 0)).toEqual(new Uint8Array());
});
it('cancels oversized sources without trusting headers or exposing their content', async () => {
  let reason: unknown;
  const stream = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new Uint8Array(4)); }, cancel(error) { reason = error; } });
  await expect(readBytesLimited(stream, 3)).rejects.toBeInstanceOf(BodyLimitError);
  expect(reason).toBeInstanceOf(BodyLimitError); expect(stream.locked).toBe(false);
  for (const invalid of [-1, NaN, Infinity, 1.5]) await expect(readBytesLimited(null, invalid)).rejects.toBeInstanceOf(RangeError);
});
it('aborts a stalled stream, cancels its source and releases the lock', async () => {
  const controller = new AbortController(); let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
  const pending = readBytesLimited(stream, 100, controller.signal);
  controller.abort();
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  expect(cancelled).toBe(true); expect(stream.locked).toBe(false);
  await expect(readBytesLimited(null, 0, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
});
it('propagates source failures and releases the lock', async () => {
  const stream = new ReadableStream<Uint8Array>({ start(c) { c.error(new Error('source failed')); } });
  await expect(readBytesLimited(stream, 100)).rejects.toThrow('source failed');
  expect(stream.locked).toBe(false);
});
