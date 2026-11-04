import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { RunStore } from "../apps/desktop/main/runs";
import { assertQuantumResultV2, qwzResultV2 } from "../packages/contracts/result-v2";
import { verifyScenePayload } from "../packages/quantum-scene";

const fixtureRoot = resolve("packages/contracts/fixtures");
const runId = "run-05ce1036d70c466eb4f900944a85c474";
const runDir = join(fixtureRoot, runId);
const hash = async (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

test("QWZ v2 descriptor shares one verified saved v1 result across both scene views", async () => {
  const resultBytes = await readFile(join(runDir, "result.json"));
  const manifest = JSON.parse(await readFile(join(runDir, "manifest.json"), "utf8"));
  assert.equal(await hash(resultBytes), manifest.hashes.result);
  const descriptor = qwzResultV2(resultBytes);
  assertQuantumResultV2(descriptor, resultBytes);
  assert.deepEqual(descriptor, JSON.parse(await readFile(join(fixtureRoot, "qwz-result.v2.json"), "utf8")));
  assert.deepEqual(descriptor.datasets.map(d => d.shape), [[21], [21, 21], [21, 21], [21, 21]]);
  assert.deepEqual(descriptor.unavailable.map(d => d.role), ["eigenstates", "berry-connection"]);

  const store = new RunStore(fixtureRoot, fixtureRoot);
  assert.deepEqual(await store.resultV2(runId), descriptor);
  const [curvature, bands] = await Promise.all([store.scene(runId), store.scene(runId, "bands")]);
  assert.equal(curvature.scene.provenance.resultSha256, descriptor.source.resultSha256);
  assert.equal(bands.scene.provenance.resultSha256, descriptor.source.resultSha256);
  assert.equal(await hash(Buffer.from(JSON.stringify(curvature.scene, null, 2) + "\n")),
    "38f8275bfd0e568251ef44742fe7ef412c958cb066e713558768cc2872af65b5");
  assert.equal(await hash(Buffer.from(JSON.stringify(bands.scene, null, 2) + "\n")),
    "9759d1e5555fd8c7af7614a08e372593d55398894960f5d96eb41a349555890b");
  const [curvatureArrays, bandArrays] = await Promise.all([
    verifyScenePayload(curvature, hash), verifyScenePayload(bands, hash),
  ]);
  const result = JSON.parse(resultBytes.toString("utf8"));
  assert.deepEqual([...curvatureArrays.get("curvature")!], result.analysis.berryCurvature);
  assert.deepEqual([...bandArrays.get("band-energy-0")!], result.analysis.lowerBand);
  assert.deepEqual([...bandArrays.get("band-energy-1")!], result.analysis.upperBand);
  // These are the numerical binary hashes of the existing Math3D QWZ fixture pair.
  assert.equal(curvature.scene.datasets.find(d => d.id === "curvature")?.sha256,
    "ef18becd24e876a3008ea27daecf3d286b7c2c420f6b54a393d526f81beb1bd9");
  assert.equal(bands.scene.datasets.find(d => d.id === "band-energy-0")?.sha256,
    "c0ae0cf60f85ff5bf6f8ebb3dee91289e3f7dbd85fb770b3530ed465ab70d7bd");
  assert.equal(bands.scene.datasets.find(d => d.id === "band-energy-1")?.sha256,
    "b374a679c6c22421dd8330ee31dfe8bfe695670f0321c8deeb8b427474d53654");
  assert.equal(result.analysis.bulkGap, 2);
  assert.equal(result.analysis.chern, -1);
  assert.equal(result.analysis.sampledGap, 2.0002494853248947);
});

test("QWZ v2 refuses a changed pointer, hash, shape, source or unavailable claim", async () => {
  const bytes = await readFile(join(runDir, "result.json"));
  const good = qwzResultV2(bytes);
  for (const change of [
    (d: typeof good) => { d.datasets[0].storage.pointer = "/analysis/lowerBand"; },
    (d: typeof good) => { d.datasets[1].storage.sha256 = "0".repeat(64); },
    (d: typeof good) => { d.datasets[2].shape = [20, 20]; },
    (d: typeof good) => { d.source.resultSha256 = "0".repeat(64); },
    (d: typeof good) => { d.unavailable[0].role = "berry-connection"; },
  ]) {
    const altered = structuredClone(good);
    change(altered);
    assert.throws(() => assertQuantumResultV2(altered, bytes));
  }
  const alteredBytes = Buffer.from(bytes);
  alteredBytes[alteredBytes.indexOf(Buffer.from("2.0002494853248947"))] = 0x33;
  assert.throws(() => assertQuantumResultV2(good, alteredBytes));
});
