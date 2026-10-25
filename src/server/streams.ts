/** A byte limit, independent of Content-Length, compression and HTTP policy. */
export class BodyLimitError extends Error {
  readonly maxBytes: number;
  constructor(maxBytes: number) { super(`Body exceeds ${maxBytes} bytes`); this.name = 'BodyLimitError'; this.maxBytes = maxBytes; }
}

export async function readBytesLimited(stream: ReadableStream<Uint8Array> | null, maxBytes: number, signal?: AbortSignal): Promise<Uint8Array> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) throw new RangeError('Invalid byte limit');
  signal?.throwIfAborted();
  if (!stream) return new Uint8Array();
  const reader = stream.getReader();
  const cancel = (reason?: unknown) => { void reader.cancel(reason).catch(() => {}); };
  const abort = () => cancel(signal?.reason);
  signal?.addEventListener('abort', abort, { once: true });
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) { const error = new BodyLimitError(maxBytes); cancel(error); throw error; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes;
  } finally {
    signal?.removeEventListener('abort', abort);
    reader.releaseLock();
  }
}

export async function readTextLimited(stream: ReadableStream<Uint8Array> | null, maxBytes: number, signal?: AbortSignal): Promise<string> {
  return new TextDecoder().decode(await readBytesLimited(stream, maxBytes, signal));
}
