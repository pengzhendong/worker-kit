const receivedTypes = new Set([
  'workerkit:preview-ready',
  'workerkit:preview-settled',
  'workerkit:preview-cleared',
  'workerkit:preview-refreshed',
]);
/** Both window identity and origin must match a frame we still own. */
export function previewMessageEntry(entries, event) {
  if (!receivedTypes.has(event.data?.type)) return undefined;
  return [...entries.values()].find(
    (entry) =>
      entry.frame.contentWindow === event.source &&
      new URL(entry.key).origin === event.origin,
  );
}
export function suspendFrame(entry) {
  entry.request = crypto.randomUUID();
  entry.settled = false;
  entry.frame.contentWindow.postMessage(
    { type: 'workerkit:preview-suspend', id: entry.request },
    new URL(entry.key).origin,
  );
}
/** Repeated messages share one activation id. Native route transitions can drop the first. */
export function activateFrame(entry) {
  return new Promise((resolve) => {
    entry.finish?.(false);
    const finish = (ok) => {
      clearTimeout(timeout);
      clearInterval(retry);
      if (entry.finish === finish) entry.finish = undefined;
      resolve(ok);
    };
    const send = () =>
      entry.frame.contentWindow.postMessage(
        { type: 'workerkit:preview-refresh', id: entry.request },
        new URL(entry.key).origin,
      );
    const timeout = setTimeout(() => finish(false), 6000);
    const retry = setInterval(send, 100);
    entry.finish = finish;
    entry.request = crypto.randomUUID();
    send();
  });
}
