import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import fixture from "../packages/contracts/fixtures/two-level.job.json";
import type {SpectrumJob,SpectrumResult,WorkerStatus} from "../packages/contracts";
import {cloneSavedJob,savedRerunPreflight} from "../packages/models/saved-rerun";
import {RunStore} from "../apps/desktop/main/runs";

const job=fixture as SpectrumJob;
const gap=Math.hypot(job.model.parameters.delta,job.model.parameters.omega);
function result(input:SpectrumJob,runId:string):SpectrumResult{
  return {schema:"quantum-result/v1",jobId:input.jobId,runId,status:"completed",operation:"diagonalize",
    model:input.model,engine:{name:input.engine,version:"5.3"},
    spectrum:{eigenvalues:[-gap/2,gap/2],units:"normalized",hbar:1},
    provenance:{pythonVersion:"3.12",workerVersion:"1.0",computedAt:"2026-10-03T00:00:00Z",durationMs:2}};
}
const status:WorkerStatus={state:"READY",detail:"ready",capabilities:{schema:"worker-capabilities/v1",protocol:1,
  worker:{version:"1.0"},python:{version:"3.12"},engines:{qutip:{available:true,version:"5.3"},native:{available:true,version:"1.18"}},
  operations:["diagonalize"]}};

test("UI-7 preflight preserves engine and discloses environment drift before rerun",()=>{
  const original=result(job,"parent");
  assert.deepEqual(savedRerunPreflight(job,original,status),{ready:true,reason:null,differences:[]});
  const changed={...status,capabilities:{...status.capabilities!,worker:{version:"2.0"},
    python:{version:"3.13"},engines:{...status.capabilities!.engines,qutip:{available:true,version:"6.0"}}}};
  const review=savedRerunPreflight(job,original,changed);
  assert.equal(review.ready,true);
  assert.equal(review.differences.length,3);
  const missing={...changed,capabilities:{...changed.capabilities,engines:{...changed.capabilities.engines,qutip:{available:false,version:null}}}};
  assert.match(savedRerunPreflight(job,original,missing).reason??"",/no substitute/);
  assert.equal(savedRerunPreflight(job,original,{...status,state:"ERROR"}).ready,false);
  const copy=cloneSavedJob(job,"new-job") as SpectrumJob;
  assert.deepEqual({...copy,jobId:job.jobId},job);
  assert.notStrictEqual(copy.model,job.model);
});

test("UI-7 rerun records a distinct immutable child with verified parent hashes and export lineage",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-rerun-"));
  try{
    const store=new RunStore(join(root,"runs"),join(root,"artifacts"));
    const parent=result(job,"parent-run");
    await store.record(job,parent);
    const childJob=cloneSavedJob(job,"new-job") as SpectrumJob;
    const child=result(childJob,"child-run");
    await assert.rejects(store.record({...childJob,model:{...childJob.model,parameters:{...childJob.model.parameters,delta:2}}},child,"parent-run"),/mismatched/);
    const saved=await store.record(childJob,child,"parent-run");
    assert.equal(saved.parentRunId,"parent-run");
    const restarted=new RunStore(join(root,"runs"),join(root,"missing-worker-artifacts"));
    const inspection=await restarted.inspect("child-run");
    const source=await restarted.inspect("parent-run");
    assert.equal(inspection.lineage?.parentRunId,"parent-run");
    assert.equal(inspection.lineage?.parentJobSha256,source.hashes.job);
    assert.equal(inspection.lineage?.parentResultSha256,source.hashes.result);
    assert.deepEqual((await restarted.verified("parent-run")).job,job);
    assert.equal((await restarted.list()).find(run=>run.runId==="child-run")?.parentRunId,"parent-run");
    const exportPath=join(root,"child-export.json");
    await restarted.export("child-run","manifest",exportPath);
    const exported=JSON.parse(await readFile(exportPath,"utf8"));
    assert.equal(exported.manifest.lineage.parentRunId,"parent-run");
    assert.equal(exported.manifest.hashes.job,inspection.hashes.job);
    const jobPath=join(root,"runs","parent-run","job.json");
    await writeFile(jobPath,(await readFile(jobPath,"utf8")).replace('"delta": 1','"delta": 9'));
    await assert.rejects(restarted.inspect("parent-run"),/integrity/);
    await assert.rejects(restarted.record(cloneSavedJob(job,"third-job"),result(cloneSavedJob(job,"third-job") as SpectrumJob,"third-run"),"parent-run"),/integrity/);
  }finally{await rm(root,{recursive:true,force:true});}
});
