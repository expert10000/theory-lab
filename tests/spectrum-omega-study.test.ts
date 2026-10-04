import {test} from "node:test";
import assert from "node:assert/strict";
import Ajv from "ajv";
import schema from "../packages/contracts/schemas/quantum-spectrum-study.v2.json";
import {createHash} from "node:crypto";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import type {SpectrumJob,SpectrumResult} from "../packages/contracts";
import {isSpectrumOmegaStudyPlan,isSpectrumOmegaStudyResult} from "../packages/contracts/spectrum-omega-study";
import {spectrumOmegaStudyPlan,studyOmega,runSpectrumOmegaStudy} from "../packages/models/spectrum-omega-study";
import {WorkerSupervisor} from "../apps/desktop/main/worker";
import {RunStore} from "../apps/desktop/main/runs";
import {SpectrumStudyStore} from "../apps/desktop/main/spectrum-studies";

function fake(job:SpectrumJob):SpectrumResult {
  const energy=Math.hypot(job.model.parameters.delta,job.model.parameters.omega)/2;
  return {schema:"quantum-result/v1",jobId:job.jobId,runId:`run-${job.jobId}`,status:"completed",
    operation:"diagonalize",engine:{name:job.engine,version:"test"},model:job.model,
    spectrum:{eigenvalues:[-energy,energy],units:"normalized",hbar:1},
    provenance:{pythonVersion:"3.12",workerVersion:"test",computedAt:"2026-10-04T00:00:00Z",durationMs:1}};
}
test("Ω-axis v2 is bounded, JSON-schema compatible and leaves Δ-axis v1 distinct",()=>{
  const plan=spectrumOmegaStudyPlan("omega-1","native",.4,-2,2,5);
  const validate=new Ajv({strict:true}).compile(schema);
  assert.ok(isSpectrumOmegaStudyPlan(plan));assert.ok(validate(plan));
  assert.deepEqual(Array.from({length:5},(_,i)=>studyOmega(plan,i)),[-2,-1,0,1,2]);
  for(const bad of [{...plan,axis:{...plan.axis,parameter:"delta"}},
    {...plan,axis:{...plan.axis,points:32}},{...plan,fixed:{omega:.4}},
    {...plan,output:"final_p1"},{...plan,engine:"quspin"}]){
    assert.equal(isSpectrumOmegaStudyPlan(bad),false);assert.equal(validate(bad),false);
  }
});
test("Ω-axis study checkpoints, resumes without repeating runs, and refuses manifest/run tampering",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-omega-study-"));
  const runs=new RunStore(join(root,"runs"),join(root,"artifacts"));
  const studies=new SpectrumStudyStore(join(root,"studies"),runs);
  const plan=spectrumOmegaStudyPlan("omega-durable","native",.4,-2,2,5);
  const controller=new AbortController(),launched:number[]=[];
  const run=async(job:SpectrumJob)=>{
    launched.push(Number(job.jobId.split("-").at(-1)));
    const result=fake(job);await runs.record(job,result);return result;
  };
  try{
    await studies.save({schema:"quantum-spectrum-study-result/v2",studyId:plan.studyId,plan,
      status:"cancelled",points:[],computedAt:new Date().toISOString()});
    const partial=await runSpectrumOmegaStudy(plan,run,async point=>{
      const old=await studies.get(plan.studyId);
      assert.equal(old.schema,"quantum-spectrum-study-result/v2");
      await studies.save({...old,points:[...old.points,point],computedAt:new Date().toISOString()});
      if(point.index===1)controller.abort();
    },controller.signal);
    assert.equal(partial.points.length,2);assert.ok(isSpectrumOmegaStudyResult(partial));
    const restarted=new SpectrumStudyStore(join(root,"studies"),new RunStore(join(root,"runs"),join(root,"offline")));
    const reopened=await restarted.get(plan.studyId);
    assert.equal(reopened.schema,"quantum-spectrum-study-result/v2");
    assert.deepEqual(reopened.points,partial.points);
    const summary=(await restarted.list())[0];
    assert.ok("fixedDelta" in summary);assert.equal(summary.fixedDelta,.4);
    assert.equal(summary.omegaStart,-2);
    await runSpectrumOmegaStudy(plan,run,async point=>{
      const old=await studies.get(plan.studyId);
      assert.equal(old.schema,"quantum-spectrum-study-result/v2");
      await studies.save({...old,points:[...old.points,point],status:point.index===4?"completed":"cancelled",
        computedAt:new Date().toISOString()});
    },undefined,partial.points);
    assert.deepEqual(launched,[0,1,2,3,4]);
    assert.equal((await restarted.get(plan.studyId)).status,"completed");
    await assert.rejects(studies.save(partial),/cannot replace verified history/);
    const runPath=join(root,"runs",partial.points[0].runId,"result.json");
    const original=await readFile(runPath,"utf8");
    await writeFile(runPath,original.replace('"omega": -2','"omega": -1'));
    await assert.rejects(restarted.get(plan.studyId),/lineage/);
    await writeFile(runPath,original);
    const manifestPath=join(root,"studies",`${plan.studyId}.json`);
    const manifest=JSON.parse(await readFile(manifestPath,"utf8"));
    manifest.payload=manifest.payload.replace("run-omega-durable-0","run-omega-durable-X");
    await writeFile(manifestPath,JSON.stringify(manifest));
    await assert.rejects(restarted.get(plan.studyId),/integrity/);
    manifest.sha256=createHash("sha256").update(manifest.payload).digest("hex");
    await writeFile(manifestPath,JSON.stringify(manifest));
    await assert.rejects(restarted.get(plan.studyId),/lineage/);
  }finally{await rm(root,{recursive:true,force:true});}
});
test("QuTiP and native Ω studies reopen as exact saved spectra",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-omega-engines-"));
  const worker=new WorkerSupervisor(process.cwd());
  const runs=new RunStore(join(root,"runs"),join(root,"artifacts"));
  const studies=new SpectrumStudyStore(join(root,"studies"),runs);
  try{
    assert.equal((await worker.start()).state,"READY");
    for(const engine of ["qutip","native"] as const){
      const plan=spectrumOmegaStudyPlan(`real-omega-${engine}`,engine,.4,-1,1,3);
      const result=await runSpectrumOmegaStudy(plan,async job=>{
        const calculated=await worker.request("quantum.run",job);
        await runs.record(job,calculated as SpectrumResult);return calculated;
      });
      assert.equal(result.status,"completed");
      await studies.save(result);
      const reopened=await studies.get(plan.studyId);
      assert.equal(reopened.schema,"quantum-spectrum-study-result/v2");
      for(const point of result.points){
        const saved=await runs.spectrum(point.runId);
        assert.equal(saved.model.parameters.delta,.4);
        assert.equal(saved.model.parameters.omega,point.omega);
        assert.deepEqual(saved.spectrum.eigenvalues,point.eigenvalues);
      }
    }
  }finally{await worker.stop();await rm(root,{recursive:true,force:true});}
});
