import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdir,mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {WorkerSupervisor} from "../apps/desktop/main/worker";
import {LandauRunStore} from "../apps/desktop/main/landau-runs";
import {BdGSectorRunStore} from "../apps/desktop/main/bdg-sector-runs";
import {LatticePairingRunStore} from "../apps/desktop/main/lattice-pairing-runs";
import {Ute2TopologyRunStore} from "../apps/desktop/main/ute2-topology-runs";
import {Ute2EdgeRunStore} from "../apps/desktop/main/ute2-edge-runs";
import {Ute2SceneProducer} from "../apps/desktop/main/ute2-scenes";
import {landauJob} from "../packages/models/landau";
import {bdgSectorJob} from "../packages/models/bdg-sector";
import {latticePairingJob} from "../packages/models/lattice-pairing";
import {ute2TopologyJob} from "../packages/models/ute2-topology";
import {ute2EdgeJob} from "../packages/models/ute2-edge";
import {readSceneBundle} from "../packages/quantum-scene/bundle";
import {decodeDataset} from "../packages/quantum-scene";
import {isLandauResult} from "../packages/contracts/landau";
import {isBdGSectorResult} from "../packages/contracts/bdg-sector";
import {isLatticePairingResult} from "../packages/contracts/lattice-pairing";
import {isUte2TopologyResult} from "../packages/contracts/ute2-topology";
import {isUte2EdgeResult} from "../packages/contracts/ute2-edge";

test("UTe2 saved results export exact portable scenes and changed sources refuse fresh export",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-ute2-scenes-"));
  const exportRoot=join(root,"exports");await mkdir(exportRoot);
  const worker=new WorkerSupervisor(process.cwd());
  try {
    await worker.start();assert.equal(worker.status.state,"READY");
    const landau=new LandauRunStore(join(root,"landau"));
    const bdg=new BdGSectorRunStore(join(root,"bdg"));
    const lattice=new LatticePairingRunStore(join(root,"lattice"));
    const bulk=new Ute2TopologyRunStore(join(root,"bulk"));
    const edge=new Ute2EdgeRunStore(join(root,"edge"),bulk);
    const producer=new Ute2SceneProducer(landau,bdg,lattice,bulk,edge);
    const glJob=landauJob({a1:-.7,a2:-.5,b1:1,b2:1,g:.4},"gl-scene");
    const gl=await worker.request("quantum.landau",glJob);
    assert.ok(isLandauResult(gl));
    const glHash=(await landau.record(glJob,gl)).resultSha256;
    const bdgJob=bdgSectorJob({extent:2,delta:.5,phaseRad:.3,points:51},"bdg-scene");
    const bdgResult=await worker.request("quantum.bdgSector",bdgJob);
    assert.ok(isBdGSectorResult(bdgResult));
    const bdgHash=(await bdg.record(bdgJob,bdgResult)).resultSha256;
    const latticeJob=latticePairingJob({mu:0,amplitudeX:.8,amplitudeY:.8,relativePhaseRad:Math.PI/2,gridSize:16},"lattice-scene");
    const latticeResult=await worker.request("quantum.latticePairing",latticeJob);
    assert.ok(isLatticePairingResult(latticeResult));
    const latticeHash=(await lattice.record(latticeJob,latticeResult)).resultSha256;
    const bulkJob=ute2TopologyJob({mu:-2,delta:.8,mesh:12},"bulk-scene-source");
    const bulkResult=await worker.request("quantum.ute2Topology",bulkJob);
    assert.ok(isUte2TopologyResult(bulkResult));
    const bulkHash=(await bulk.record(bulkJob,bulkResult)).resultSha256;
    const edgeJob=ute2EdgeJob({runId:bulkResult.runId,resultSha256:bulkHash},bulkResult,12,"edge-scene");
    const edgeResult=await worker.request("quantum.ute2Edge",edgeJob);
    assert.ok(isUte2EdgeResult(edgeResult));
    const edgeHash=(await edge.record(edgeJob,edgeResult)).resultSha256;
    const fixtures=[
      {kind:"landau" as const,result:gl,hash:glHash,object:"stationary"},
      {kind:"bdg" as const,result:bdgResult,hash:bdgHash,object:"positive"},
      {kind:"lattice" as const,result:latticeResult,hash:latticeHash,object:"positive-energy"},
      {kind:"topology" as const,result:bulkResult,hash:bulkHash,object:"bulk-receipt"},
      {kind:"edge" as const,result:edgeResult,hash:edgeHash,object:"density-24"},
    ];
    for(const item of fixtures){
      const directory=await producer.export(item.kind,item.result.runId,exportRoot);
      const reopened=await readSceneBundle(directory);
      assert.equal(reopened.scene.provenance.runId,item.result.runId);
      assert.equal(reopened.scene.provenance.resultSha256,item.hash);
      assert.equal(reopened.scene.schema,"quantum-scene/v1");
      assert.ok(reopened.scene.objects.some(o=>o.id===item.object));
      const manifest=JSON.parse(await readFile(join(directory,"bundle.json"),"utf8"));
      const sceneBytes=await readFile(join(directory,"scene.json"));
      assert.equal(createHash("sha256").update(sceneBytes).digest("hex"),manifest.scene.sha256);
    }
    const glScene=await readSceneBundle(join(exportRoot,`ute2-landau-${glHash.slice(0,24)}.qscene`));
    assert.deepEqual([...decodeDataset(glScene.artifacts["stationary-positions.f64"])],
      gl.candidates.flatMap(c=>[Math.sqrt(c.x),Math.sqrt(c.y),c.freeEnergy]));
    const latticeScene=await readSceneBundle(join(exportRoot,`ute2-lattice-${latticeHash.slice(0,24)}.qscene`));
    assert.deepEqual([...decodeDataset(latticeScene.artifacts["positive-energy-scalars.f64"])],
      latticeResult.samples.map(s=>s.ePlus));
    assert.equal(latticeScene.scene.datasets.find(d=>d.id==="pairing-phase-scalars")?.count,
      latticeResult.samples.filter(s=>s.phaseRad!==null).length);
    assert.deepEqual([...decodeDataset(latticeScene.artifacts["phase-defined-mask-scalars.f64"])],
      latticeResult.samples.map(s=>s.phaseRad===null?0:1));
    assert.deepEqual([...decodeDataset(latticeScene.artifacts["node-mask-scalars.f64"])],
      latticeResult.samples.map(s=>s.node?1:0));
    const topologyScene=await readSceneBundle(join(exportRoot,`ute2-topology-${bulkHash.slice(0,24)}.qscene`));
    assert.equal(topologyScene.scene.topology?.invariants[0]?.value,bulkResult.chern);
    assert.equal(topologyScene.scene.topology?.invariants[0]?.status,"verified");
    assert.equal(topologyScene.scene.provenance.parameters?.bulkGap,bulkResult.bulkGap);
    assert.equal(topologyScene.scene.provenance.parameters?.fineMesh,bulkResult.fineMesh);
    assert.deepEqual(topologyScene.scene.objects.map(o=>o.id),["bulk-receipt"]);
    assert.deepEqual([...decodeDataset(topologyScene.artifacts["bulk-receipt-positions.f64"])],
      [bulkResult.model.parameters.mu,bulkResult.model.parameters.delta,bulkResult.bulkGap]);
    const latticeArtifact=join(exportRoot,`ute2-lattice-${latticeHash.slice(0,24)}.qscene`,"node-mask-scalars.f64");
    const changedArtifact=await readFile(latticeArtifact);changedArtifact[0]^=1;
    await writeFile(latticeArtifact,changedArtifact);
    await assert.rejects(readSceneBundle(join(exportRoot,`ute2-lattice-${latticeHash.slice(0,24)}.qscene`)),/artifact integrity/);
    const edgeScene=await readSceneBundle(join(exportRoot,`ute2-edge-${edgeHash.slice(0,24)}.qscene`));
    assert.equal(edgeScene.scene.provenance.parameters?.bulkResultSha256,bulkHash);
    assert.deepEqual([...decodeDataset(edgeScene.artifacts["density-24-positions.f64"])].filter((_,i)=>i%3===2),
      edgeResult.widths[1].pairDensity);
    const glFile=join(root,"landau",gl.runId,"result.json");
    const glText=JSON.parse(await readFile(glFile,"utf8"));glText.candidates[0].freeEnergy+=.1;
    await writeFile(glFile,JSON.stringify(glText,null,2)+"\n");
    await assert.rejects(producer.build("landau",gl.runId),/integrity check/);
    const bulkFile=join(root,"bulk",bulkResult.runId,"result.json");
    const bulkText=JSON.parse(await readFile(bulkFile,"utf8"));bulkText.bulkGap+=.1;
    await writeFile(bulkFile,JSON.stringify(bulkText,null,2)+"\n");
    await assert.rejects(producer.build("edge",edgeResult.runId),/integrity check/);
    // An exported scene is portable and still identifies the exact source digest when the original run is unavailable.
    assert.equal((await readSceneBundle(join(exportRoot,`ute2-edge-${edgeHash.slice(0,24)}.qscene`))).scene.provenance.resultSha256,edgeHash);
    await assert.rejects(producer.build("bdg","missing-run"));
  } finally {await worker.stop();await rm(root,{recursive:true,force:true});}
});
