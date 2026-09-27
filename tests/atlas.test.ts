import assert from "node:assert/strict";
import test from "node:test";
import { ATLAS_ENTRIES, ATLAS_PRESETS, ATLAS_REVISION, atlasEntry, atlasUrl } from "../packages/atlas";
import { atlasBinding } from "../packages/atlas/bindings";
import { assertJob } from "../packages/contracts";
import { spectrumJob, evolutionJob } from "../packages/models";
import { cavityJob } from "../packages/models/cavity";
import { manyBodyJob } from "../packages/models/many_body";

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
  const ids = ["two_level_pauli", "semiclassical_rabi_drive", "landau_zener", "floquet_two_level", "jaynes_cummings", "rabi", "ising_chain"];
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
    } else {
      job = manyBodyJob("atlas-test", Object.fromEntries(Object.entries(binding.parameters).map(([key, value]) => [key, String(value)])) as never, "open", "native");
      assert.equal(job.model.parameters.longitudinal, 0);
    }
    assertJob(job);
  }
  assert.equal(atlasBinding("graphene_nn"), null);
});
