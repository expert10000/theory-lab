import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {RunStore} from "../apps/desktop/main/runs";
import {IsingStudyStore} from "../apps/desktop/main/ising-studies";
import type {ManyBodyJob,ManyBodyResult} from "../packages/contracts";
import {runIsingStudy,isingStudyPlan} from "../packages/models/ising-study";

function fake(job:ManyBodyJob):ManyBodyResult {
  const e0=-2,e1=-1;
  return {schema:"quantum-result/v1",jobId:job.jobId,runId:`run-${job.jobId}`,status:"completed",
    operation:"many_body",model:job.model,engine:{name:job.engine,version:"test"},
    spectrum:{lowEnergies:[e0,e1],gap:e1-e0,units:"normalized",hbar:1},
    groundState:{siteMagnetization:Array(job.model.parameters.sites).fill(.25),halfChainEntropy:.5},
    provenance:{pythonVersion:"3.12",workerVersion:"test",computedAt:"2026-10-04T00:00:00Z",durationMs:1}};
}

test("Ising checkpoints survive restart, resume exact prefix, and refuse tampering",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-ising-study-"));
  const runs=new RunStore(join(root,"runs"),join(root,"artifacts"));
  const studies=new IsingStudyStore(join(root,"studies"),runs);
  const plan=isingStudyPlan("ising-durable","native",{sites:4,interaction:1,longitudinal:.15,boundary:"open"},0,2,5);
  const controller=new AbortController(),launched:number[]=[];
  const run=async(job:ManyBodyJob)=>{
    launched.push(Number(job.jobId.split("-").at(-1)));
    const result=fake(job);await runs.record(job,result);return result;
  };
  try{
    await studies.save({schema:"quantum-ising-study-result/v1",studyId:plan.studyId,plan,
      status:"cancelled",points:[],computedAt:new Date().toISOString()});
    const partial=await runIsingStudy(plan,run,async point=>{
      const old=await studies.get(plan.studyId);
      await studies.save({...old,points:[...old.points,point],computedAt:new Date().toISOString()});
      if(point.index===1)controller.abort();
    },controller.signal);
    assert.equal(partial.points.length,2);
    const restarted=new IsingStudyStore(join(root,"studies"),new RunStore(join(root,"runs"),join(root,"offline")));
    const reopened=await restarted.get(plan.studyId);
    assert.deepEqual(reopened.points,partial.points);
    assert.equal((await restarted.list())[0].completedPoints,2);
    await runIsingStudy(plan,run,async point=>{
      const old=await studies.get(plan.studyId);
      await studies.save({...old,points:[...old.points,point],
        status:point.index===4?"completed":"cancelled",computedAt:new Date().toISOString()});
    },undefined,reopened.points);
    assert.deepEqual(launched,[0,1,2,3,4]);
    assert.equal((await restarted.get(plan.studyId)).status,"completed");
    await assert.rejects(studies.save(partial),/cannot replace verified history/);
    const runPath=join(root,"runs",partial.points[0].runId,"result.json");
    const runText=await readFile(runPath,"utf8");
    await writeFile(runPath,runText.replace('"gap": 1','"gap": 9'));
    await assert.rejects(restarted.get(plan.studyId),/lineage/);
    await writeFile(runPath,runText);
    const path=join(root,"studies",`${plan.studyId}.json`);
    const manifest=JSON.parse(await readFile(path,"utf8"));
    manifest.payload=manifest.payload.replace("run-ising-durable-0","run-ising-durable-X");
    await writeFile(path,JSON.stringify(manifest));
    await assert.rejects(restarted.get(plan.studyId),/integrity/);
    assert.deepEqual(await restarted.list(),[]);
    manifest.sha256=createHash("sha256").update(manifest.payload).digest("hex");
    await writeFile(path,JSON.stringify(manifest));
    await assert.rejects(restarted.get(plan.studyId),/lineage/);
  }finally{await rm(root,{recursive:true,force:true});}
});
