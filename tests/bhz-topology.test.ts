import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {WorkerSupervisor} from "../apps/desktop/main/worker";
import {RunStore} from "../apps/desktop/main/runs";
import {isQuantumResult} from "../packages/contracts";
import {TOPOLOGY_DEFAULTS,consistentTopologyResult,isTopologyResponse,topologyJob} from "../packages/models/topology";
import {readSceneBundle} from "../packages/quantum-scene/bundle";
import {verifyScenePayload} from "../packages/quantum-scene";

const digest=async(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");

test("BHZ producer, saved run and portable four-band scene keep one verified source",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-bhz-"));
  const worker=new WorkerSupervisor(process.cwd());
  const store=new RunStore(join(root,"runs"),join(root,"artifacts"));
  try{
    await worker.start();
    const job=topologyJob("bhz-source",{...TOPOLOGY_DEFAULTS,modelId:"bhz",mass:"2",grid:"21"});
    const result=await worker.request("quantum.run",job);
    assert.ok(isQuantumResult(result)&&result.operation==="topology"&&result.analysis.kind==="bhz");
    assert.ok(isTopologyResponse(result,job));
    assert.equal(result.analysis.z2,1);
    assert.deepEqual([result.analysis.blockChern,result.analysis.partnerChern],[1,-1]);
    await store.record(job,result);
    assert.deepEqual(await new RunStore(join(root,"runs"),join(root,"artifacts")).topology(result.runId),result);
    const payload=await store.scene(result.runId,"bands"),arrays=await verifyScenePayload(payload,digest);
    assert.equal(payload.scene.provenance.model,"bhz");
    assert.equal(payload.scene.bands?.energies.length,4);
    assert.deepEqual(payload.scene.bands?.labels,["Block occupied","Partner occupied","Block empty","Partner empty"]);
    assert.equal(payload.scene.topology?.invariants.find(item=>item.id==="spin-z2")?.value,1);
    assert.equal(payload.scene.provenance.resultSha256,await digest(await readFile(join(root,"runs",result.runId,"result.json"))));
    assert.deepEqual([...arrays.get(payload.scene.bands!.energies[0])!],result.analysis.bandEnergies[0]);
    const directory=await store.exportScene(result.runId,root,"bands"),offline=await readSceneBundle(directory);
    assert.deepEqual(offline.scene,payload.scene);
    const file=join(directory,"band-energy-0.f64"),bytes=await readFile(file);
    bytes[0]^=1;await writeFile(file,bytes);
    await assert.rejects(readSceneBundle(directory),/hash|integrity|digest/i);
    const corrupt=structuredClone(result);
    if(corrupt.analysis.kind!=="bhz")throw new Error("Wrong analysis");
    corrupt.analysis.bandEnergies[0][0]+=0.2;
    assert.equal(consistentTopologyResult(job,corrupt),false);
    assert.equal(isTopologyResponse(corrupt,job),false);
    await writeFile(join(root,"runs",result.runId,"result.json"),"{}\n");
    await assert.rejects(store.topology(result.runId),/integrity check/);
  }finally{await worker.stop();await rm(root,{recursive:true,force:true});}
});
