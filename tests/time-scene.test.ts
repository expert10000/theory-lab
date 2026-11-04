import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { sceneFromResult } from "../packages/quantum-scene/from-result";
import { verifyScenePayload } from "../packages/quantum-scene";
import { defaultsFor, evolutionJob } from "../packages/models";
import { EVOLUTION_COLUMNS, type EvolutionResult } from "../packages/contracts";

const digest = async (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

test("irregular Bloch and expectation frames share exact physical samples", async () => {
  const job = evolutionJob("driven_two_level", "time-scene-test", defaultsFor("driven_two_level"), 0, 0, 2, 3);
  const times = [0, 0.3, 1.1];
  const bytes = Buffer.alloc(times.length * EVOLUTION_COLUMNS.length * 8);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  times.forEach((time, row) => {
    const values = [time, 1, 0, 0, row / 2, 1 - row / 2, 1, 0, 0, 0];
    values.forEach((value, col) => view.setFloat64((row * 10 + col) * 8, value, true));
  });
  const result: EvolutionResult = { schema: "quantum-result/v1", jobId: job.jobId, runId: "time-scene-run",
    status: "completed", operation: "evolve", model: job.model, initialState: job.initialState,
    solver: job.solver, observables: job.observables, engine: { name: "qutip", version: "5.3.1" },
    data: { schema: "quantum-data/v1", format: "f64le", path: "time.f64", rows: 3,
      columns: EVOLUTION_COLUMNS, bytes: bytes.length, sha256: await digest(bytes) },
    provenance: { pythonVersion: "3.12", workerVersion: "0.1.0", computedAt: "2026-11-04T00:00:00Z", durationMs: 1 } };
  const payload = await sceneFromResult(result, bytes, "a".repeat(64), digest);
  const arrays = await verifyScenePayload(payload, digest);
  assert.equal(payload.scene.schema, "quantum-scene/v2");
  assert.deepEqual(payload.scene.time?.frameIds, ["frame-0", "frame-1", "frame-2"]);
  assert.deepEqual([...arrays.get("time")!], times);
  assert.deepEqual([...arrays.get("expectation-plot")!], [0, 1, 0, 0.3, 0.5, 0, 1.1, 0, 0]);
  const altered = { ...payload, scene: { ...payload.scene, time: { ...payload.scene.time!, frameIds: ["frame-0", "frame-0", "frame-2"] } } };
  await assert.rejects(verifyScenePayload(altered, digest), /frame identities/);
});
