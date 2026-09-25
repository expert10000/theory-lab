import { test } from "node:test";
import assert from "node:assert/strict";
import { sampleAt } from "../packages/quantum-3d/evolution";

test("one selected binary row drives populations, Bloch vector, state and density", () => {
  const data = new Float64Array([
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
    2,
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
  const initial = sampleAt(data, 0);
  const selected = sampleAt(data, 1);
  assert.equal(initial.time, 0);
  assert.deepEqual(initial.bloch, [0, 0, 1]);
  assert.equal(selected.time, 2);
  assert.deepEqual(selected.populations, [0.5, 0.5]);
  assert.deepEqual(selected.bloch, [1, 0, 0]);
  assert.ok(Math.abs(selected.density[0][1].re - 0.5) < 1e-14);
  assert.deepEqual(selected.density[1][0], {
    re: selected.density[0][1].re,
    im: -selected.density[0][1].im,
  });
  assert.equal(selected.trace, 1);
  assert.ok(Math.abs(selected.purity - 1) < 1e-14);
});

test("density coherence preserves complex phase and rows are bounds checked", () => {
  const data = new Float64Array([
    1,
    0.5,
    0.5,
    0,
    1,
    0,
    Math.SQRT1_2,
    0,
    0,
    Math.SQRT1_2,
  ]);
  const selected = sampleAt(data, 0);
  assert.ok(Math.abs(selected.density[0][1].im + 0.5) < 1e-14);
  assert.ok(Math.abs(selected.density[1][0].im - 0.5) < 1e-14);
  assert.ok(
    Math.abs(selected.bloch[1] + 2 * selected.density[0][1].im) < 1e-14,
  );
  assert.throws(() => sampleAt(data, 1), RangeError);
  assert.throws(() => sampleAt(new Float64Array(9), 0));
});
