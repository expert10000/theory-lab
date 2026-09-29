import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { regularGridFromZYX } from "../packages/quantum-scene/grid-order";
import { SceneBuilder } from "../packages/quantum-scene/builder";
import {
  verifyScenePayload,
  type QuantumScene,
} from "../packages/quantum-scene";
import fixture from "../packages/quantum-scene/fixtures/complex-field.json";

test("R3 supplied asymmetric z/y/x density is preserved in existing scene vocabulary", async () => {
  const x = [-2, 0, 2],
    y = [5, 6, 7, 8],
    z = [-1, 0, 1, 2, 3];
  const field = z.map((_, iz) =>
    y.map((_, iy) => x.map((_, ix) => 100 * iz + 10 * iy + ix)),
  );
  const before = structuredClone(field),
    mapped = regularGridFromZYX(x, y, z, field, "density");
  assert.deepEqual(mapped.grid, {
    shape: [3, 4, 5],
    origin: [-2, 5, -1],
    spacing: [2, 1, 1],
    order: "xyz-z-fastest",
  });
  for (let ix = 0; ix < x.length; ix++)
    for (let iy = 0; iy < y.length; iy++)
      for (let iz = 0; iz < z.length; iz++)
        assert.equal(
          mapped.values[(ix * y.length + iy) * z.length + iz],
          field[iz][iy][ix],
        );
  assert.deepEqual(field, before);
  const scene = structuredClone(fixture.scene) as unknown as QuantumScene;
  scene.fields = [];
  scene.objects = [];
  scene.datasets = [];
  scene.annotations = [];
  scene.coordinates.units = ["a0", "a0", "a0"];
  const digest = async (b: Uint8Array) =>
    createHash("sha256").update(b).digest("hex");
  const builder = new SceneBuilder(scene, digest);
  const real = await builder.data(
    "supplied-density",
    mapped.values,
    1,
    "a0^-3",
  );
  scene.fields.push({
    id: "density",
    label: "Supplied density (not a wavefunction)",
    kind: "scalar-field",
    real,
    grid: mapped.grid,
  });
  const payload = await builder.finish(),
    arrays = await verifyScenePayload(payload, digest);
  assert.deepEqual([...arrays.get(real)!], mapped.values);
  assert.equal(scene.fields[0].kind, "scalar-field");
  assert.equal("imaginary" in scene.fields[0], false);
  const python = spawnSync(
    process.execPath,
    [
      "scripts/python.mjs",
      "-c",
      "import json,sys,struct; from quantum_worker.scene import verify_scene_artifacts; p=json.load(sys.stdin); verify_scene_artifacts(p['scene'],{k:struct.pack('<'+str(len(v))+'d',*v) for k,v in p['values'].items()})",
    ],
    {
      input: JSON.stringify({
        scene,
        values: { "supplied-density.f64": mapped.values },
      }),
      encoding: "utf8",
    },
  );
  assert.equal(python.status, 0, python.stderr);
});

test("R3 conversion rejects nonuniform, descending, sparse, oversized and malformed fields without rescaling", () => {
  const axis = [0, 1, 2],
    field = axis.map((_, iz) =>
      axis.map((_, iy) => axis.map((_, ix) => 100 * iz + 10 * iy + ix)),
    );
  assert.deepEqual(
    regularGridFromZYX(axis, axis, axis, field).values.slice(0, 6),
    [0, 100, 200, 10, 110, 210],
  );
  for (const x of [
    [0],
    [0, 1],
    [2, 1, 0],
    [0, 1, Infinity],
    Array(3),
    [0, 1, 3],
    Array.from({ length: 50 }, (_, i) => i),
  ])
    assert.throws(() => regularGridFromZYX(x, axis, axis, field));
  const nan = structuredClone(field);
  nan[0][0][0] = NaN;
  const sparse = structuredClone(field);
  sparse[0][0] = Array(3);
  for (const invalid of [
    null,
    [],
    field.slice(0, 1),
    [[[]], [[]]],
    nan,
    sparse,
  ])
    assert.throws(() => regularGridFromZYX(axis, axis, axis, invalid));
  const signed = structuredClone(field);
  signed[0][0][0] = -2;
  assert.equal(regularGridFromZYX(axis, axis, axis, signed).values[0], -2);
  assert.throws(() => regularGridFromZYX(axis, axis, axis, signed, "density"));
});
