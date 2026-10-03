import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ORBITAL_DEFAULTS,
  orbitalJob,
  consistentOrbitalResult,
  checkOrbitalData,
} from "../packages/models/orbital";
import { assertJob } from "../packages/contracts";
import { WorkerSupervisor } from "../apps/desktop/main/worker";
import { EvolutionCoordinator } from "../apps/desktop/main/evolution";
import { RunStore } from "../apps/desktop/main/runs";
import { verifyScenePayload } from "../packages/quantum-scene";
import { readSceneBundle } from "../packages/quantum-scene/bundle";

test("orbital job bounds and quantum-number relations are checked before launch", () => {
  assertJob(orbitalJob("orbit", ORBITAL_DEFAULTS));
  for (const patch of [
    { n: "1", l: "1" },
    { n: "2", l: "1", m: "2" },
    { n: "2", l: "1", m: "-1", basis: "real_cos" as const },
    { basis: "real_sin" as const },
    { Z: "0" },
    { radius: "" },
    { grid: "51" },
  ])
    assert.throws(() => orbitalJob("bad", { ...ORBITAL_DEFAULTS, ...patch }));
  const job = orbitalJob("bad", ORBITAL_DEFAULTS);
  job.model.parameters.l = 1;
  assert.throws(() => assertJob(job));
});
test("supervised orbital → saved verified field → portable offline bundle", async () => {
  const root = await mkdtemp(join(tmpdir(), "qvis-orbital-")),
    artifacts = join(root, "artifacts");
  const worker = new WorkerSupervisor(process.cwd()),
    progress: number[] = [];
  const coordinator = new EvolutionCoordinator(worker, artifacts, (p) =>
    progress.push(p.completed),
  );
  const digest = async (bytes: Uint8Array) =>
    createHash("sha256").update(bytes).digest("hex");
  try {
    const status = await worker.start();
    assert.ok(status.capabilities?.operations.includes("orbital"));
    const job = orbitalJob("orbital-integration", {
      ...ORBITAL_DEFAULTS,
      n: "2",
      l: "1",
      m: "1",
      basis: "complex",
      radius: "16",
      grid: "21",
    });
    const result = await coordinator.run(job);
    assert.ok(consistentOrbitalResult(job, result));
    assert.equal(result.analysis.energyHartree, -0.125);
    assert.equal(progress[0], 0);
    assert.equal(progress.at(-1), 21);
    assert.ok(
      !consistentOrbitalResult(job, {
        ...result,
        analysis: { ...result.analysis, energyHartree: -1 },
      }),
    );
    const store = new RunStore(join(root, "runs"), artifacts);
    await store.record(job, result);
    assert.equal((await store.list())[0].operation, "orbital");
    const payload = await store.scene(result.runId),
      arrays = await verifyScenePayload(payload, digest);
    assert.equal(payload.scene.fields?.[0].grid.order, "xyz-z-fastest");
    assert.deepEqual(payload.scene.coordinates.units, ["a0", "a0", "a0"]);
    assert.deepEqual(payload.scene.provenance.parameters, job.model.parameters);
    const source = await coordinator.readData(job.jobId),
      view = new DataView(source.buffer, source.byteOffset, source.byteLength);
    const reopened=await new RunStore(join(root,"runs"),artifacts).orbital(result.runId);
    assert.deepEqual(reopened.result,result);
    assert.deepEqual(Buffer.from(reopened.data),Buffer.from(source));
    assert.ok(
      Math.abs(
        checkOrbitalData(result, source) - result.analysis.gridProbability,
      ) < 1e-12,
    );
    assert.throws(
      () =>
        checkOrbitalData(
          {
            ...result,
            analysis: {
              ...result.analysis,
              gridProbability: result.analysis.gridProbability + 0.1,
            },
          },
          source,
        ),
      /integral disagrees/,
    );
    const bad = new Uint8Array(source);
    new DataView(bad.buffer).setFloat64(0, NaN, true);
    assert.throws(
      () => checkOrbitalData(result, bad),
      /Invalid orbital amplitude/,
    );
    for (let i = 0; i < 21 ** 3; i++) {
      assert.equal(arrays.get("psi-real")![i], view.getFloat64(i * 16, true));
      assert.equal(
        arrays.get("psi-imaginary")![i],
        view.getFloat64(i * 16 + 8, true),
      );
    }
    const directory = await store.exportScene(result.runId, root);
    for (const format of ["csv", "svg"] as const)
      await store.export(result.runId, format, join(root, format));
    assert.match(await readFile(join(root, "csv"), "utf8"), /^x_a0,y_a0,z_a0/);
    assert.match(
      await readFile(join(root, "svg"), "utf8"),
      /Radial probability/,
    );
    await worker.stop();
    assert.deepEqual((await readSceneBundle(directory)).scene, payload.scene);
    assert.deepEqual((await store.scene(result.runId)).scene, payload.scene);
    await writeFile(
      join(root, "runs", result.runId, "data.f64"),
      Buffer.alloc(source.length),
    );
    await assert.rejects(store.scene(result.runId), /integrity/);
    await assert.rejects(store.orbital(result.runId),/integrity/);
  } finally {
    await worker.stop();
    await rm(root, { recursive: true, force: true });
  }
});
