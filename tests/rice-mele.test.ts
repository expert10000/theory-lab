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

test("Rice–Mele static bands and finite sites remain linked to an immutable run",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-rice-mele-"));
  const worker=new WorkerSupervisor(process.cwd());
  const store=new RunStore(join(root,"runs"),join(root,"artifacts"));
  try{
    await worker.start();
    const job=topologyJob("rice-mele-source",{...TOPOLOGY_DEFAULTS,modelId:"rice_mele",delta:"0.2",cells:"12",kPoints:"81"});
    const result=await worker.request("quantum.run",job);
    assert.ok(isQuantumResult(result)&&result.operation==="topology"&&result.analysis.kind==="rice_mele");
    assert.ok(isTopologyResponse(result,job));
    assert.ok(result.analysis.bulkGap>0);
    assert.equal(result.analysis.middleDensity.length,24);
    const band={kind:"rice_mele_band" as const,runId:result.runId,index:20};
    const site={kind:"rice_mele_site" as const,runId:result.runId,index:0};
    assert.equal(selectedTopologySample(band,result)?.kind,"rice_mele_band");
    assert.equal(selectedTopologySample(site,result)?.kind,"rice_mele_site");
    assert.equal(selectedTopologySample({...band,runId:"run-other"},result),null);
    await store.record(job,result);
    const restarted=new RunStore(join(root,"runs"),join(root,"artifacts"));
    assert.deepEqual(await restarted.topology(result.runId),result);
    const finite=await restarted.scene(result.runId,"standard");
    const bands=await restarted.scene(result.runId,"bands");
    const finiteArrays=await verifyScenePayload(finite,digest);
    const bandArrays=await verifyScenePayload(bands,digest);
    assert.equal(finite.scene.provenance.resultSha256,bands.scene.provenance.resultSha256);
    assert.equal(finite.scene.provenance.source?.entryId,"rice_mele");
    assert.equal(finite.scene.objects[0].scalars,"middle-density");
    assert.deepEqual([...finiteArrays.get("middle-density")!],result.analysis.middleDensity);
    assert.equal(bands.scene.bands?.kind,"path");
    assert.equal(bands.scene.bands?.energies.length,2);
    assert.deepEqual([...bandArrays.get(bands.scene.bands!.energies[0])!],result.analysis.lowerBand);
    assert.ok(finite.scene.annotations[0].text.includes("no pump claim"));
    for(const view of ["standard","bands"] as const){
      const dir=await restarted.exportScene(result.runId,root,view);
      const opened=await readSceneBundle(dir);
      assert.equal(opened.scene.provenance.resultSha256,finite.scene.provenance.resultSha256);
    }
    const changed=structuredClone(result);
    if(changed.analysis.kind!=="rice_mele")throw new Error("Wrong model");
    changed.analysis.upperBand[20]+=.01;
    assert.equal(isTopologyResponse(changed,job),false);
    const changedDensity=structuredClone(result);
    if(changedDensity.analysis.kind!=="rice_mele")throw new Error("Wrong model");
    changedDensity.analysis.middleDensity[0]+=.01;
    assert.equal(isTopologyResponse(changedDensity,job),false);
    await writeFile(join(root,"runs",result.runId,"result.json"),"{}\n");
    await assert.rejects(restarted.topology(result.runId),/integrity check/);
  }finally{await worker.stop();await rm(root,{recursive:true,force:true});}
});
