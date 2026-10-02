import { test } from "node:test";
import assert from "node:assert/strict";
import { selectedRabiSample } from "../apps/desktop/renderer/rabi-selection";
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
