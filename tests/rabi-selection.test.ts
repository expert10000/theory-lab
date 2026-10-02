import { test } from "node:test";
import assert from "node:assert/strict";
import { selectedRabiSample } from "../apps/desktop/renderer/rabi-selection";
import { selectedEvolutionSample } from "../apps/desktop/renderer/evolution-selection";
import type { EvolutionResult } from "../packages/contracts";

const result = { runId: "saved-rabi", model: { type: "driven_two_level" }, data: { rows: 2 } } as EvolutionResult;
const data = new Float64Array([
  0, 1, 0, 0, 0, 1, 1, 0, 0, 0,
  1, 0, 1, 0, 0, -1, 0, 0, 1, 0,
]);

test("Rabi time selection resolves only within its exact run and artifact", () => {
  const selection = { kind: "time_sample", model: "driven_two_level", runId: "saved-rabi", index: 1 } as const;
  const sample = selectedRabiSample(selection, result, data);
  assert.equal(sample?.time, 1);
  assert.deepEqual(sample?.populations, [0, 1]);
  assert.equal(selectedRabiSample({ ...selection, runId: "another-run" }, result, data), null);
  assert.equal(selectedRabiSample({ ...selection, index: 2 }, result, data), null);
  assert.equal(selectedRabiSample(selection, result, data.subarray(0, 10)), null);
  assert.equal(selectedRabiSample(selection, { ...result, model: { type: "landau_zener" } } as EvolutionResult, data), null);
});

test("all four evolution selections reject cross-model and cross-run references", () => {
  for (const model of ["driven_two_level","landau_zener","stuckelberg","strong_drive"] as const) {
    const stored = { ...result, runId: `saved-${model}`, model: { type: model } } as EvolutionResult;
    const selection = { kind: "time_sample", model, runId: stored.runId, index: 1 } as const;
    assert.equal(selectedEvolutionSample(selection, stored, data)?.time, 1);
    assert.equal(selectedEvolutionSample({ ...selection, runId: "different" }, stored, data), null);
    assert.equal(selectedEvolutionSample({ ...selection, model: "driven_two_level" }, stored, data)?.time ?? null, model === "driven_two_level" ? 1 : null);
    assert.equal(selectedEvolutionSample(selection, stored, data.subarray(0,10)), null);
  }
});
