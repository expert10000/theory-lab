import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isQuantumJob,
  isQuantumResult,
  isWorkerCapabilities,
} from "../packages/contracts";
import fixture from "../packages/contracts/fixtures/two-level.job.json";
import evolutionFixture from "../packages/contracts/fixtures/rabi-evolution.job.json";
import { cavityDefaults, cavityJob } from "../packages/models/cavity";

test("canonical job fixture is compatible with v1", () =>
  assert.ok(isQuantumJob(fixture)));
test("evolution job accepts optional Layer-1 source IDs and rejects unsupported solvers", () => {
  assert.ok(isQuantumJob(evolutionFixture));
  assert.equal(
    isQuantumJob({
      ...evolutionFixture,
      solver: { ...evolutionFixture.solver, type: "lindblad" },
    }),
    false,
  );
  assert.equal(
    isQuantumJob({
      ...evolutionFixture,
      model: { ...evolutionFixture.model, source: { unknown: "x" } },
    }),
    false,
  );
  assert.equal(
    isQuantumJob({
      ...evolutionFixture,
      initialState: { type: "basis", index: 2 },
    }),
    false,
  );
});
test("reject incompatible versions, unknown fields, unsupported operations and invalid numbers", () => {
  for (const change of [
    { schema: "quantum-job/v2" },
    { extra: true },
    { operation: "evolve" },
    { engine: "unknown" },
    { jobId: "../file" },
  ]) {
    assert.equal(isQuantumJob({ ...fixture, ...change }), false);
  }
  for (const delta of [NaN, Infinity, "1", 1e7]) {
    assert.equal(
      isQuantumJob({
        ...fixture,
        model: { type: "two_level", parameters: { delta, omega: 0.8 } },
      }),
      false,
    );
  }
});
test("native engine is accepted by the existing v1 job and result shapes", () => {
  assert.ok(isQuantumJob({ ...fixture, engine: "native" }));
  assert.ok(isQuantumJob({ ...evolutionFixture, engine: "native" }));
});
test("capabilities advertise only implemented operations", () => {
  const caps = {
    schema: "worker-capabilities/v1",
    protocol: 1,
    worker: { version: "0.1.0" },
    python: { version: "3.12" },
    engines: {
      qutip: { available: false, version: null },
      native: { available: true, version: "1.18.1" },
    },
    operations: [],
  };
  assert.ok(isWorkerCapabilities(caps));
  assert.equal(isWorkerCapabilities({ ...caps, protocol: 2 }), false);
  assert.equal(
    isWorkerCapabilities({ ...caps, operations: ["steady_state"] }),
    false,
  );
});
test("results require complete provenance and exactly two finite energies", () => {
  const result = {
    schema: "quantum-result/v1",
    jobId: fixture.jobId,
    runId: "run-1",
    status: "completed",
    operation: "diagonalize",
    model: fixture.model,
    engine: { name: "qutip", version: "5" },
    spectrum: { eigenvalues: [-0.5, 0.5], units: "normalized", hbar: 1 },
    provenance: {
      pythonVersion: "3.12",
      workerVersion: "0.1.0",
      computedAt: "2026-09-23T00:00:00Z",
      durationMs: 1,
    },
  };
  assert.ok(isQuantumResult(result));
  assert.equal(isQuantumResult({ ...result, provenance: undefined }), false);
  assert.equal(
    isQuantumResult({
      ...result,
      spectrum: { ...result.spectrum, eigenvalues: [1] },
    }),
    false,
  );
});
test("cavity jobs and binary results use a strict versioned shape", () => {
  const job = cavityJob("jaynes_cummings", "cavity-1", cavityDefaults("jaynes_cummings"),
    { qubit: "excited", photons: 0 },
    { type: "schrodinger", tStart: 0, tStop: 10, samples: 101 }, "qutip");
  assert.ok(isQuantumJob(job));
  assert.equal(isQuantumJob({ ...job, model: { ...job.model, parameters: { ...job.model.parameters, cutoff: 2 } } }), false);
  assert.equal(isQuantumJob({ ...job, initialState: { qubit: "excited", photons: -1 } }), false);
  const result = {
    schema: "quantum-result/v1", jobId: job.jobId, runId: "run-1", status: "completed",
    operation: "cavity", model: job.model, initialState: job.initialState, solver: job.solver,
    engine: { name: "qutip", version: "5.3.1" },
    dressedSpectrum: Array.from({ length: 2 * job.model.parameters.cutoff }, (_, i) => i),
    data: { schema: "quantum-cavity-data/v1", format: "f64le", path: "cavity-1.f64", rows: 101,
      columns: ["time", "p_excited", "mean_photon", "boundary_probability", "norm", "parity"],
      bytes: 101 * 48, sha256: "a".repeat(64) },
    provenance: { pythonVersion: "3.12", workerVersion: "0.1", computedAt: "2026-09-26T00:00:00Z", durationMs: 1 },
  };
  assert.ok(isQuantumResult(result));
  assert.equal(isQuantumResult({ ...result, data: { ...result.data, columns: ["time"] } }), false);
  assert.equal(isQuantumResult({ ...result, unexpected: true }), false);
});
