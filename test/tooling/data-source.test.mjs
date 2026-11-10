import assert from 'node:assert/strict';
import test from 'node:test';
import { describeDataSource } from '@pengzhendong/worker-kit/data-source';

const now = Date.parse('2026-11-08T08:00:00Z');
const snapshot = { fetchedAt: now - 60_000, sourceTime: now - 70_000 };
const limits = { now, staleAfterMs: 300_000, runningTimeoutMs: 30_000 };

test('failure keeps the snapshot and recovery retains the previous failure time', () => {
  const failed = describeDataSource({
    ...limits,
    snapshot,
    latestRun: { status: 'failed', startedAt: now - 2_000, finishedAt: now },
  });
  assert.deepEqual(failed, {
    snapshotState: 'fresh',
    refreshState: 'failed',
    sourceTime: '2026-11-08T07:58:50.000Z',
    lastSuccessAt: '2026-11-08T07:59:00.000Z',
    lastAttemptAt: '2026-11-08T07:59:58.000Z',
    lastFailureAt: '2026-11-08T08:00:00.000Z',
  });
  const recovered = describeDataSource({
    ...limits,
    now: now + 5_000,
    snapshot: { fetchedAt: now + 5_000 },
    latestRun: { status: 'success', startedAt: now + 1_000 },
    lastFailureAt: failed.lastFailureAt,
  });
  assert.equal(recovered.refreshState, 'success');
  assert.equal(recovered.lastSuccessAt, '2026-11-08T08:00:05.000Z');
  assert.equal(recovered.lastFailureAt, failed.lastFailureAt);
});

test('stale data and an expired running record remain distinct', () => {
  assert.equal(describeDataSource(limits).snapshotState, 'empty');
  const options = {
    ...limits,
    snapshot: { fetchedAt: now - limits.staleAfterMs },
    latestRun: {
      status: 'running',
      startedAt: now - limits.runningTimeoutMs + 1,
    },
  };
  const running = describeDataSource(options);
  assert.equal(running.snapshotState, 'stale');
  assert.equal(running.refreshState, 'running');
  const expired = describeDataSource({ ...options, now: now + 1 });
  assert.equal(expired.refreshState, 'unknown');
  assert.equal(expired.lastFailureAt, null);
});
