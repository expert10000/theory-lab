import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RunStore } from "../apps/desktop/main/runs";
import { WorkerSupervisor } from "../apps/desktop/main/worker";
import { EvolutionCoordinator } from "../apps/desktop/main/evolution";
import { evolutionJob, defaultsFor, spectrumJob } from "../packages/models";
import { TOPOLOGY_DEFAULTS, topologyJob } from "../packages/models/topology";
import { MANY_BODY_DEFAULTS, manyBodyJob } from "../packages/models/many_body";
import { isQuantumResult } from "../packages/contracts";
import { verifyScenePayload } from "../packages/quantum-scene";
import { readSceneBundle } from "../packages/quantum-scene/bundle";
import { sceneFromResult } from "../packages/quantum-scene/from-result";
import { scalarColor, scalarRange } from "../packages/quantum-3d/scalarColor";

const digest = async (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
test("real saved SSH/QWZ results produce portable verified geometry, not inferred physics", async () => {
  const root = await mkdtemp(join(tmpdir(), "qvis-topology-"));
  const worker = new WorkerSupervisor(process.cwd());
  try {
    assert.equal((await worker.start()).state, "READY");
    const store = new RunStore(join(root, "runs"), join(root, "artifacts"));
    for (const modelId of ["ssh", "qwz"] as const) {
      const job = topologyJob(`qvis-${modelId}`, { ...TOPOLOGY_DEFAULTS, modelId });
      const result = await worker.request("quantum.run", job);
      assert.ok(isQuantumResult(result) && result.operation === "topology");
      await store.record(job, result);
      const payload = await store.scene(result.runId);
      const arrays = await verifyScenePayload(payload, digest);
      assert.equal(payload.scene.provenance.source?.entryId, modelId);
      assert.equal(payload.scene.provenance.runId, result.runId);
      assert.deepEqual(payload.scene.provenance.parameters, result.model.parameters);
      assert.equal(payload.scene.provenance.resultSha256, await digest(await readFile(join(root, "runs", result.runId, "result.json"))));
      if (result.analysis.kind === "ssh") {
        assert.deepEqual([...arrays.get("density")!], result.analysis.edgeDensity);
        assert.equal(arrays.get("sites")![3], 1);
        assert.match(payload.scene.annotations[0].text, /Winding 1/);
        assert.equal(arrays.get("t1-bond-vertices")!.length / 12, result.model.type === "ssh" ? result.model.parameters.cells : 0);
        assert.equal(arrays.get("t2-bond-vertices")!.length / 12, result.model.type === "ssh" ? result.model.parameters.cells - 1 : 0);
        assert.equal(payload.scene.objects.find(o => o.id === "chain")!.visible, false);
        assert.deepEqual([...arrays.get("sublattice-A")!].filter((_, i) => i % 3 === 0), Array.from({length: aCellCount(result)}, (_, i) => 2 * i));
      } else {
        assert.deepEqual([...arrays.get("curvature")!], result.analysis.berryCurvature);
        assert.equal(arrays.get("curvature-grid")![2], result.analysis.berryCurvature[0]);
        assert.ok(Math.abs(arrays.get("curvature-grid")![0] - (-Math.PI + Math.PI / 21)) < 1e-12);
        assert.equal(arrays.get("triangles")!.length / 3, 2 * 20 * 20);
        assert.match(payload.scene.annotations[0].text, /Chern -1/);
        assert.ok(payload.scene.objects.some(o => o.id === "brillouin-boundary"));
        assert.ok(payload.scene.annotations.some(a => a.text === "kx: −π → +π (rad/a)"));
      }
      const directory = await store.exportScene(result.runId, root);
      assert.deepEqual((await readSceneBundle(directory)).scene, payload.scene);
      const handoffParent=join(root,`${modelId}-handoff`);await mkdir(handoffParent);
      await assert.rejects(store.prepareSceneHandoff(result.runId,handoffParent,"standard","0".repeat(64)),/changed after preview/);
      const handoff=await store.prepareSceneHandoff(result.runId,handoffParent,"standard",payload.scene.provenance.resultSha256);
      assert.equal(handoff.runId,result.runId);
      assert.equal(handoff.sceneSchema,"quantum-scene/v1");
      assert.equal(handoff.selectionTransferred,false);
      assert.deepEqual(handoff.coordinates,payload.scene.coordinates);
      assert.deepEqual(handoff.datasets.map(d=>d.sha256),payload.scene.datasets.map(d=>d.sha256));
      assert.deepEqual((await readSceneBundle(handoff.directory)).scene,payload.scene);
      await assert.rejects(store.exportScene(result.runId, root), /EEXIST/);
      const name = payload.scene.datasets[0].path;
      await writeFile(join(directory, name), Buffer.alloc(payload.scene.datasets[0].bytes));
      await assert.rejects(readSceneBundle(directory), /integrity/);
    }
    const closedJob = topologyJob("qvis-closed", { ...TOPOLOGY_DEFAULTS, modelId: "qwz", mass: "0" });
    const closed = await worker.request("quantum.run", closedJob);
    assert.ok(isQuantumResult(closed)); await store.record(closedJob, closed);
    await assert.rejects(store.scene(closed.runId), /undefined at gap closure/);
    const coarseJob = topologyJob("qvis-coarse", { ...TOPOLOGY_DEFAULTS, modelId: "qwz", mass: ".01", grid: "11" });
    const coarse = await worker.request("quantum.run", coarseJob);
    assert.ok(isQuantumResult(coarse)); await store.record(coarseJob, coarse);
    assert.match((await store.scene(coarse.runId)).scene.annotations[0].text, /Chern unresolved/);
    const spectrum = spectrumJob("qvis-unsupported", defaultsFor("two_level"), "native");
    const result = await worker.request("quantum.run", spectrum);
    assert.ok(isQuantumResult(result)); await store.record(spectrum, result);
    await assert.rejects(store.scene(result.runId), /no QVIS-002 scene adapter/);
    await assert.rejects(store.scene("../outside"), /Invalid run ID/);
  } finally { await worker.stop(); await rm(root, { recursive: true, force: true }); }
});
function aCellCount(result: import("../packages/contracts").TopologyResult) {
  return result.model.type === "ssh" ? result.model.parameters.cells : 0;
}

test("lattice scenes preserve signed Ising observables and batch maximum SSH bonds", async () => {
  const worker = new WorkerSupervisor(process.cwd());
  try {
    await worker.start();
    for (const boundary of ["open", "periodic"] as const) {
      const job = manyBodyJob(`qvis-ising-${boundary}`, {...MANY_BODY_DEFAULTS, longitudinal:"-.3"}, boundary, "native");
      const result = await worker.request("quantum.run", job);
      assert.ok(isQuantumResult(result) && result.operation === "many_body");
      const payload = await sceneFromResult(result, null, "a".repeat(64), digest);
      const arrays = await verifyScenePayload(payload, digest);
      assert.deepEqual([...arrays.get("magnetization")!], result.groundState.siteMagnetization);
      assert.deepEqual([...arrays.get("magnetization-height")!].filter((_, i) => i % 3 === 2), result.groundState.siteMagnetization);
      assert.equal(arrays.get("bonds")!.length / 3, result.model.parameters.sites + (boundary === "periodic" ? 1 : 0));
      assert.deepEqual(payload.scene.provenance.parameters, result.model.parameters);
      const bad = {...result, groundState:{...result.groundState, siteMagnetization:[0]}};
      await assert.rejects(sceneFromResult(bad, null, "a".repeat(64), digest), /site magnetization layout/);
    }
    for (const t1 of [0, -1]) {
      const result = await worker.request("quantum.run", topologyJob(`qvis-ssh-${t1===0?"zero":"negative"}`, {...TOPOLOGY_DEFAULTS, cells:"40", t1:String(t1)}));
      assert.ok(isQuantumResult(result) && result.operation === "topology");
      const payload = await sceneFromResult(result, null, "b".repeat(64), digest);
      const arrays = await verifyScenePayload(payload, digest);
      assert.ok(payload.scene.objects.length <= 64 && payload.scene.datasets.length <= 64);
      assert.equal(payload.scene.objects.some(o => o.id === "ssh-t1-bonds"), t1 !== 0);
      assert.equal(arrays.get("t2-bond-vertices")!.length / 12, 39);
      if(t1 !== 0) assert.match(payload.scene.objects.find(o=>o.id==="ssh-t1-bonds")!.label, /−?\-1/);
    }
  } finally { await worker.stop(); }
});

test("Bloch adapter preserves every verified evolution row and exports offline", async () => {
  const root = await mkdtemp(join(tmpdir(), "qvis-evolution-"));
  const artifacts = join(root, "artifacts"); await mkdir(artifacts);
  const worker = new WorkerSupervisor(process.cwd());
  const coordinator = new EvolutionCoordinator(worker, artifacts, () => {});
  try {
    assert.equal((await worker.start()).state, "READY");
    const job = evolutionJob("driven_two_level", "qvis-dynamics", defaultsFor("driven_two_level"), 0, 0, 2, 21, "native");
    const result = await coordinator.run(job);
    const store = new RunStore(join(root, "runs"), artifacts); await store.record(job, result);
    const payload = await store.scene(result.runId);
    const arrays = await verifyScenePayload(payload, digest);
    const source = await readFile(join(artifacts, result.data.path));
    const view = new DataView(source.buffer, source.byteOffset, source.byteLength);
    for (let i = 0; i < 21; i++) {
      assert.equal(arrays.get("time")![i], view.getFloat64(i * 80, true));
      for (let c = 0; c < 3; c++) assert.equal(arrays.get("trajectory")![i * 3 + c], view.getFloat64(i * 80 + (c + 3) * 8, true));
    }
    const directory = await store.exportScene(result.runId, root);
    await worker.stop();
    assert.deepEqual((await readSceneBundle(directory)).scene, payload.scene);
    assert.deepEqual((await store.scene(result.runId)).scene, payload.scene);
    const restarted=new RunStore(join(root,"runs"),artifacts);
    const handoffParent=join(root,"handoff");await mkdir(handoffParent);
    const handoff=await restarted.prepareSceneHandoff(result.runId,handoffParent,"standard",payload.scene.provenance.resultSha256);
    assert.equal(handoff.datasets.find(d=>d.id==="time")?.unit,"normalized time (hbar=1)");
    assert.deepEqual((await readSceneBundle(handoff.directory)).scene,payload.scene);
    const corrupt = new Uint8Array(source); corrupt[12] ^= 1;
    await assert.rejects(sceneFromResult(result, corrupt, payload.scene.provenance.resultSha256, digest), /integrity/);
    await writeFile(join(root, "runs", result.runId, "data.f64"), Buffer.alloc(source.length));
    await assert.rejects(store.scene(result.runId), /integrity/);
    await assert.rejects(restarted.prepareSceneHandoff(result.runId,join(root,"handoff"),"standard",payload.scene.provenance.resultSha256),/integrity/);
    await writeFile(join(directory, "scene.json"), "{}");
    await assert.rejects(readSceneBundle(directory), /size|integrity/);
  } finally { await worker.stop(); await rm(root, { recursive: true, force: true }); }
});
test("scalar palette distinguishes sign and handles constant fields", () => {
  assert.deepEqual(scalarColor(-1, -1, 1), [0, .35, 1]);
  assert.deepEqual(scalarColor(1, -1, 1), [1, .35, 0]);
  assert.ok(scalarColor(0, 0, 0).every((v, i) => Math.abs(v - [.5, .65, .5][i]) < 1e-12));
  assert.ok(scalarColor(0, -1e308, 1e308).every(Number.isFinite));
  assert.deepEqual(scalarRange(new Float64Array([-.2, .5])), [-.5, .5]);
});
