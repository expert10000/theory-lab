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
import {TopologyRunInspector} from "../apps/desktop/renderer/TopologyRunInspector";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";

const digest=async(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");

test("Atlas BHZ continuum, lattice and ribbon survive saved-run and scene verification",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-bhz-general-"));
  const worker=new WorkerSupervisor(process.cwd());
  const store=new RunStore(join(root,"runs"),join(root,"artifacts"));
  try{
    await worker.start();
    const job=topologyJob("bhz-general-source",{...TOPOLOGY_DEFAULTS,modelId:"bhz_general",mass:"2",grid:"21",R:"0.2",edgeCells:"16",edgeSamples:"21"});
    const response=await worker.request("quantum.run",job);
    assert.ok(isQuantumResult(response)&&response.operation==="topology"&&response.analysis.kind==="bhz_general");
    assert.ok(isTopologyResponse(response,job));
    assert.equal(response.analysis.z2,1);
    assert.equal(response.analysis.blockChern,null);
    assert.equal(response.analysis.bulkStates.length,4);
    assert.equal(response.analysis.edge.states[0].amplitudes.length,64);
    const selection={kind:"bhz_ribbon_state" as const,runId:response.runId,index:0};
    const sample=selectedTopologySample(selection,response);
    assert.equal(sample?.kind,"bhz_ribbon_state");
    assert.equal(selectedTopologySample({...selection,runId:"run-other"},response),null);
    const inspector=renderToStaticMarkup(React.createElement(TopologyRunInspector,{context:{result:response,selection,sample,stale:false}}));
    assert.match(inspector,/Complex amplitudes/);
    assert.match(inspector,/Indirect lattice energy gap/);
    assert.match(inspector,/Outer-edge weight/);
    await store.record(job,response);
    assert.deepEqual(await new RunStore(join(root,"runs"),join(root,"artifacts")).topology(response.runId),response);
    const continuum=await store.scene(response.runId,"standard"),lattice=await store.scene(response.runId,"bands");
    await verifyScenePayload(continuum,digest);await verifyScenePayload(lattice,digest);
    assert.equal(continuum.scene.bands?.energies.length,4);
    assert.equal(lattice.scene.bands?.energies.length,4);
    assert.equal(continuum.scene.reciprocal,undefined);
    assert.ok(lattice.scene.reciprocal);
    assert.equal(continuum.scene.provenance.resultSha256,lattice.scene.provenance.resultSha256);
    assert.ok(lattice.scene.objects.some(object=>object.id==="ribbon-states"));
    for(const view of ["standard","bands"] as const){
      const exported=await store.exportScene(response.runId,root,view);
      const opened=await readSceneBundle(exported);
      assert.equal(opened.scene.provenance.resultSha256,lattice.scene.provenance.resultSha256);
    }
    const corrupt=structuredClone(response);
    if(corrupt.analysis.kind!=="bhz_general")throw new Error("Wrong analysis");
    corrupt.analysis.edge.states[0].density[0]+=0.1;
    assert.equal(isTopologyResponse(corrupt,job),false);
    const falseBand=structuredClone(response);
    if(falseBand.analysis.kind!=="bhz_general")throw new Error("Wrong analysis");
    falseBand.analysis.continuumBandEnergies[0][220]+=0.01;
    assert.equal(isTopologyResponse(falseBand,job),false);
    await writeFile(join(root,"runs",response.runId,"result.json"),"{}\n");
    await assert.rejects(store.topology(response.runId),/integrity check/);
  }finally{await worker.stop();await rm(root,{recursive:true,force:true});}
});
