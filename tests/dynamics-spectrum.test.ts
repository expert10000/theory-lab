import { test } from "node:test";
import assert from "node:assert/strict";
import { sampledPopulationSpectrum } from "../apps/desktop/renderer/dynamics-spectrum";

test("sampled population response preserves recorded frequency and rejects a shifted time grid", () => {
  const rows = 129, data = new Float64Array(rows * 10);
  for (let i = 0; i < rows; i++) {
    data[i * 10] = i / 128;
    data[i * 10 + 2] = 0.5 + 0.4 * Math.cos(2 * Math.PI * 8 * i / rows);
  }
  const spectrum = sampledPopulationSpectrum(data, rows);
  const peak = spectrum.reduce((best, point) => point.magnitude > best.magnitude ? point : best);
  assert.ok(Math.abs(peak.frequency - 8 / (rows / 128)) < 1e-12);
  assert.ok(peak.magnitude > 0.15);
  data[10 * 10] += 0.01;
  assert.throws(() => sampledPopulationSpectrum(data, rows), /not uniformly recorded/);
});
