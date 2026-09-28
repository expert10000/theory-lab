import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import Ajv from "ajv";
import fixture from "../packages/quantum-scene/fixtures/bloch-vector.json";
import schema from "../packages/quantum-scene/quantum-scene.v1.json";
import rejected from "../packages/quantum-scene/fixtures/rejected.json";
import { assertScene, verifyScenePayload, type ScenePayload } from "../packages/quantum-scene";

const digest = async (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const encode = (values: number[]) => { const b = Buffer.alloc(values.length * 8); values.forEach((v, i) => b.writeDoubleLE(v, i * 8)); return b; };
const fresh = () => structuredClone(fixture.scene);
const ajv = new Ajv({ strict: true });
const validate = ajv.compile(schema);
test("portable fixture agrees with JSON Schema and verifies little-endian data", async () => {
  const scene = fresh(); assertScene(scene); assert.ok(validate(scene));
  const arrays = await verifyScenePayload({ scene, artifacts: Object.fromEntries(Object.entries(fixture.values).map(([p, v]) => [p, encode(v)])) }, digest);
  assert.deepEqual([...arrays.get("directions")!], [0, 0, 1]);
});
test("scene rejects unknown versions, executable fields, paths, malformed numbers and references", () => {
  const mutations = [
    (s: any) => { s.schema = "quantum-scene/v2"; },
    (s: any) => { s.script = "alert(1)"; },
    (s: any) => { s.datasets[0].path = "../secret.f64"; },
    (s: any) => { s.datasets[0].path = "https://host/data.f64"; },
    (s: any) => { s.datasets[0].bytes = 8; },
    (s: any) => { s.datasets[0].count = Infinity; },
    (s: any) => { s.datasets.push(s.datasets[0]); },
    (s: any) => { s.objects[0].values = "missing"; },
    (s: any) => { s.objects[0].kind = "mesh"; },
    (s: any) => { s.camera.target = s.camera.position; },
    (s: any) => { s.camera.up = new Array(3); },
    (s: any) => { s.annotations[0].id = "bloch"; },
    (s: any) => { s.objects[0].style.opacity = NaN; },
  ];
  for (const mutate of mutations) { const scene = fresh(); mutate(scene); assert.throws(() => assertScene(scene)); }
});
test("schema-only structural rejection matches CSP-safe validator", () => {
  for (const fixture of rejected) {
    const s = fresh();
    if (fixture.field === "schema") s.schema = fixture.value;
    if (fixture.field === "path") s.datasets[0].path = fixture.value;
    if (fixture.field === "kind") s.objects[0].kind = fixture.value;
    assert.equal(validate(s), false, fixture.description); assert.throws(() => assertScene(s));
  }
  for (const value of [null, [], {}, { ...fresh(), title: "" }, { ...fresh(), objects: [] }, { ...fresh(), unknown: true }]) {
    assert.equal(validate(value), false); assert.throws(() => assertScene(value));
  }
  const parameters = { ...fresh(), provenance: { ...fresh().provenance, parameters: { delta: 1, boundary: "open" } } };
  assert.ok(validate(parameters)); assertScene(parameters);
  for (const values of [{ delta: NaN }, { delta: true }, { "unsafe-key": 1 }, {}]) {
    const invalid = { ...fresh(), provenance: { ...fresh().provenance, parameters: values } };
    assert.equal(validate(invalid), false); assert.throws(() => assertScene(invalid));
  }
});
test("mesh data cannot address out-of-range, fractional or negative vertices", async () => {
  for (const indices of [[0, 0, 1], [0, 0, .5], [0, 0, -1]]) {
    const scene = fresh() as unknown as ScenePayload["scene"];
    scene.objects[0].kind = "mesh"; delete scene.objects[0].values; scene.objects[0].indices = "indices";
    const bytes = encode(indices);
    scene.datasets.push({ id: "indices", path: "indices.f64", components: 3, count: 1, format: "f64le", unit: "vertex index", bytes: 24, sha256: await digest(bytes) });
    const payload = { scene, artifacts: { ...Object.fromEntries(Object.entries(fixture.values).map(([p, v]) => [p, encode(v)])), "indices.f64": bytes } };
    await assert.rejects(verifyScenePayload(payload, digest), /Invalid mesh indices/);
  }
});
test("artifact verification rejects substitution, truncation, extra files and non-finite coordinates", async () => {
  const scene = fresh(); assertScene(scene);
  const payload: ScenePayload = { scene, artifacts: Object.fromEntries(Object.entries(fixture.values).map(([p, v]) => [p, encode(v)])) };
  const substituted = structuredClone(payload); substituted.artifacts["directions.f64"][23] ^= 1;
  await assert.rejects(verifyScenePayload(substituted, digest), /integrity/);
  const short = structuredClone(payload); short.artifacts["directions.f64"] = new Uint8Array(8);
  await assert.rejects(verifyScenePayload(short, digest), /integrity/);
  const extra = structuredClone(payload); extra.artifacts["secret.f64"] = new Uint8Array(8);
  await assert.rejects(verifyScenePayload(extra, digest), /Unexpected/);
  const nan = structuredClone(payload); nan.artifacts["directions.f64"] = encode([NaN, 0, 1]);
  nan.scene.datasets[1].sha256 = await digest(nan.artifacts["directions.f64"]);
  await assert.rejects(verifyScenePayload(nan, digest), /Non-finite/);
});
