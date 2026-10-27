import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
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

test("finite open-chain pump saves exact site and bond samples and refuses changed source",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-rice-chain-"));
  const worker=new WorkerSupervisor(process.cwd());
  const store=new RunStore(join(root,"runs"),join(root,"artifacts"));
  try{
    await worker.start();
    const draft={...TOPOLOGY_DEFAULTS,modelId:"rice_mele_pump" as const,pumpK:"16",pumpPhases:"16",pumpDuration:"40",pumpSteps:"8",pumpChainCells:"6"};
    const job=topologyJob("rice-chain-study",draft);
    const result=await worker.request("quantum.run",job);
    assert.ok(isQuantumResult(result)&&result.operation==="topology"&&result.analysis.kind==="rice_mele_pump");
    assert.ok(isTopologyResponse(result,job));
    const c=result.analysis.finiteChain;
    assert.ok(c&&c.cells===6&&c.sites===12&&c.occupiedOrbitals===6);
    assert.equal(c.status,"resolved");
    assert.ok(c.maxNormDrift<1e-8&&c.maxParticleDrift<1e-8&&c.maxContinuityResidual<.02);
    const selection={kind:"rice_mele_chain_sample" as const,runId:result.runId,timeIndex:8,siteIndex:5};
    const picked=selectedTopologySample(selection,result);
    assert.equal(picked?.kind,"rice_mele_chain_sample");
    if(picked?.kind==="rice_mele_chain_sample"){
      assert.equal(picked.density,c.siteDensity[8*c.sites+5]);
      assert.equal(picked.rightBondCurrent,c.bondElectronCurrent[8*(c.sites-1)+5]);
    }
    assert.equal(selectedTopologySample({...selection,runId:"wrong-run"},result),null);
    await store.record(job,result);
    const restarted=new RunStore(join(root,"runs"),join(root,"artifacts"));
    assert.deepEqual(await restarted.topology(result.runId),result);
    const scene=await restarted.scene(result.runId,"standard");
    const arrays=await verifyScenePayload(scene,digest);
    assert.equal(scene.scene.provenance.resultSha256.length,64);
    assert.deepEqual([...arrays.get("chain-site-density")!],c.siteDensity);
    assert.deepEqual([...arrays.get("chain-bond-current")!],c.bondElectronCurrent);
    assert.deepEqual([...arrays.get("chain-central-charge")!],c.centralBondCharge);
    assert.match(scene.scene.annotations[0].text,/not labelled quantized/);
    const exported=await restarted.exportScene(result.runId,root,"standard");
    assert.equal((await readSceneBundle(exported)).scene.provenance.resultSha256,scene.scene.provenance.resultSha256);
    const csv=join(root,"chain.csv");
    await restarted.export(result.runId,"csv",csv);
    assert.match(await readFile(csv,"utf8"),/open_chain_time_index,site_index,particle_density/);
    const altered=structuredClone(result);
    if(altered.analysis.kind!=="rice_mele_pump"||!altered.analysis.finiteChain)throw new Error("Missing chain result");
    altered.analysis.finiteChain.siteDensity[0]+=.2;
    assert.equal(isTopologyResponse(altered,job),false);
    await writeFile(join(root,"runs",result.runId,"result.json"),"{}\n");
    await assert.rejects(restarted.topology(result.runId),/integrity check/);
    await assert.rejects(restarted.scene(result.runId,"standard"),/integrity check/);
  }finally{await worker.stop();await rm(root,{recursive:true,force:true});}
});

test("finite-speed Rice–Mele run records exact current, charge and convergence without a quantization claim",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-rice-speed-"));
  const worker=new WorkerSupervisor(process.cwd());
  const store=new RunStore(join(root,"runs"),join(root,"artifacts"));
  try{
    await worker.start();
    const draft={...TOPOLOGY_DEFAULTS,modelId:"rice_mele_pump" as const,pumpDuration:"80",pumpSteps:"16"};
    const job=topologyJob("rice-speed-study",draft);
    const result=await worker.request("quantum.run",job);
    assert.ok(isQuantumResult(result)&&result.operation==="topology"&&result.analysis.kind==="rice_mele_pump");
    assert.ok(isTopologyResponse(result,job));
    const d=result.analysis.dynamics;
    assert.ok(d&&d.status==="resolved");
    assert.equal(d.duration,80);
    assert.ok(Math.abs(d.transportedCharge+1)<.03);
    assert.ok(d.maxNormDrift<1e-10&&d.timeStepChargeDrift<.02&&d.momentumChargeDrift<.02);
    const picked=selectedTopologySample({kind:"rice_mele_dynamic_sample",runId:result.runId,timeIndex:8,kIndex:4},result);
    assert.equal(picked?.kind,"rice_mele_dynamic_sample");
    if(picked?.kind==="rice_mele_dynamic_sample")assert.equal(picked.localCurrent,d.currentByK[8*d.kValues.length+4]);
    await store.record(job,result);
    const restarted=new RunStore(join(root,"runs"),join(root,"artifacts"));
    assert.deepEqual(await restarted.topology(result.runId),result);
    const scene=await restarted.scene(result.runId,"standard");
    const arrays=await verifyScenePayload(scene,digest);
    assert.equal(scene.scene.provenance.resultSha256.length,64);
    assert.deepEqual([...arrays.get("finite-current")!],d.current);
    assert.deepEqual([...arrays.get("finite-charge")!],d.charge);
    assert.deepEqual([...arrays.get("finite-current-by-k")!],d.currentByK);
    assert.match(scene.scene.annotations[0].text,/not labelled quantized/);
    const exported=await restarted.exportScene(result.runId,root,"standard");
    assert.equal((await readSceneBundle(exported)).scene.provenance.resultSha256,scene.scene.provenance.resultSha256);
    const csv=join(root,"pump.csv");
    await restarted.export(result.runId,"csv",csv);
    assert.match(await readFile(csv,"utf8"),/time_index,k_index,k,current_at_k/);
    const altered=structuredClone(result);
    if(altered.analysis.kind!=="rice_mele_pump"||!altered.analysis.dynamics)throw new Error("Missing dynamic result");
    altered.analysis.dynamics.current[8]+=.2;
    assert.equal(isTopologyResponse(altered,job),false);
    await writeFile(join(root,"runs",result.runId,"result.json"),"{}\n");
    await assert.rejects(restarted.topology(result.runId),/integrity check/);
    await assert.rejects(restarted.scene(result.runId,"standard"),/integrity check/);
  }finally{await worker.stop();await rm(root,{recursive:true,force:true});}
});
