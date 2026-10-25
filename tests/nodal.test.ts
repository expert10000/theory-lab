import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { WorkerSupervisor } from "../apps/desktop/main/worker";
import { RunStore } from "../apps/desktop/main/runs";
import { selectedTopologySample } from "../apps/desktop/renderer/topology-selection";
import { isQuantumResult } from "../packages/contracts";
import { TOPOLOGY_DEFAULTS, isTopologyResponse, topologyJob } from "../packages/models/topology";
import { verifyScenePayload } from "../packages/quantum-scene";
import { readSceneBundle } from "../packages/quantum-scene/bundle";

const digest = async (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

test("nodal linked, unlinked, and touching loops remain exact through restart and scene export", async () => {
  const root = await mkdtemp(join(tmpdir(), "qlab-nodal-")), worker = new WorkerSupervisor(process.cwd());
  const store = new RunStore(join(root, "runs"), join(root, "artifacts"));
  try {
    await worker.start();
    for (const [name, center, radius, expected] of [
      ["linked", "1", "0.25", "defined"],
      ["unlinked", "0", "0.25", "defined"],
      ["touching", "0.75", "0.25", "gap-closed"],
    ] as const) {
      const job = topologyJob(`nodal-${name}`, { ...TOPOLOGY_DEFAULTS, modelId: "nodal_line_two_band",
        mass: "1", curvature: "1", velocity: "1", loopCenter: center, loopRadius: radius, loopSamples: "64" });
      const response = await worker.request("quantum.run", job);
      assert.ok(isQuantumResult(response) && response.operation === "topology" && response.analysis.kind === "nodal_line_two_band");
      assert.equal(isTopologyResponse(response, job), true);
      assert.equal(response.analysis.status, expected);
      assert.equal(response.analysis.ringPositions.length, 64);
      assert.equal(response.analysis.loopPositions.length, 64);
      assert.equal(response.analysis.ringRadius, 1);
      if (name === "linked") {
        assert.ok(response.analysis.berryPhase !== null && Math.abs(response.analysis.berryPhase - Math.PI) < 1e-8);
        assert.equal(Math.abs(response.analysis.winding!), 1);
      } else if (name === "unlinked") assert.ok(response.analysis.berryPhase !== null && response.analysis.berryPhase < 1e-8);
      else { assert.equal(response.analysis.berryPhase, null); assert.equal(response.analysis.loopGap, 0); }
      const selected = selectedTopologySample({ kind: "nodal_loop_sample", runId: response.runId, index: 7 }, response);
      assert.equal(selected?.kind, "nodal_loop_sample");
      assert.equal(selectedTopologySample({ kind: "nodal_loop_sample", runId: "wrong", index: 7 }, response), null);
      await store.record(job, response);
      const restored = await new RunStore(join(root, "runs"), join(root, "artifacts")).topology(response.runId);
      assert.deepEqual(restored, response);
      const payload = await store.scene(response.runId, "standard");
      await verifyScenePayload(payload, digest);
      assert.equal(payload.scene.provenance.source?.entryId, "nodal_line_two_band");
      assert.equal(payload.scene.topology?.invariants[0].value, response.analysis.berryPhase);
      assert.equal(payload.scene.objects.find(o => o.id === "linking-loop-samples")?.scalars, "loop-upper-band");
      assert.ok(payload.scene.datasets.some(d => d.id === "loop-lower-band"));
      const folder = await store.exportScene(response.runId, root, "standard");
      assert.equal((await readSceneBundle(folder)).scene.provenance.resultSha256, payload.scene.provenance.resultSha256);
      const altered = structuredClone(response);
      if (altered.analysis.kind !== "nodal_line_two_band") throw new Error("Wrong result");
      altered.analysis.upperBand[7] += .01;
      assert.equal(isTopologyResponse(altered, job), false);
      await writeFile(join(root, "runs", response.runId, "result.json"), "{}\n");
      await assert.rejects(new RunStore(join(root, "runs"), join(root, "artifacts")).topology(response.runId), /integrity check/);
    }
  } finally { await worker.stop(); await rm(root, { recursive: true, force: true }); }
});
