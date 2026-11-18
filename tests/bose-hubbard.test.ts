import { test } from "node:test";
import assert from "node:assert/strict";
import type { BoseHubbardResult } from "../packages/contracts/bose-hubbard";
import { isBoseHubbardJob, isBoseHubbardResult } from "../packages/contracts/bose-hubbard";
import { boseHubbardJob, consistentBoseHubbardResult } from "../packages/models/bose-hubbard";

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
