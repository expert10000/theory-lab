import { test } from "node:test";
import assert from "node:assert/strict";
import { alignScientificSeries, matchTwoLevelEigenstates } from "../packages/models/scientific-alignment";
import { compareVerifiedRuns } from "../packages/models/run-comparison";
import type { VerifiedSavedRun } from "../packages/contracts";

test("unit-aware linear alignment excludes extrapolation and marks uncertainty", () => {
  const a = { positions: [0, 0.5, 1], values: [0, 1, 2], coordinateUnit: "rad", valueUnit: "probability" };
  const b = { positions: [0, 180 / Math.PI], values: [0, 2], coordinateUnit: "deg", valueUnit: "probability" };
  assert.equal(alignScientificSeries(a, b, "exact"), null);
  const aligned = alignScientificSeries(a, b, "linear")!;
  assert.deepEqual(aligned.b.map(value => Number(value.toFixed(8))), [0, 1, 2]);
  assert.equal(aligned.policy, "linear");
  assert.match(aligned.flags.join(" "), /uncertainty not quantified|source uncertainty not quantified/);
  assert.equal(alignScientificSeries({ ...a, valueUnit: "GHz" }, b, "linear"), null);
  assert.equal(alignScientificSeries({ ...a, positions: [-2, -1, 0] }, b, "linear"), null);
});

test("eigenstate matching is sign invariant and refuses degenerate or ambiguous pairs", () => {
  const a = { gap: 2, threshold: 1e-8, states: [
    { amplitudes: [1, 0] as [number, number] }, { amplitudes: [0, 1] as [number, number] }] };
  const b = { ...a, states: [
    { amplitudes: [0, -1] as [number, number] }, { amplitudes: [-1, 0] as [number, number] }] };
  assert.deepEqual(matchTwoLevelEigenstates(a, b)?.assignment, [1, 0]);
  assert.deepEqual(matchTwoLevelEigenstates(a, b)?.fidelities, [1, 1]);
  assert.equal(matchTwoLevelEigenstates({ ...a, gap: 0 }, b), null);
  const rotated = { ...a, states: [
    { amplitudes: [Math.SQRT1_2, Math.SQRT1_2] as [number, number] },
    { amplitudes: [Math.SQRT1_2, -Math.SQRT1_2] as [number, number] }] };
  assert.equal(matchTwoLevelEigenstates(a, rotated), null);
});

test("verified time runs require explicit interpolation policy", () => {
  const make = (id: string, times: number[], populations: number[]): VerifiedSavedRun => {
    const bytes = new Uint8Array(times.length * 3 * 8), view = new DataView(bytes.buffer);
    times.forEach((time, index) => [time, populations[index], 1].forEach((value, column) =>
      view.setFloat64((index * 3 + column) * 8, value, true)));
    return { job: {} as VerifiedSavedRun["job"], data: bytes,
      result: { operation: "evolve", runId: id, model: { type: "driven_two_level", parameters: {} },
        data: { columns: ["time", "p1", "norm"], rows: times.length, bytes: bytes.byteLength },
        engine: { name: "native", version: "test" }, provenance: { durationMs: 1 } } as unknown as VerifiedSavedRun["result"] };
  };
  const a = make("a", [0, 0.5, 1], [0, 0.5, 1]);
  const b = make("b", [0, 1], [0, 1]);
  assert.equal(compareVerifiedRuns(a, b).status, "metadata-only");
  const comparison = compareVerifiedRuns(a, b, { interpolation: "linear" });
  assert.equal(comparison.observables[0].alignment, "linear");
  assert.deepEqual(comparison.observables[0].b, [0, 0.5, 1]);
});
