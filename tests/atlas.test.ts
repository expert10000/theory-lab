import assert from "node:assert/strict";
import test from "node:test";
import { ATLAS_ENTRIES, ATLAS_PRESETS, ATLAS_REVISION, atlasEntry, atlasUrl } from "../packages/atlas";
import { atlasBinding } from "../packages/atlas/bindings";
import { assertJob } from "../packages/contracts";
import { spectrumJob, evolutionJob } from "../packages/models";
import { cavityJob } from "../packages/models/cavity";
import { manyBodyJob } from "../packages/models/many_body";
import { consistentTopologyResult, isTopologyResponse, topologyJob, TOPOLOGY_DEFAULTS } from "../packages/models/topology";
import { isQuantumJob } from "../packages/contracts";

test("pinned Atlas snapshot is complete, connected and reference-only", () => {
  assert.equal(ATLAS_REVISION, "61791aff00c0f35a82ec6f2271deded5cc5e99d6");
  assert.equal(ATLAS_ENTRIES.length, 48);
  const ids = new Set(ATLAS_ENTRIES.map(entry => entry.id));
  assert.equal(ids.size, 48);
  for (const entry of ATLAS_ENTRIES) {
    assert.equal(entry.computation.adapter, null);
    assert.equal(entry.computation.runnable, null);
    assert.ok(entry.formula.latex && entry.basis.description);
    assert.match(atlasUrl(entry), /^https:\/\/github.com\/expert10000\/theory\/blob\/61791aff/);
    for (const relation of entry.relations) assert.ok(ids.has(relation.target), `${entry.id} → ${relation.target}`);
    if (entry.computation.default_preset) assert.equal(ATLAS_PRESETS[entry.computation.default_preset as keyof typeof ATLAS_PRESETS]?.model, entry.id);
  }
  assert.ok(atlasEntry("ssh"));
  assert.ok(atlasEntry("qwz"));
});

test("Atlas lab bindings are contract-valid and preserve explicit Hamiltonian coefficients", () => {
  const ids = ["two_level_pauli", "semiclassical_rabi_drive", "landau_zener", "floquet_two_level", "jaynes_cummings", "rabi", "ising_chain", "ssh", "qwz"];
  for (const id of ids) {
    const binding = atlasBinding(id);
    assert.ok(binding, id);
    let job;
    if (binding.kind === "spectrum") {
      job = spectrumJob("atlas-test", Object.fromEntries(Object.entries(binding.parameters).map(([key, value]) => [key, String(value)])), "native");
      assert.equal(job.model.parameters.delta / 2, 1);
      assert.equal(job.model.parameters.omega / 2, 0);
    } else if (binding.kind === "dynamics") {
      job = evolutionJob(binding.modelId, "atlas-test", Object.fromEntries(Object.entries(binding.parameters).map(([key, value]) => [key, String(value)])), 0, 0, 10, 31, "native");
      if (id === "semiclassical_rabi_drive") assert.equal(binding.parameters.amplitude / 2, atlasEntry(id)!.parameters.find(p => p.symbol === "Omega")!.default);
      if (id === "floquet_two_level") assert.equal(binding.parameters.amplitude / 2, atlasEntry(id)!.parameters.find(p => p.symbol === "A")!.default);
      if (id === "landau_zener") assert.deepEqual(binding.parameters, { sweepRate: 1, gap: 0.2, bias: 0 });
    } else if (binding.kind === "cavity") {
      job = cavityJob(binding.modelId, "atlas-test", Object.fromEntries(Object.entries(binding.parameters).map(([key, value]) => [key, String(value)])), { qubit: "excited", photons: 0 }, { type: "schrodinger", tStart: 0, tStop: 10, samples: 31 }, "native");
      assert.equal(job.model.parameters.qubitFrequency / 2, 0.5); // absolute energies differ by this global offset
    } else if (binding.kind === "many_body") {
      job = manyBodyJob("atlas-test", Object.fromEntries(Object.entries(binding.parameters).map(([key, value]) => [key, String(value)])) as never, "open", "native");
      assert.equal(job.model.parameters.longitudinal, 0);
    } else if (binding.modelId === "ssh") {
      job = topologyJob("atlas-test", { ...TOPOLOGY_DEFAULTS, modelId: "ssh", t1: String(binding.parameters.t1), t2: String(binding.parameters.t2) });
      assert.deepEqual(job.model.parameters, { t1: 0.6, t2: 1, cells: 16, kPoints: 101 });
    } else {
      job = topologyJob("atlas-test", { ...TOPOLOGY_DEFAULTS, modelId: "qwz", mass: String(binding.parameters.mass), grid: String(binding.parameters.grid) });
      assert.deepEqual(job.model.parameters, { mass: 1, grid: 21 });
    }
    assertJob(job);
  }
  assert.equal(atlasBinding("graphene_nn"), null);
});

test("topology contract bounds the mesh and rejects inconsistent scientific arrays", () => {
  const job = topologyJob("qwz-test", { ...TOPOLOGY_DEFAULTS, modelId: "qwz" });
  assertJob(job);
  assert.equal(isQuantumJob({ ...job, model: { type: "qwz", parameters: { mass: -1, grid: 1000 } } }), false);
  const mock = { schema: "quantum-result/v1", jobId: job.jobId, runId: "run-test", status: "completed",
    operation: "topology", model: job.model, engine: { name: "native", version: "1" },
    analysis: { kind: "qwz", bulkGap: 2, sampledGap: 2, gapClosed: false, chern: -1,
      latticeChern: -1, analyticChern: -1, meshResolved: true,
      chernIntegral: -1, berryCurvature: Array(21 * 21).fill(0) },
    provenance: { pythonVersion: "3", workerVersion: "1", computedAt: new Date().toISOString(), durationMs: 1 } } as const;
  assert.equal(consistentTopologyResult(job, mock), false);
});

test("browser topology guard validates bounded inline arrays without code generation", () => {
  const job = topologyJob("ssh-web-guard", { ...TOPOLOGY_DEFAULTS, t1: "0", t2: "1", cells: "4", kPoints: "21" });
  const density = [0.5, 0, 0, 0, 0, 0, 0, 0.5];
  const value = { schema: "quantum-result/v1", jobId: job.jobId, runId: "run-guard", status: "completed",
    operation: "topology", model: job.model, engine: { name: "native", version: "1.18" },
    analysis: { kind: "ssh", bulkGap: 2, winding: 1, kValues: Array(21).fill(0),
      lowerBand: Array(21).fill(-1), upperBand: Array(21).fill(1), edgeEnergies: [0, 0],
      edgeDensity: density, edgeWeight: 1 },
    provenance: { pythonVersion: "3.12", workerVersion: "0.1", computedAt: "2026-09-27T00:00:00Z", durationMs: 1 } };
  assert.equal(isTopologyResponse(value, job), true);
  assert.equal(isTopologyResponse({ ...value, analysis: { ...value.analysis, edgeDensity: [Infinity, ...density.slice(1)] } }, job), false);
  assert.equal(isTopologyResponse({ ...value, analysis: { ...value.analysis, kValues: [0] } }, job), false);
});
