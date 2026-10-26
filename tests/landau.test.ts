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

const digest=async(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");

test("Landau signed field fan persists exact levels and refuses tampered sources",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-landau-")),worker=new WorkerSupervisor(process.cwd());
  const store=new RunStore(join(root,"runs"),join(root,"artifacts"));
  try{
    await worker.start();
    for(const [charge,start,stop] of [["-1","0.5","2"],["1","-0.5","-2"]] as const){
      const job=topologyJob(`landau-${charge==="-1"?"negative":"positive"}-${start.startsWith("-")?"negative":"positive"}`,
        {...TOPOLOGY_DEFAULTS,modelId:"landau_continuum",mass:"1",charge,fieldStart:start,fieldStop:stop,
          fieldSamples:"7",levels:"5",grid:"64"});
      const response=await worker.request("quantum.run",job);
      assert.ok(isQuantumResult(response)&&response.operation==="topology"&&response.analysis.kind==="landau_continuum");
      assert.equal(isTopologyResponse(response,job),true);
      assert.equal(response.analysis.converged,true);
      assert.deepEqual(response.analysis.levelIndices,[0,1,2,3,4]);
      for(let i=0;i<response.analysis.fieldValues.length;i++){
        const b=response.analysis.fieldValues[i];
        response.analysis.energies[i].forEach((energy,n)=>
          assert.ok(Math.abs(energy-Math.abs(b)*(n+.5))<1e-10));
        assert.ok(response.analysis.fineMaxErrors[i]<response.analysis.coarseMaxErrors[i]);
      }
      const selection={kind:"landau_level_sample" as const,runId:response.runId,fieldIndex:2,level:3};
      const sample=selectedTopologySample(selection,response);
      assert.equal(sample?.kind,"landau_level_sample");
      assert.equal(selectedTopologySample({...selection,runId:"wrong"},response),null);
      await store.record(job,response);
      const reopened=await new RunStore(join(root,"runs"),join(root,"artifacts")).topology(response.runId);
      assert.deepEqual(reopened,response);
      const payload=await store.scene(response.runId,"standard");
      await verifyScenePayload(payload,digest);
      assert.equal(payload.scene.provenance.source?.entryId,"landau_continuum");
      assert.equal(payload.scene.objects.filter(o=>o.kind==="point-cloud").length,5);
      assert.equal(payload.scene.datasets.find(d=>d.id==="level-3-energy")?.count,7);
      const folder=await store.exportScene(response.runId,root,"standard");
      assert.equal((await readSceneBundle(folder)).scene.provenance.resultSha256,payload.scene.provenance.resultSha256);
      const altered=structuredClone(response);
      if(altered.analysis.kind!=="landau_continuum")throw new Error("Wrong result");
      altered.analysis.energies[2][3]+=.01;
      assert.equal(isTopologyResponse(altered,job),false);
      await writeFile(join(root,"runs",response.runId,"result.json"),"{}\n");
      await assert.rejects(new RunStore(join(root,"runs"),join(root,"artifacts")).topology(response.runId),/integrity check/);
    }
    assert.throws(()=>topologyJob("bad",{...TOPOLOGY_DEFAULTS,modelId:"landau_continuum",fieldStart:"-1",fieldStop:"1"}),/same nonzero sign/);
  }finally{await worker.stop();await rm(root,{recursive:true,force:true});}
});
