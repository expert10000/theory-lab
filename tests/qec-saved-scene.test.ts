import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { WorkerSupervisor } from "../apps/desktop/main/worker";
import { QecRepetitionRunStore } from "../apps/desktop/main/qec-repetition-runs";
import { verifyQecRepetitionStudy, type QecRepetitionStudy } from "../packages/contracts/qec-repetition";
import { verifyScenePayload } from "../packages/quantum-scene";
import { readSceneBundle, writeSceneBundle } from "../packages/quantum-scene/bundle";

const digest = async (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

test("real ideal QEC trace saves immutably and exports a verified portable scene", async () => {
  const root = await mkdtemp(join(tmpdir(), "qlab-qec-saved-"));
  const worker = new WorkerSupervisor(process.cwd());
  try {
    assert.equal((await worker.start()).state, "READY");
    const flips = [0, -1, 1];
    const result = await worker.request("quantum.qecRepetition", { flips }) as QecRepetitionStudy;
    assert.equal(verifyQecRepetitionStudy(flips, result), true);
    assert.equal(verifyQecRepetitionStudy(flips, { ...result, initialLogical: 1 } as unknown as QecRepetitionStudy), false);
    assert.equal(verifyQecRepetitionStudy(flips, { ...result, limitations: ["No known limits"] }), false);
    const store = new QecRepetitionRunStore(join(root, "runs"));
    const saved = await store.save(flips, result, worker.status.capabilities!.worker.version);
    assert.deepEqual((await store.get(saved.runId)).result, result);
    assert.deepEqual((await store.list()).map(row => row.runId), [saved.runId]);
    const payload = await store.scene(saved.runId);
    assert.equal(payload.scene.schema, "quantum-scene/v1");
    assert.equal(payload.scene.provenance.runId, saved.runId);
    assert.equal(payload.scene.provenance.resultSha256, saved.resultSha256);
    assert.equal(payload.scene.provenance.model, "qec_repetition_ideal");
    const arrays = await verifyScenePayload(payload, digest);
    assert.deepEqual([...arrays.get("qec-syndrome")!], result.rounds.flatMap(row => row.syndrome));
    assert.deepEqual([...arrays.get("qec-defects")!], result.rounds.flatMap(row => row.defects));
    assert.deepEqual([...arrays.get("qec-data-bits")!], result.rounds.flatMap(row => row.dataBits));
    const directory = await writeSceneBundle(payload, root);
    assert.deepEqual((await readSceneBundle(directory)).scene, payload.scene);
    const blob = join(directory, "qec-syndrome.f64"), bytes = await readFile(blob);
    bytes[0] ^= 1; await writeFile(blob, bytes);
    await assert.rejects(readSceneBundle(directory), /integrity/);

    const manifest = join(root, "runs", `${saved.runId}.json`);
    const text = await readFile(manifest, "utf8");
    await writeFile(manifest, text.replace(saved.resultSha256, "0".repeat(64)));
    await assert.rejects(store.get(saved.runId), /integrity|hash changed/);
    assert.deepEqual(await store.list(), []);
  } finally {
    await worker.stop();
    if (!root.startsWith(resolve(tmpdir()) + sep) || !root.includes("qlab-qec-saved-"))
      throw new Error("Unsafe QEC test cleanup path");
    await rm(root, { recursive: true, force: true });
  }
});
