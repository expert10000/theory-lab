import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import type {ManyBodyJob,ManyBodyResult} from "../packages/contracts";
import type {IsingStateSource} from "../packages/contracts/ising-state";
import {RunStore} from "../apps/desktop/main/runs";
import {IsingStateStore} from "../apps/desktop/main/ising-state";

test("QVIS-017 sidecar survives restart but refuses source and sidecar tampering",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-ising-state-"));
  const runs=new RunStore(join(root,"runs"),join(root,"artifacts"));
  const job:ManyBodyJob={schema:"quantum-job/v1",jobId:"ising-state-job",operation:"many_body",engine:"native",
    model:{type:"ising_chain",parameters:{sites:2,interaction:1,transverse:0.8,longitudinal:0.1,boundary:"open"}}};
  const result:ManyBodyResult={schema:"quantum-result/v1",jobId:job.jobId,runId:"run-ising-state",status:"completed",
    operation:"many_body",model:job.model,engine:{name:"native",version:"test"},
    spectrum:{lowEnergies:[-1.5,-1],gap:0.5,units:"normalized",hbar:1},
    groundState:{siteMagnetization:[0.6,0.6],halfChainEntropy:0.2},
    provenance:{pythonVersion:"3.12",workerVersion:"test",computedAt:"2026-10-04T00:00:00Z",durationMs:1}};
  let calls=0;
  const compute=async(_job:ManyBodyJob,source:IsingStateSource)=>{calls++;return {
    schema:"quantum-ising-state/v1",source,engine:"native",sites:2,basis:"z-up-is-0-msb-first",
    groundEnergy:-1.5,gap:0.5,degeneracyThreshold:1e-8,status:"resolved",norm:1,residual:1e-12,
    siteMagnetization:[0.6,0.6],connectedZCorrelation:[[0.64,0.1],[0.1,0.64]],cutEntropy:[0.2],
    dominantBasis:[{bits:"00",probability:0.7},{bits:"11",probability:0.2}],omittedProbability:0.1};};
  try{
    await runs.record(job,result);
    const states=new IsingStateStore(join(root,"states"),runs);
    const first=await states.ensure(result.runId,compute);
    assert.equal(first.source.runId,result.runId);
    const restarted=new IsingStateStore(join(root,"states"),new RunStore(join(root,"runs"),join(root,"offline")));
    assert.deepEqual(await restarted.ensure(result.runId,compute),first);
    assert.equal(calls,1,"restart uses the verified sidecar");
    const sidecar=join(root,"states",`${result.runId}.json`),original=await readFile(sidecar,"utf8");
    const corrupted=JSON.parse(original);
    corrupted.sha256="0".repeat(64);
    await writeFile(sidecar,JSON.stringify(corrupted));
    await assert.rejects(restarted.ensure(result.runId,compute),/integrity/);
    assert.equal(calls,1,"tampering must not trigger silent recomputation");
    await writeFile(sidecar,original);
    const parent=join(root,"runs",result.runId,"result.json"),parentText=await readFile(parent,"utf8");
    await writeFile(parent,parentText.replace('"gap": 0.5','"gap": 0.9'));
    await assert.rejects(restarted.get(result.runId),/integrity/);
  }finally{await rm(root,{recursive:true,force:true});}
});
