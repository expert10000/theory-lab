import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertBdGSectorJob, isBdGSectorJob, isBdGSectorResult } from "../packages/contracts/bdg-sector";
import { bdgSectorJob, bdgSectorSpectrum, consistentBdGSectorResult } from "../packages/models/bdg-sector";
import { BdGSectorRunStore } from "../apps/desktop/main/bdg-sector-runs";
import { WorkerSupervisor } from "../apps/desktop/main/worker";

const reference = { extent: 1.5, delta: .8, phaseRad: .4, points: 101 };

test("bounded BdG sector contract rejects unsupported grid and parameters", () => {
  const job = bdgSectorJob(reference, "bdg-contract");
  assert.ok(isBdGSectorJob(job));
  for (const change of [{extent: .4}, {delta: 2.1}, {phaseRad: 4}, {points: 203}, {delta: Infinity}])
    assert.equal(isBdGSectorJob(bdgSectorJob({...reference, ...change}, "bdg-contract")), false);
  assert.throws(() => assertBdGSectorJob(bdgSectorJob({...reference, points: 100}, "bdg-contract")));
  assert.equal(isBdGSectorJob({...job, model: {...job.model, type: "ute2_fit"}}), false);
});

test("chapter example, Hermitian matrix, branch symmetry and zero-gap masks", () => {
  const samples = bdgSectorSpectrum(reference);
  const center = samples[50];
  assert.equal(center.xi, 0);
  assert.equal(center.ePlus, .8);
  const xi = .6, delta = .8, phase = .4;
  const diagonal = Math.hypot(xi, delta);
  assert.equal(diagonal, 1);
  assert.equal((1+xi/diagonal)/2, .8);
  assert.equal((1-xi/diagonal)/2, .2);
  // Off-diagonal conjugates make H Hermitian; det(H - E I) = E² - ξ² - |Δ|².
  const off = {re: delta*Math.cos(phase), im: delta*Math.sin(phase)};
  assert.ok(Math.abs(off.re*off.re + off.im*off.im - delta*delta) < 1e-12);
  for (const row of samples) {
    assert.ok(Math.abs(row.eMinus+row.ePlus) < 1e-12);
    assert.ok(Math.abs(row.ePlus**2-row.xi**2-delta**2) < 1e-12);
    assert.ok(Math.abs((row.electronWeight ?? 0)+(row.holeWeight ?? 0)-1) < 1e-12);
  }
  const closed = bdgSectorSpectrum({...reference, delta: 0});
  assert.equal(closed[50].node, true);
  assert.equal(closed[50].electronWeight, null);
  assert.equal(closed[50].holeWeight, null);
  assert.ok(closed.every(row => row.pairingPhaseRad === null));
  assert.deepEqual(samples.map(row => row.ePlus), bdgSectorSpectrum({...reference, phaseRad: -1}).map(row => row.ePlus));
});

test("real BdG worker result persists and rejects changed or forged evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "qlab-bdg-sector-"));
  const worker = new WorkerSupervisor(process.cwd());
  try {
    await worker.start();
    assert.equal(worker.status.state, "READY");
    const job = bdgSectorJob(reference, "bdg-worker-reference");
    const result = await worker.request("quantum.bdgSector", job);
    assert.ok(isBdGSectorResult(result));
    assert.ok(consistentBdGSectorResult(job, result));
    assert.ok(Math.abs(result.samples[70].xi-.6) < 1e-12);
    assert.ok(Math.abs(result.samples[70].ePlus-1) < 1e-12);
    assert.ok(Math.abs(result.samples[70].electronWeight!-.8) < 1e-12);
    assert.ok(Math.abs(result.samples[70].holeWeight!-.2) < 1e-12);
    const store = new BdGSectorRunStore(root);
    const summary = await store.record(job, result);
    const reopened = new BdGSectorRunStore(root);
    assert.equal((await reopened.get(result.runId)).minimumPositiveEnergy, .8);
    assert.equal((await reopened.list())[0].resultSha256, summary.resultSha256);
    const file = join(root, result.runId, "result.json");
    const altered = JSON.parse(await readFile(file, "utf8"));
    altered.samples[50].ePlus += .1;
    const changedText = JSON.stringify(altered, null, 2)+"\n";
    await writeFile(file, changedText);
    await assert.rejects(reopened.get(result.runId), /integrity check/);
    const manifestFile = join(root, result.runId, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
    manifest.resultSha256 = createHash("sha256").update(changedText).digest("hex");
    await writeFile(manifestFile, JSON.stringify(manifest, null, 2)+"\n");
    await assert.rejects(reopened.get(result.runId), /scientific consistency/);
    assert.deepEqual(await reopened.list(), []);
  } finally { await worker.stop(); await rm(root, {recursive:true, force:true}); }
});
