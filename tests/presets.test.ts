import { test } from "node:test";
import assert from "node:assert/strict";
import { isQuantumJob, type CavityResult, type EvolutionResult, type LindbladResult } from "../packages/contracts";
import { evaluatePreset } from "../packages/models/presetChecks";
import { PRESETS, THEORY_REVISION, presetJob } from "../packages/models/presets";

test("all Volume VIII presets build valid pinned jobs for both engines", () => {
  assert.equal(PRESETS.length, 6);
  assert.equal(new Set(PRESETS.map(preset => preset.id)).size, PRESETS.length);
  for (const preset of PRESETS) {
    for (const engine of ["qutip", "native"] as const) {
      const job = presetJob(preset, `preset-${preset.id}-${engine}`, engine);
      assert.ok(isQuantumJob(job), preset.id);
      assert.equal(job.model.source?.sourceRepository, `https://github.com/expert10000/theory/tree/${THEORY_REVISION}`);
      assert.ok(job.model.source?.sourceModule?.startsWith("examples/python/qutip/"));
      assert.equal(job.model.source?.exampleId, preset.source.exampleId);
    }
  }
});

test("analytic checks accept exact preset curves, reject perturbation and skip variants", () => {
  for (const preset of PRESETS) {
    if (preset.id === "viii-landau-zener") continue;
    const job = presetJob(preset, `check-${preset.id}`);
    const stride = job.operation === "evolve" ? 10 : job.operation === "cavity" ? 6 : 7;
    const values = new Float64Array(preset.solver.samples * stride);
    for (let i = 0; i < preset.solver.samples; i++) {
      const t = preset.solver.tStart + i * (preset.solver.tStop - preset.solver.tStart) / (preset.solver.samples - 1);
      values[i * stride] = t;
      if (preset.id === "viii-resonant-rabi") values[i * stride + 2] = Math.sin(t / 2) ** 2;
      if (preset.id === "viii-vacuum-rabi") values[i * stride + 1] = Math.cos(.35 * t) ** 2;
      if (preset.id === "viii-t1-relaxation") values[i * stride + 1] = Math.exp(-.35 * t);
      if (preset.id === "viii-dephasing") {
        values[i * stride + 3] = (1 + Math.exp(-.5 * t)) / 2;
        values[i * stride + 4] = .5 * Math.exp(-.25 * t);
      }
      if (preset.id === "viii-cavity-loss") values[i * stride + 2] = 2 * Math.exp(-.18 * t);
    }
    const result = { operation: job.operation, model: job.model,
      initialState: job.initialState, solver: job.solver,
      data: { rows: preset.solver.samples } } as EvolutionResult | CavityResult | LindbladResult;
    assert.equal(evaluatePreset(preset, result, values)?.passed, true, preset.id);
    const column = preset.id === "viii-dephasing" ? 4 :
      preset.id === "viii-resonant-rabi" || preset.id === "viii-cavity-loss" ? 2 : 1;
    values[stride + column] += .01;
    assert.equal(evaluatePreset(preset, result, values)?.passed, false, preset.id);
    const changedWindow = { ...result, solver: { ...result.solver, tStop: 11 } } as typeof result;
    assert.equal(evaluatePreset(preset, changedWindow, values), null);
  }
});
