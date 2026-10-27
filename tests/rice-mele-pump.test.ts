import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdtemp,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {test} from "node:test";
import {WorkerSupervisor} from "../apps/desktop/main/worker";
import {RunStore} from "../apps/desktop/main/runs";
import {selectedTopologySample} from "../apps/desktop/renderer/topology-selection";
import {isQuantumResult} from "../packages/contracts";
import {TOPOLOGY_DEFAULTS,isTopologyResponse,topologyJob} from "../packages/models/topology";
import {readSceneBundle} from "../packages/quantum-scene/bundle";
import {verifyScenePayload} from "../packages/quantum-scene";

const digest=async(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");

test("Rice–Mele filled-band pump survives restart and refuses altered sources",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-rice-pump-"));
  const worker=new WorkerSupervisor(process.cwd());
  const store=new RunStore(join(root,"runs"),join(root,"artifacts"));
  try{
    await worker.start();
    const job=topologyJob("rice-pump-study",{...TOPOLOGY_DEFAULTS,modelId:"rice_mele_pump"});
    const result=await worker.request("quantum.run",job);
    assert.ok(isQuantumResult(result)&&result.operation==="topology"&&result.analysis.kind==="rice_mele_pump");
    assert.ok(isTopologyResponse(result,job));
    assert.equal(result.analysis.status,"defined");
    assert.equal(result.analysis.chern,-1);
    assert.equal(result.analysis.polarizationWinding,-1);
    const selection={kind:"rice_mele_pump_sample" as const,runId:result.runId,phaseIndex:8,kIndex:4};
    const sample=selectedTopologySample(selection,result);
    assert.equal(sample?.kind,"rice_mele_pump_sample");
    assert.equal(selectedTopologySample({...selection,runId:"another-run"},result),null);
    await store.record(job,result);
    const restarted=new RunStore(join(root,"runs"),join(root,"artifacts"));
    assert.deepEqual(await restarted.topology(result.runId),result);
    const scene=await restarted.scene(result.runId,"standard");
    const arrays=await verifyScenePayload(scene,digest);
    assert.equal(scene.scene.provenance.source?.entryId,"rice_mele");
    assert.equal(scene.scene.provenance.resultSha256.length,64);
    assert.equal(scene.scene.objects.filter(object=>object.kind==="mesh").length,2);
    assert.deepEqual([...arrays.get("band-energy-0")!],result.analysis.lowerBand);
    assert.deepEqual([...arrays.get("plaquette-flux")!],result.analysis.berryFlux);
    assert.equal(scene.scene.topology?.invariants[0].value,-1);
    const exported=await restarted.exportScene(result.runId,root,"standard");
    assert.deepEqual((await readSceneBundle(exported)).scene.provenance.resultSha256,scene.scene.provenance.resultSha256);
    const changed=structuredClone(result);
    if(changed.analysis.kind!=="rice_mele_pump")throw new Error("Wrong analysis");
    changed.analysis.lowerBand[4]+=.1;
    assert.equal(isTopologyResponse(changed,job),false);
    await writeFile(join(root,"runs",result.runId,"result.json"),"{}\n");
    await assert.rejects(restarted.topology(result.runId),/integrity check/);
    await assert.rejects(restarted.scene(result.runId,"standard"),/integrity check/);
  }finally{await worker.stop();await rm(root,{recursive:true,force:true});}
});
