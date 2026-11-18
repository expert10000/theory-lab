import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { BoseHubbardResult } from "../packages/contracts/bose-hubbard";
import { isBoseHubbardJob, isBoseHubbardResult } from "../packages/contracts/bose-hubbard";
import { boseHubbardJob, consistentBoseHubbardResult } from "../packages/models/bose-hubbard";
import { BoseHubbardRunStore } from "../apps/desktop/main/bose-hubbard-runs";
import { WorkerSupervisor } from "../apps/desktop/main/worker";
import { BoseHubbardLab } from "../apps/desktop/renderer/BoseHubbardLab";

const job = boseHubbardJob(2, 0, "bh-n2-test");
const root2 = Math.SQRT1_2;
const result: BoseHubbardResult = {
  schema: "quantum-bose-hubbard-result/v1", jobId: job.jobId, runId: "run-bh-n2-test",
  status: "completed", model: job.model,
  engine: { name: "native", version: "2.0" },
  basis: { leftOccupations: [0, 1, 2], ordering: "|n,N-n> ascending n" },
  spectrum: { energies: [-2, 0, 2], gap: 2, energyUnits: "J" },
  states: [
    { index: 0, amplitudes: [.5, root2, .5], occupation: [1, 1],
      numberVariance: [.5, .5], oneBodyCoherence: 1, residual: 0, normalizationError: 0 },
    { index: 1, amplitudes: [root2, 0, -root2], occupation: [1, 1],
      numberVariance: [1, 1], oneBodyCoherence: 0, residual: 0, normalizationError: 0 },
    { index: 2, amplitudes: [.5, -root2, .5], occupation: [1, 1],
      numberVariance: [.5, .5], oneBodyCoherence: -1, residual: 0, normalizationError: 0 },
  ],
  units: { occupation: "bosons per site", numberVariance: "bosons^2",
    oneBodyCoherence: "bosons" },
  provenance: { pythonVersion: "3.12", workerVersion: "0.1.0",
    computedAt: "2026-11-18T00:00:00+00:00", durationMs: 1 },
};

test("separate dimer contract leaves frozen job/result v1 intact", () => {
  assert.ok(isBoseHubbardJob(job));
  for (const change of [{ particles: 9 }, { interactionRatio: -1 },
    { hopping: 2 }, { boundary: "periodic" }])
    assert.equal(isBoseHubbardJob({ ...job, model: { ...job.model,
      parameters: { ...job.model.parameters, ...change } } }), false);
  assert.equal(isBoseHubbardJob({ ...job, engine: "quspin" }), false);
  assert.ok(isBoseHubbardResult(result));
});

test("dimer verifier checks energies, amplitudes, observables and units", () => {
  assert.ok(consistentBoseHubbardResult(job, result));
  const altered = structuredClone(result);
  altered.states[0].oneBodyCoherence = .5;
  assert.equal(consistentBoseHubbardResult(job, altered), false);
  altered.states[0].oneBodyCoherence = 1;
  altered.states[0].amplitudes[0] = .6;
  assert.equal(consistentBoseHubbardResult(job, altered), false);
  assert.equal(isBoseHubbardResult({ ...result, units: { ...result.units, occupation: "spin" } }), false);
});

test("saved dimer reopens after store restart and withholds changed evidence", async () => {
  const temp = await mkdtemp(join(tmpdir(), "qlab-bh-"));
  try {
    const first = new BoseHubbardRunStore(temp);
    const summary = await first.record(job, result);
    const reopened = new BoseHubbardRunStore(temp);
    assert.equal((await reopened.get(result.runId)).states[0].oneBodyCoherence, 1);
    assert.equal((await reopened.list())[0].resultSha256, summary.resultSha256);
    await assert.rejects(first.record(job, result), /already exists/);
    const resultFile = join(temp, result.runId, "result.json");
    const changed = JSON.parse(await readFile(resultFile, "utf8"));
    changed.states[0].oneBodyCoherence = .5;
    const changedText = JSON.stringify(changed, null, 2) + "\n";
    await writeFile(resultFile, changedText);
    await assert.rejects(reopened.get(result.runId), /integrity check/);
    // Even a rewritten manifest cannot make inconsistent numerical values valid.
    const manifestFile = join(temp, result.runId, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
    manifest.resultSha256 = createHash("sha256").update(changedText).digest("hex");
    await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
    await assert.rejects(reopened.get(result.runId), /scientific consistency/);
    assert.equal((await reopened.list()).length, 0);
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("Atlas dimer pane exposes bounded controls and an honest scene boundary", () => {
  const html = renderToStaticMarkup(React.createElement(BoseHubbardLab, { ready: false }));
  assert.match(html, /Dimer particles N/);
  assert.match(html, /Dimer interaction U over J/);
  assert.match(html, /Native worker unavailable/);
  assert.match(html, /verified scene and Math3D handoff are the next milestone/i);
  assert.match(html, /Run and save dimer/);
});

test("supervised worker produces a saved dimer that reopens without recomputation", async () => {
  const temp = await mkdtemp(join(tmpdir(), "qlab-bh-worker-"));
  const worker = new WorkerSupervisor(process.cwd());
  try {
    await worker.start();
    assert.equal(worker.status.state, "READY");
    const output = await worker.request("quantum.boseHubbard", boseHubbardJob(3, 2, "bh-real-worker"));
    assert.ok(isBoseHubbardResult(output));
    assert.ok(consistentBoseHubbardResult(boseHubbardJob(3, 2, "bh-real-worker"), output));
    const store = new BoseHubbardRunStore(temp);
    await store.record(boseHubbardJob(3, 2, "bh-real-worker"), output);
    const reopened = await new BoseHubbardRunStore(temp).get(output.runId);
    assert.deepEqual(reopened.states, output.states);
  } finally { await worker.stop(); await rm(temp, { recursive: true, force: true }); }
});
