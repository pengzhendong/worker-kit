/** @typedef {string | number | null | undefined} Timestamp */

/** @param {Timestamp} value */
function timestamp(value) {
  if (typeof value === 'number') return value;
  return value ? Date.parse(value) : NaN;
}

/** @param {number} value */
function iso(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

/**
 * Describe the data being served separately from the latest refresh attempt.
 * The application still owns fetching, snapshot storage and write coordination.
 * @param {{
 *   snapshot?: { fetchedAt?: Timestamp, sourceTime?: Timestamp } | null,
 *   latestRun?: { status: 'running' | 'success' | 'partial' | 'failed', startedAt?: Timestamp, finishedAt?: Timestamp } | null,
 *   lastAttemptAt?: Timestamp,
 *   lastFailureAt?: Timestamp,
 *   staleAfterMs: number,
 *   runningTimeoutMs: number,
 *   now?: number,
 * }} options
 */
export function describeDataSource({
  snapshot,
  latestRun,
  lastAttemptAt,
  lastFailureAt,
  staleAfterMs,
  runningTimeoutMs,
  now = Date.now(),
}) {
  const startedAt = timestamp(latestRun?.startedAt);
  const fetchedAt = timestamp(snapshot?.fetchedAt);
  const failedAt =
    latestRun?.status === 'failed'
      ? timestamp(latestRun.finishedAt ?? latestRun.startedAt)
      : NaN;
  const newest = (/** @type {number[]} */ ...values) =>
    iso(Math.max(...values.filter(Number.isFinite)));
  const runStatus = latestRun?.status ?? 'idle';

  return {
    snapshotState: !snapshot
      ? 'empty'
      : now - fetchedAt < staleAfterMs
        ? 'fresh'
        : 'stale',
    refreshState:
      runStatus === 'running' && !(now - startedAt < runningTimeoutMs)
        ? 'unknown'
        : runStatus,
    sourceTime: iso(timestamp(snapshot?.sourceTime)),
    lastSuccessAt: iso(fetchedAt),
    lastAttemptAt: newest(timestamp(lastAttemptAt), startedAt),
    lastFailureAt: newest(timestamp(lastFailureAt), failedAt),
  };
}
