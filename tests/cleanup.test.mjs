import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCleanup } from '../server/cleanup.ts';

test('cleanup serializes work and stop waits for the active cycle', async () => {
  let release; let count = 0;
  const pending = new Promise(resolve => { release = resolve; });
  const job = createCleanup({ run: async () => { count++; await pending; return 'completed'; } });
  const first = job.runNow(); const second = job.runNow();
  assert.equal(first, second);
  await Promise.resolve(); assert.equal(count, 1);
  let stopped = false;
  const stop = job.stop().then(() => { stopped = true; });
  await Promise.resolve(); assert.equal(stopped, false);
  release(); await Promise.all([first, stop]);
  await job.runNow(); assert.equal(count, 1);
});

test('maintenance failures are sanitized, throttled and followed by recovery', async () => {
  let now = 0; let fail = true;
  const events = [];
  const job = createCleanup({ now: () => now, logger: entry => events.push(entry),
    run: async () => { if (fail) throw Object.assign(new Error('PRIVATE_DATABASE_URL'), { code: 'P2010', meta: { code: '42501', message: 'private SQL' } }); return 'completed'; },
  });
  try {
    await job.runNow(); now = 60_000; await job.runNow();
    assert.equal(events.length, 1); assert.equal(events[0].event, 'warning');
    assert.equal(events[0].reason, '42501'); assert.equal(events[0].retryMs, 60_000);
    for (let i = 0; i < 10; i++) await job.runNow();
    now = 900_000; await job.runNow();
    assert.equal(events.length, 2); assert.equal(events[1].retryMs, 900_000);
    assert.equal(JSON.stringify(events).includes('private'), false);
    assert.equal(JSON.stringify(events).includes('PRIVATE_DATABASE_URL'), false);
    fail = false; await job.runNow();
    assert.equal(events.at(-1).code, 'CLEANUP_RECOVERED');
    fail = true; await job.runNow(); assert.equal(events.at(-1).retryMs, 60_000);
  } finally { await job.stop(); }
});

test('synchronous failures and failed logging do not reject the maintenance cycle', async () => {
  let fail = true;
  const job = createCleanup({ logger: () => { throw new Error('broken logging'); }, run: () => {
    if (fail) throw Object.assign(new Error('permissions'), { code: 'EACCES' });
    return Promise.resolve('completed');
  } });
  await job.runNow(); fail = false; await job.runNow(); await job.stop();
});

test('scheduled cycles never overlap while a prior task is pending', async () => {
  let release; let calls = 0;
  const pending = new Promise(resolve => { release = resolve; });
  const job = createCleanup({ intervalMs: 5, run: async () => { calls++; await pending; return 'completed'; } });
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(calls, 1);
  const stopped = job.stop(); release(); await stopped;
  await new Promise(resolve => setTimeout(resolve, 20)); assert.equal(calls, 1);
});
