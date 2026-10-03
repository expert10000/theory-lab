import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import fixture from "../packages/quantum-scene/fixtures/bands-ssh.json";
import { WorkerSupervisor } from "../apps/desktop/main/worker";
import { RunStore } from "../apps/desktop/main/runs";
import {
  TOPOLOGY_DEFAULTS,
  topologyJob,
  isTopologyResponse,
  consistentTopologyResult,
} from "../packages/models/topology";
import { isQuantumResult } from "../packages/contracts";
import { assertScene, verifyScenePayload } from "../packages/quantum-scene";
import { readSceneBundle } from "../packages/quantum-scene/bundle";
import { bandSceneFromResult } from "../packages/quantum-scene/bands";
const digest = async (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
test("checked-in worker band fixture is reproducible and preserves source hash", async () => {
  assert.ok(isQuantumResult(fixture.result));
  const payload = await bandSceneFromResult(
    fixture.result,
    await digest(Buffer.from(JSON.stringify(fixture.result))),
    digest,
  );
  assert.deepEqual(payload.scene, fixture.scene);
});
test("real worker bands preserve energies, gap-closure data and offline bundle inspection", async () => {
  const root = await mkdtemp(join(tmpdir(), "qvis-bands-")),
    worker = new WorkerSupervisor(process.cwd()),
    store = new RunStore(join(root, "runs"), join(root, "artifacts"));
  try {
    await worker.start();
    for (const [modelId, mass] of [
      ["ssh", "-1"],
      ["qwz", "-1"],
      ["qwz", "0"],
    ] as const) {
      const job = topologyJob(`bands-${modelId}-${mass}`, {
          ...TOPOLOGY_DEFAULTS,
          modelId,
          mass,
        }),
        result = await worker.request("quantum.run", job);
      assert.ok(isQuantumResult(result) && result.operation === "topology");
      assert.ok(isTopologyResponse(result, job));
      await store.record(job, result);
      assert.deepEqual(await new RunStore(join(root,"runs"),join(root,"artifacts")).topology(result.runId),result);
      const p = await store.scene(result.runId, "bands"),
        arrays = await verifyScenePayload(p, digest),
        b = p.scene.bands!;
      assert.equal(b.kind, modelId === "ssh" ? "path" : "surface");
      assert.equal(b.bulkGap, result.analysis.bulkGap);
      assert.deepEqual(
        [...arrays.get(b.energies[0])!],
        result.analysis.lowerBand,
      );
      assert.deepEqual(
        [...arrays.get(b.energies[1])!],
        result.analysis.upperBand,
      );
      assert.equal(
        p.scene.provenance.resultSha256,
        await digest(
          await readFile(join(root, "runs", result.runId, "result.json")),
        ),
      );
      const dir = await store.exportScene(result.runId, root, "bands"),
        offline = await readSceneBundle(dir);
      assert.deepEqual(offline.scene, p.scene);
      await verifyScenePayload(offline, digest);
      await writeFile(join(root,"runs",result.runId,"result.json"),"{}\n");
      await assert.rejects(store.topology(result.runId),/integrity check/);
      const python = spawnSync(
        process.execPath,
        [
          "scripts/python.mjs",
          "-c",
          "import sys,json,struct; from quantum_worker.scene import verify_scene_artifacts; p=json.load(sys.stdin); verify_scene_artifacts(p['scene'],{k:struct.pack('<'+str(len(v))+'d',*v) for k,v in p['values'].items()}); print('verified')",
        ],
        {
          input: JSON.stringify({
            scene: p.scene,
            values: Object.fromEntries(
              p.scene.datasets.map((d) => [d.path, [...arrays.get(d.id)!]]),
            ),
          }),
          encoding: "utf8",
        },
      );
      assert.equal(python.status, 0, python.stderr);
      assert.match(python.stdout, /verified/);
      const bad = structuredClone(p);
      bad.scene.bands!.energies[0] = "absent";
      assert.throws(() => assertScene(bad.scene));
      const forged = structuredClone(p),
        d = forged.scene.datasets.find((d) => d.id === b.energies[0])!,
        data = forged.artifacts[d.path];
      new DataView(data.buffer, data.byteOffset, data.byteLength).setFloat64(
        0,
        -123,
        true,
      );
      d.sha256 = await digest(data);
      await assert.rejects(verifyScenePayload(forged, digest), /Band geometry/);
      const corrupt = structuredClone(result);
      corrupt.analysis.upperBand![10] += 1;
      assert.equal(consistentTopologyResult(job, corrupt), false);
      assert.equal(isTopologyResponse(corrupt, job), false);
      if (result.analysis.kind === "qwz") {
        const old = structuredClone(result);
        if (old.analysis.kind !== "qwz") throw new Error();
        delete old.analysis.bandKValues;
        delete old.analysis.lowerBand;
        delete old.analysis.upperBand;
        assert.ok(isQuantumResult(old));
        assert.ok(isTopologyResponse(old, job));
        await assert.rejects(
          bandSceneFromResult(old, p.scene.provenance.resultSha256, digest),
          /Re-run/,
        );
        const partial = structuredClone(result);
        if (partial.analysis.kind !== "qwz") throw new Error();
        delete partial.analysis.upperBand;
        assert.equal(isQuantumResult(partial), false);
        assert.equal(isTopologyResponse(partial, job), false);
        const seam = structuredClone(p),
          idx = seam.scene.datasets.find((d) => d.id === "band-triangles")!,
          bytes = seam.artifacts[idx.path],
          v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        v.setFloat64(0, 0, true);
        v.setFloat64(8, 20, true);
        v.setFloat64(16, 21, true);
        idx.sha256 = await digest(bytes);
        await assert.rejects(
          verifyScenePayload(seam, digest),
          /triangle\/seam/,
        );
      }
    }
    await assert.rejects(
      store.scene("absent", "not-a-view" as "bands"),
      /Unsupported/,
    );
  } finally {
    await worker.stop();
    await rm(root, { recursive: true, force: true });
  }
});
