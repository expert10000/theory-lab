import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compareEvolution,
  compareSpectrum,
} from "../packages/quantum-3d/comparison";
import type { EvolutionResult, SpectrumResult } from "../packages/contracts";

const spectrum = {
  model: { type: "two_level", parameters: { delta: 1, omega: 0.8 } },
  engine: { name: "qutip" },
  spectrum: { eigenvalues: [-0.5, 0.5] },
  provenance: { durationMs: 4 },
} as SpectrumResult;

test("spectrum comparison reports the maximum paired energy difference", () => {
  const native = {
    ...spectrum,
    engine: { name: "native" },
    spectrum: { eigenvalues: [-0.49, 0.51] },
    provenance: { durationMs: 2 },
  } as SpectrumResult;
  const report = compareSpectrum(spectrum, native);
  assert.ok(Math.abs(report.maxEnergyDifference - 0.01) < 1e-14);
  assert.equal(report.nativeRuntimeMs, 2);
});

test("evolution fidelity ignores global phase but detects drift and observables", () => {
  const base = {
    model: {
      type: "driven_two_level",
      parameters: { delta: 0, amplitude: 1, frequency: 0, phase: 0 },
    },
    solver: { type: "schrodinger", tStart: 0, tStop: 1, samples: 2 },
    initialState: { type: "basis", index: 0 },
    data: { rows: 2 },
    provenance: { durationMs: 3 },
  } as EvolutionResult;
  const qutip = new Float64Array([
    0,
    1,
    0,
    0,
    0,
    1,
    1,
    0,
    0,
    0,
    1,
    0.5,
    0.5,
    1,
    0,
    0,
    Math.SQRT1_2,
    0,
    Math.SQRT1_2,
    0,
  ]);
  const native = new Float64Array([
    0,
    1,
    0,
    0,
    0,
    1,
    -1,
    0,
    0,
    0,
    1,
    0.5,
    0.5,
    1,
    0,
    0,
    -Math.SQRT1_2,
    0,
    -Math.SQRT1_2,
    0,
  ]);
  const report = compareEvolution(
    { ...base, engine: { name: "qutip", version: "5" } },
    qutip,
    { ...base, engine: { name: "native", version: "1" } },
    native,
  );
  assert.equal(report.maxObservableDifference, 0);
  assert.ok(Math.abs(report.minStateFidelity - 1) < 1e-14);
  native[11] = 0.6;
  native[16] *= 1.1;
  const changed = compareEvolution(
    { ...base, engine: { name: "qutip", version: "5" } },
    qutip,
    { ...base, engine: { name: "native", version: "1" } },
    native,
  );
  assert.ok(changed.maxObservableDifference > 0.099);
  assert.ok(changed.maxNormDriftNative > 0.05);
  assert.ok(changed.minStateFidelity < 1);
});
