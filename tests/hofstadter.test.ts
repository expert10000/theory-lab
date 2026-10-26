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

test("Harper bands retain exact reduced flux, samples and source-linked scene across restart",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-harper-")),worker=new WorkerSupervisor(process.cwd());
  const store=new RunStore(join(root,"runs"),join(root,"artifacts"));
  try{
    await worker.start();
    for(const [p,q] of [["1","4"],["-1","4"],["0","1"]] as const){
      const job=topologyJob(`harper-${p.replace("-","neg")}-${q}`,
        {...TOPOLOGY_DEFAULTS,modelId:"hofstadter",p,q,hopping:"1",grid:"9"});
      const response=await worker.request("quantum.run",job);
      assert.ok(isQuantumResult(response)&&response.operation==="topology"&&response.analysis.kind==="hofstadter");
      assert.equal(isTopologyResponse(response,job),true);
      assert.equal(response.analysis.bandIndices.length,Number(q));
      assert.equal(response.analysis.bandEnergies[0].length,81);
      const selection={kind:"hofstadter_band_sample" as const,runId:response.runId,band:0,xIndex:2,yIndex:3};
      const sample=selectedTopologySample(selection,response);
      assert.equal(sample?.kind,"hofstadter_band_sample");
      if(sample?.kind==="hofstadter_band_sample"){
        assert.equal(sample.kx,response.analysis.kxValues[2]);
        assert.equal(sample.ky,response.analysis.kyValues[3]);
        assert.equal(sample.energy,response.analysis.bandEnergies[0][21]);
      }
      assert.equal(selectedTopologySample({...selection,runId:"wrong"},response),null);
      await store.record(job,response);
      assert.deepEqual(await new RunStore(join(root,"runs"),join(root,"artifacts")).topology(response.runId),response);
      const payload=await store.scene(response.runId,"standard"),arrays=await verifyScenePayload(payload,digest);
      assert.equal(payload.scene.provenance.source?.entryId,"hofstadter");
      assert.equal(payload.scene.bands?.energies.length,Number(q)===1?undefined:Number(q));
      assert.deepEqual([...arrays.get("band-0-energy")!],response.analysis.bandEnergies[0]);
      const folder=await store.exportScene(response.runId,root,"standard");
      assert.equal((await readSceneBundle(folder)).scene.provenance.resultSha256,payload.scene.provenance.resultSha256);
      const bad=structuredClone(response);
      if(bad.analysis.kind!=="hofstadter")throw new Error("Wrong result");
      bad.analysis.coarseBounds[0][0]+=.01;
      assert.equal(isTopologyResponse(bad,job),false);
      await writeFile(join(root,"runs",response.runId,"result.json"),"{}\n");
      await assert.rejects(new RunStore(join(root,"runs"),join(root,"artifacts")).topology(response.runId),/integrity check/);
    }
    assert.throws(()=>topologyJob("invalid",{...TOPOLOGY_DEFAULTS,modelId:"hofstadter",p:"2",q:"4",grid:"9"}),/reduced/);
  }finally{await worker.stop();await rm(root,{recursive:true,force:true});}
});
