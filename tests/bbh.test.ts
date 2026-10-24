import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {WorkerSupervisor} from "../apps/desktop/main/worker";
import {RunStore} from "../apps/desktop/main/runs";
import {isQuantumResult} from "../packages/contracts";
import {TOPOLOGY_DEFAULTS,isTopologyResponse,topologyJob} from "../packages/models/topology";
import {readSceneBundle} from "../packages/quantum-scene/bundle";
import {verifyScenePayload} from "../packages/quantum-scene";
import {selectedTopologySample} from "../apps/desktop/renderer/topology-selection";

const digest=async(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");

test("BBH saved bulk and finite corner scenes retain one verified source",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-bbh-"));
  const worker=new WorkerSupervisor(process.cwd());
  const store=new RunStore(join(root,"runs"),join(root,"artifacts"));
  try{
    await worker.start();
    const job=topologyJob("bbh-source",{...TOPOLOGY_DEFAULTS,modelId:"bbh",grid:"11",cells:"4"});
    const response=await worker.request("quantum.run",job);
    assert.ok(isQuantumResult(response)&&response.operation==="topology"&&response.analysis.kind==="bbh");
    assert.ok(isTopologyResponse(response,job));
    assert.ok(response.analysis.finite.cornerWeight>.5);
    const selection={kind:"bbh_cell" as const,runId:response.runId,index:0};
    const sample=selectedTopologySample(selection,response);
    assert.equal(sample?.kind,"bbh_cell");
    assert.equal(selectedTopologySample({...selection,runId:"run-other"},response),null);
    await store.record(job,response);
    assert.deepEqual(await new RunStore(join(root,"runs"),join(root,"artifacts")).topology(response.runId),response);
    const finite=await store.scene(response.runId,"standard"),bands=await store.scene(response.runId,"bands");
    await verifyScenePayload(finite,digest);await verifyScenePayload(bands,digest);
    assert.equal(finite.scene.provenance.resultSha256,bands.scene.provenance.resultSha256);
    assert.equal(finite.scene.provenance.source?.entryId,"bbh");
    assert.equal(finite.scene.objects[0].scalars,"midgap-density");
    assert.equal(bands.scene.bands?.energies.length,4);
    assert.ok(finite.scene.annotations[0].text.includes("no quadrupole invariant"));
    for(const view of ["standard","bands"] as const){
      const dir=await store.exportScene(response.runId,root,view);
      const opened=await readSceneBundle(dir);
      assert.equal(opened.scene.provenance.resultSha256,finite.scene.provenance.resultSha256);
    }
    const corrupt=structuredClone(response);
    if(corrupt.analysis.kind!=="bbh")throw new Error("Wrong analysis");
    corrupt.analysis.finite.midgapDensity[0]+=.1;
    assert.equal(isTopologyResponse(corrupt,job),false);
    const falseBand=structuredClone(response);
    if(falseBand.analysis.kind!=="bbh")throw new Error("Wrong analysis");
    falseBand.analysis.bandEnergies[0][20]+=.01;
    assert.equal(isTopologyResponse(falseBand,job),false);
    await writeFile(join(root,"runs",response.runId,"result.json"),"{}\n");
    await assert.rejects(store.topology(response.runId),/integrity check/);
  }finally{await worker.stop();await rm(root,{recursive:true,force:true});}
});
