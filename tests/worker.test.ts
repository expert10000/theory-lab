import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WorkerSupervisor } from '../apps/desktop/main/worker';
import type { ChildProcess } from 'node:child_process';

test('supervised real Python handshake, errors, restart and shutdown', async () => {
  const worker = new WorkerSupervisor(process.cwd());
  try {
    assert.equal((await worker.start()).state, 'READY');
    assert.deepEqual(await worker.request('health'), {status:'ok'});
    await assert.rejects(worker.request('unsupported'), /Method not found/);
    assert.equal(worker.status.state, 'READY');
    const child = (worker as unknown as {child:ChildProcess}).child;
    const exited = new Promise(resolve => child.once('exit', resolve));
    child.kill(); await exited;
    assert.equal(worker.status.state, 'ERROR');
    assert.equal((await worker.restart()).state, 'READY');
  } finally { await worker.stop(); }
  assert.equal(worker.status.state, 'STOPPED');
});

test('missing Python interpreter produces an actionable error', async () => {
  const worker = new WorkerSupervisor(process.cwd() + '/missing-install');
  try {
    const result = await worker.start();
    assert.equal(result.state, 'ERROR');
    assert.match(result.detail, /setup:python/);
  } finally { await worker.stop(); }
});
