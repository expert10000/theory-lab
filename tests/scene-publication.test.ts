import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sceneExample } from "../packages/quantum-scene/examples";
import { readSceneBundle, writeSceneBundle } from "../packages/quantum-scene/bundle";

const digest = async (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

test("final scene publication is atomic, exclusive and excludes display previews", async () => {
  const root = await mkdtemp(join(tmpdir(), "qi16-publication-"));
  try {
    const payload = await sceneExample({ family: "square", repeats: [1, 1, 1] }, digest);
    const competing = await Promise.allSettled([writeSceneBundle(payload, root), writeSceneBundle(payload, root)]);
    assert.deepEqual(competing.map(outcome => outcome.status).sort(), ["fulfilled", "rejected"]);
    const successful = competing.find((outcome): outcome is PromiseFulfilledResult<string> => outcome.status === "fulfilled");
    assert.ok(successful);
    const directory = successful.value;
    const original = await readFile(join(directory, "bundle.json"));
    assert.equal((await readSceneBundle(directory)).scene.id, payload.scene.id);
    await assert.rejects(writeSceneBundle(payload, root), /already exists/);
    assert.deepEqual(await readFile(join(directory, "bundle.json")), original);
    assert.deepEqual((await readdir(root)).filter(name => name.startsWith(".qscene-finalizing-")), []);
    await assert.rejects(writeSceneBundle({ ...payload,
      scene: { ...payload.scene, id: `preview-${payload.scene.id}` } }, root), /previews cannot be published/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
