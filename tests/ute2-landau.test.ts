import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isLandauJob, isLandauResult } from "../packages/contracts/landau";
import { landauEquilibrium, landauJob, consistentLandauResult } from "../packages/models/landau";
import { LandauRunStore } from "../apps/desktop/main/landau-runs";
import { WorkerSupervisor } from "../apps/desktop/main/worker";

const reference = { a1: -0.7, a2: -0.5, b1: 1, b2: 1, g: 0.4 };

test("bounded Landau contract rejects coefficients outside the declared model", () => {
  const job = landauJob(reference, "gl-contract");
  assert.ok(isLandauJob(job));
  for (const change of [{ a1: -2.1 }, { b1: 0 }, { b2: 4.1 }, { g: -0.1 }, { g: Infinity }])
    assert.equal(isLandauJob(landauJob({ ...reference, ...change }, "gl-contract")), false);
  assert.equal(isLandauJob({ ...job, model: { ...job.model, type: "ute2_fit" } }), false);
});

test("chapter mixed example and normal, pure, first-order and marginal cases", () => {
  const mixed = landauEquilibrium(reference);
  assert.deepEqual(mixed.globalMinima, ["mixed"]);
  assert.ok(Math.abs(mixed.candidates[3].x - 0.5952380952380952) < 1e-12);
  assert.ok(Math.abs(mixed.candidates[3].y - 0.261904761904762) < 1e-12);
  assert.equal(mixed.quarticDeterminant, 0.84);
  assert.deepEqual(landauEquilibrium({ ...reference, a1: 0.3, a2: 0.5 }).globalMinima, ["normal"]);
  assert.deepEqual(landauEquilibrium({ ...reference, a1: -1, a2: 0.5 }).globalMinima, ["sc1"]);
  assert.deepEqual(landauEquilibrium({ ...reference, a1: 0.5, a2: -1 }).globalMinima, ["sc2"]);
  assert.deepEqual(landauEquilibrium({ a1: -0.5, a2: -0.5, b1: 1, b2: 1, g: 1.2 }).globalMinima, ["sc1", "sc2"]);
  const marginal = landauEquilibrium({ a1: -0.5, a2: -0.5, b1: 1, b2: 1, g: 1 });
  assert.equal(marginal.marginalQuartic, true);
  assert.deepEqual(marginal.globalMinima, ["sc1", "sc2"]);
  // Independently sample the nonnegative quadrant; no sample can beat the analytic minimum.
  const best = mixed.candidates.find(row => row.phase === "mixed")!.freeEnergy;
  for (let i = 0; i <= 100; i++) for (let j = 0; j <= 100; j++) {
    const x = i/100, y = j/100;
    const sampled = reference.a1*x + reference.a2*y + x*x/2 + y*y/2 + reference.g*x*y;
    assert.ok(sampled >= best - 1e-12);
  }
});

test("real worker result survives restart and refuses changed or scientifically forged evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "qlab-landau-"));
  const worker = new WorkerSupervisor(process.cwd());
  try {
    await worker.start();
    assert.equal(worker.status.state, "READY");
    const job = landauJob(reference, "gl-worker-reference");
    const result = await worker.request("quantum.landau", job);
    assert.ok(isLandauResult(result));
    assert.ok(consistentLandauResult(job, result));
    const store = new LandauRunStore(root);
    const summary = await store.record(job, result);
    const reopened = new LandauRunStore(root);
    assert.deepEqual((await reopened.get(result.runId)).globalMinima, ["mixed"]);
    assert.equal((await reopened.list())[0].resultSha256, summary.resultSha256);
    const file = join(root, result.runId, "result.json");
    const altered = JSON.parse(await readFile(file, "utf8"));
    altered.candidates[3].freeEnergy += 0.1;
    const changedText = JSON.stringify(altered, null, 2) + "\n";
    await writeFile(file, changedText);
    await assert.rejects(reopened.get(result.runId), /integrity check/);
    const manifestFile = join(root, result.runId, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
    manifest.resultSha256 = createHash("sha256").update(changedText).digest("hex");
    await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
    await assert.rejects(reopened.get(result.runId), /scientific consistency/);
    assert.deepEqual(await reopened.list(), []);
  } finally { await worker.stop(); await rm(root, { recursive: true, force: true }); }
});
