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
      const strip=response.analysis.strip;
      assert.ok(strip);
      assert.equal(strip.cells,job.model.type==="hofstadter"?job.model.parameters.stripCells:undefined);
      assert.equal(strip.boundary,"open-x / periodic-y");
      assert.ok(strip.maxResidual<1e-8);
      const stripSelection={kind:"hofstadter_strip_sample" as const,runId:response.runId,state:3,kIndex:5};
      const stripSample=selectedTopologySample(stripSelection,response);
      assert.equal(stripSample?.kind,"hofstadter_strip_sample");
      if(stripSample?.kind==="hofstadter_strip_sample"){
        assert.equal(stripSample.ky,strip.kyValues[5]);
        assert.equal(stripSample.energy,strip.energies[3][5]);
        assert.equal(stripSample.leftWeight,strip.leftWeights[3][5]);
        assert.equal(stripSample.rightWeight,strip.rightWeights[3][5]);
      }
      assert.equal(selectedTopologySample({...stripSelection,runId:"wrong"},response),null);
      assert.equal(response.analysis.chernGaps?.length,Number(q)-1);
      if(p==="1")assert.deepEqual(response.analysis.chernGaps?.map(gap=>gap.chern),[-1,null,1]);
      if(p==="-1")assert.deepEqual(response.analysis.chernGaps?.map(gap=>gap.chern),[1,null,-1]);
      if(q==="1")assert.deepEqual(response.analysis.chernGaps,[]);
      if(q==="4"){
        assert.equal(response.analysis.filling?.occupiedBands,1);
        assert.equal(response.analysis.filling?.gapStatus,"open");
        assert.ok((response.analysis.filling?.fineGlobalGap??0)>1.5);
        assert.equal(response.analysis.filling?.status,"defined");
        assert.equal(response.analysis.filling?.conductance,p==="1"?-1:1);
        assert.equal(response.analysis.filling?.conductanceUnit,"e^2/h");
        assert.equal(response.analysis.filling?.diophantineResidual,0);
        assert.equal(response.analysis.filling?.fineGlobalGap,
          response.analysis.fineBounds[1][0]-response.analysis.fineBounds[0][1]);
      }else assert.equal(response.analysis.filling,undefined);
      for(const gap of response.analysis.chernGaps??[]){
        assert.equal(gap.status==="defined",gap.chern!==null);
        assert.equal(gap.plaquetteFlux.length,gap.status==="defined"?gap.mesh**2:0);
      }
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
      assert.deepEqual(payload.scene.topology?.invariants.map(item=>item.value)??[],
        [...(response.analysis.chernGaps?.map(gap=>gap.chern)??[]),
          ...(response.analysis.filling?[response.analysis.filling.fineGlobalGap,response.analysis.filling.conductance]:[])]);
      for(const gap of response.analysis.chernGaps??[]){
        const dataset=`occupied-${gap.occupiedBands}-plaquette-flux`;
        assert.deepEqual([...arrays.get(dataset)??[]],gap.plaquetteFlux);
        assert.equal(payload.scene.topology?.quantities.some(item=>item.dataset===dataset),gap.status==="defined");
      }
      const folder=await store.exportScene(response.runId,root,"standard");
      assert.equal((await readSceneBundle(folder)).scene.provenance.resultSha256,payload.scene.provenance.resultSha256);
      const stripScene=await new RunStore(join(root,"runs"),join(root,"artifacts")).scene(response.runId,"strip");
      const stripArrays=await verifyScenePayload(stripScene,digest);
      assert.equal(stripScene.scene.provenance.resultSha256,payload.scene.provenance.resultSha256);
      assert.equal(stripScene.scene.topology,undefined);
      assert.deepEqual([...stripArrays.get("strip-left-weight")!],strip.leftWeights.flat());
      assert.deepEqual([...stripArrays.get("strip-right-weight")!],strip.rightWeights.flat());
      assert.deepEqual([...stripArrays.get("strip-left-positions")!].slice(9*strip.kyValues.length,9*strip.kyValues.length+3),
        [strip.kyValues[0],3-.15,strip.energies[3][0]]);
      const stripFolder=await store.exportScene(response.runId,root,"strip");
      assert.equal((await readSceneBundle(stripFolder)).scene.provenance.resultSha256,payload.scene.provenance.resultSha256);
      const bad=structuredClone(response);
      if(bad.analysis.kind!=="hofstadter")throw new Error("Wrong result");
      bad.analysis.coarseBounds[0][0]+=.01;
      assert.equal(isTopologyResponse(bad,job),false);
      if(response.analysis.chernGaps?.length){
        const altered=structuredClone(response);
        if(altered.analysis.kind!=="hofstadter"||!altered.analysis.chernGaps)throw new Error("Wrong result");
        altered.analysis.chernGaps[0].chern=7;
        assert.equal(isTopologyResponse(altered,job),false);
      }
      if(response.analysis.filling){
        const altered=structuredClone(response);
        if(altered.analysis.kind!=="hofstadter"||!altered.analysis.filling)throw new Error("Wrong result");
        altered.analysis.filling.conductance=7;
        assert.equal(isTopologyResponse(altered,job),false);
      }
      const alteredStrip=structuredClone(response);
      if(alteredStrip.analysis.kind!=="hofstadter"||!alteredStrip.analysis.strip)throw new Error("Wrong result");
      alteredStrip.analysis.strip.leftWeights[3][5]=1.1;
      assert.equal(isTopologyResponse(alteredStrip,job),false);
      await writeFile(join(root,"runs",response.runId,"result.json"),"{}\n");
      await assert.rejects(new RunStore(join(root,"runs"),join(root,"artifacts")).topology(response.runId),/integrity check/);
      await assert.rejects(new RunStore(join(root,"runs"),join(root,"artifacts")).scene(response.runId,"strip"),/integrity check/);
    }
    const touching=topologyJob("harper-touching-filling",{...TOPOLOGY_DEFAULTS,
      modelId:"hofstadter",p:"1",q:"4",hopping:"1",grid:"9",occupiedBands:"2"});
    const touchingResponse=await worker.request("quantum.run",touching);
    assert.ok(isQuantumResult(touchingResponse)&&touchingResponse.operation==="topology"&&
      touchingResponse.analysis.kind==="hofstadter");
    assert.equal(touchingResponse.analysis.filling?.gapStatus,"gap-closed");
    assert.equal(touchingResponse.analysis.filling?.fermiEnergy,null);
    assert.equal(touchingResponse.analysis.filling?.conductance,null);
    assert.equal(touchingResponse.analysis.filling?.status,"gap-closed");
    assert.equal(isTopologyResponse(touchingResponse,touching),true);
    const signed=topologyJob("harper-signed-hall",{...TOPOLOGY_DEFAULTS,
      modelId:"hofstadter",p:"2",q:"5",hopping:"1",grid:"9",occupiedBands:"1"});
    const signedResult=await worker.request("quantum.run",signed);
    assert.ok(isQuantumResult(signedResult)&&signedResult.operation==="topology"&&
      signedResult.analysis.kind==="hofstadter");
    assert.equal(signedResult.analysis.filling?.status,"defined");
    assert.equal(signedResult.analysis.filling?.conductance,2);
    assert.equal(signedResult.analysis.filling?.diophantineResidual,0);
    assert.equal(isTopologyResponse(signedResult,signed),true);
    assert.throws(()=>topologyJob("bad-filling",{...TOPOLOGY_DEFAULTS,
      modelId:"hofstadter",q:"4",occupiedBands:"4"}),/integer/);
    assert.throws(()=>topologyJob("invalid",{...TOPOLOGY_DEFAULTS,modelId:"hofstadter",p:"2",q:"4",grid:"9"}),/reduced/);
  }finally{await worker.stop();await rm(root,{recursive:true,force:true});}
});
