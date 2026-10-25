import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdtemp,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {test} from "node:test";
import {WorkerSupervisor} from "../apps/desktop/main/worker";
import {RunStore} from "../apps/desktop/main/runs";
import {isQuantumResult} from "../packages/contracts";
import {TOPOLOGY_DEFAULTS,isTopologyResponse,topologyJob} from "../packages/models/topology";
import {verifyScenePayload} from "../packages/quantum-scene";
import {readSceneBundle} from "../packages/quantum-scene/bundle";
import {selectedTopologySample} from "../apps/desktop/renderer/topology-selection";

const digest=async(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");

test("Weyl local charge, saved-run restart and spherical scene retain exact samples",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-weyl-")),worker=new WorkerSupervisor(process.cwd());
  const store=new RunStore(join(root,"runs"),join(root,"artifacts"));
  try{
    await worker.start();
    for(const chirality of ["1","-1"]){
      const job=topologyJob(`weyl-${chirality==="1"?"plus":"minus"}`,{...TOPOLOGY_DEFAULTS,modelId:"weyl_minimal",chirality,subdivisions:"1"});
      const response=await worker.request("quantum.run",job);
      assert.ok(isQuantumResult(response)&&response.operation==="topology"&&response.analysis.kind==="weyl_minimal");
      assert.equal(isTopologyResponse(response,job),true);
      assert.equal(response.analysis.lowerChern,-Number(chirality));
      assert.ok(Math.abs(response.analysis.flux+2*Math.PI*Number(chirality))<1e-8);
      const picked=selectedTopologySample({kind:"weyl_sphere_sample",runId:response.runId,index:3},response);
      assert.equal(picked?.kind,"weyl_sphere_sample");
      assert.equal(selectedTopologySample({kind:"weyl_sphere_sample",runId:"run-wrong",index:3},response),null);
      await store.record(job,response);
      assert.deepEqual(await new RunStore(join(root,"runs"),join(root,"artifacts")).topology(response.runId),response);
      const payload=await store.scene(response.runId,"standard");
      await verifyScenePayload(payload,digest);
      assert.equal(payload.scene.provenance.source?.entryId,"weyl_minimal");
      assert.equal(payload.scene.topology?.invariants[1].value,-Number(chirality));
      assert.equal(payload.scene.objects.find(o=>o.id==="weyl-samples")?.positions,"sphere-positions");
      const folder=await store.exportScene(response.runId,root,"standard");
      assert.equal((await readSceneBundle(folder)).scene.provenance.resultSha256,payload.scene.provenance.resultSha256);
      const altered=structuredClone(response);
      if(altered.analysis.kind!=="weyl_minimal")throw new Error("Wrong result");
      altered.analysis.faceFlux[0]+=.01;
      assert.equal(isTopologyResponse(altered,job),false);
      const alteredBand=structuredClone(response);
      if(alteredBand.analysis.kind!=="weyl_minimal")throw new Error("Wrong result");
      alteredBand.analysis.upperBand[0]+=.01;
      assert.equal(isTopologyResponse(alteredBand,job),false);
      await writeFile(join(root,"runs",response.runId,"result.json"),"{}\n");
      await assert.rejects(new RunStore(join(root,"runs"),join(root,"artifacts")).topology(response.runId),/integrity check/);
    }
  }finally{await worker.stop();await rm(root,{recursive:true,force:true});}
});
