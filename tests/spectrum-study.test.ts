import {test} from "node:test";
import assert from "node:assert/strict";
import Ajv from "ajv";
import schema from "../packages/contracts/schemas/quantum-spectrum-study.v1.json";
import {mkdtemp,rm,readFile,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {WorkerSupervisor} from "../apps/desktop/main/worker";
import {RunStore} from "../apps/desktop/main/runs";
import {SpectrumStudyStore} from "../apps/desktop/main/spectrum-studies";
import {isSpectrumStudyPlan,isSpectrumStudyResult} from "../packages/contracts/spectrum-study";
import type {SpectrumJob,SpectrumResult} from "../packages/contracts";
import {runSpectrumStudy,spectrumStudyPlan,studyDelta} from "../packages/models/spectrum-study";

function fakeSpectrum(job:SpectrumJob):SpectrumResult{
  const {delta,omega}=job.model.parameters,energy=Math.hypot(delta,omega)/2;
  return {schema:"quantum-result/v1",jobId:job.jobId,runId:`run-${job.jobId}`,status:"completed",
    operation:"diagonalize",engine:{name:job.engine,version:"test"},model:job.model,
    spectrum:{eigenvalues:[-energy,energy],units:"normalized",hbar:1},
    provenance:{pythonVersion:"3.12",workerVersion:"test",computedAt:"2026-10-01T00:00:00Z",durationMs:0}};
}

test("versioned avoided-crossing plan is bounded and never a final-population sweep",async()=>{
  const plan=spectrumStudyPlan("study-1","native",.8,-2,2,5);
  const schemaValid=new Ajv({strict:true}).compile(schema);
  assert.ok(isSpectrumStudyPlan(plan));
  assert.ok(schemaValid(plan));
  assert.deepEqual(Array.from({length:5},(_,i)=>studyDelta(plan,i)),[-2,-1,0,1,2]);
  for(const bad of [{...plan,output:"final_p1"},{...plan,engine:"dynamiqs"},
    {...plan,axis:{...plan.axis,points:32}},{...plan,axis:{...plan.axis,start:2,stop:-2}},
    {...plan,fixed:{omega:Infinity}},{...plan,unknown:true}])
    await assert.rejects(runSpectrumStudy(bad as typeof plan,async()=>null),/Invalid bounded/);
  assert.equal(schemaValid({...plan,output:"final_p1"}),false);
});

test("composition preserves point lineage, detects forged spectra and cancels between durable points",async()=>{
  const plan=spectrumStudyPlan("study-cancel","qutip",.8,-2,2,7),controller=new AbortController();
  const seen:number[]=[];
  const result=await runSpectrumStudy(plan,async job=>fakeSpectrum(job),point=>{
    seen.push(point.index);if(point.index===1)controller.abort();
  },controller.signal);
  assert.equal(result.status,"cancelled");
  assert.deepEqual(seen,[0,1]);
  assert.deepEqual(result.points.map(point=>point.runId),["run-study-cancel-0","run-study-cancel-1"]);
  assert.ok(isSpectrumStudyResult(result));
  assert.ok(new Ajv({strict:true}).compile(schema)(result));
  await assert.rejects(runSpectrumStudy(plan,async job=>fakeSpectrum(job),()=>{},undefined,
    [{...result.points[0],delta:0}]),/resume prefix/);
  await assert.rejects(runSpectrumStudy(plan,async job=>({...fakeSpectrum(job),model:{...job.model,parameters:{delta:0,omega:0}}})),/lineage/);
});

test("real QuTiP/native study points are independently verified and reopen as saved spectra",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-spectrum-study-")),worker=new WorkerSupervisor(process.cwd());
  const store=new RunStore(join(root,"runs"),join(root,"artifacts"));
  try{
    assert.equal((await worker.start()).state,"READY");
    for(const engine of ["qutip","native"] as const){
      const plan=spectrumStudyPlan(`real-${engine}`,engine,.8,-1,1,3);
      const study=await runSpectrumStudy(plan,async job=>{
        const result=await worker.request("quantum.run",job);
        await store.record(job,result as SpectrumResult);
        return result;
      });
      assert.equal(study.status,"completed");
      assert.equal(study.points.length,3);
      assert.ok(study.points[1].eigenvalues[1]>0);
      for(const point of study.points){
        const saved=await store.spectrum(point.runId);
        assert.equal(saved.model.parameters.delta,point.delta);
        assert.deepEqual(saved.spectrum.eigenvalues,point.eigenvalues);
      }
      const crossing=spectrumStudyPlan(`zero-${engine}`,engine,0,-1,1,3);
      const zero=await runSpectrumStudy(crossing,async job=>{
        const result=await worker.request("quantum.run",job);
        await store.record(job,result as SpectrumResult);
        return result;
      });
      const midpoint=await store.spectrum(zero.points[1].runId);
      assert.ok(midpoint.spectrum.eigenvalues.every(energy=>Math.abs(energy)<1e-12));
      assert.equal(midpoint.stateAnalysis?.status,"degenerate");
    }
  }finally{await worker.stop();await rm(root,{recursive:true,force:true});}
});

test("bounded 31-point study includes an exact zero-gap degeneracy",async()=>{
  const plan=spectrumStudyPlan("study-maximum","native",0,-2,2,31);
  const study=await runSpectrumStudy(plan,async job=>fakeSpectrum(job));
  assert.equal(study.status,"completed");
  assert.equal(study.points.length,31);
  assert.equal(study.points[15].delta,0);
  assert.ok(study.points[15].eigenvalues.every(energy=>energy===0));
  for(const point of study.points){
    const energy=Math.hypot(point.delta,plan.fixed.omega)/2;
    assert.ok(Math.abs(point.eigenvalues[0]+energy)<1e-12);
    assert.ok(Math.abs(point.eigenvalues[1]-energy)<1e-12);
  }
});

test("study checkpoints reopen after restart, resume without redoing points, and reject tampering",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-study-manifest-"));
  const runs=new RunStore(join(root,"runs"),join(root,"artifacts"));
  const studies=new SpectrumStudyStore(join(root,"studies"),runs);
  const plan=spectrumStudyPlan("study-durable","native",.8,-2,2,5);
  const controller=new AbortController();
  const launched:number[]=[];
  const run=async(job:SpectrumJob)=>{
    launched.push(Number(job.jobId.split("-").at(-1)));
    const result=fakeSpectrum(job);
    await runs.record(job,result);
    return result;
  };
  try{
    await studies.save({schema:"quantum-spectrum-study-result/v1",studyId:plan.studyId,plan,
      status:"cancelled",points:[],computedAt:new Date().toISOString()});
    const partial=await runSpectrumStudy(plan,run,async point=>{
      const existing=await studies.get(plan.studyId);
      await studies.save({...existing,points:[...existing.points,point],computedAt:new Date().toISOString()});
      if(point.index===1)controller.abort();
    },controller.signal);
    assert.equal(partial.points.length,2);
    const restarted=new SpectrumStudyStore(join(root,"studies"),new RunStore(join(root,"runs"),join(root,"offline")));
    const reopened=await restarted.get(plan.studyId);
    assert.deepEqual(reopened.points,partial.points);
    const summary=(await restarted.list())[0];
    assert.equal(summary.completedPoints,2);
    assert.equal(summary.deltaStart,-2);
    assert.equal(summary.fixedOmega,.8);
    assert.equal(summary.output,"eigenvalues");
    const completed=await runSpectrumStudy(plan,run,async point=>{
      const existing=await studies.get(plan.studyId);
      await studies.save({...existing,points:[...existing.points,point],
        status:point.index===4?"completed":"cancelled",computedAt:new Date().toISOString()});
    },undefined,reopened.points);
    assert.deepEqual(launched,[0,1,2,3,4]);
    assert.equal(completed.status,"completed");
    assert.equal((await restarted.get(plan.studyId)).status,"completed");
    await assert.rejects(studies.save(partial),/cannot replace verified history/);
    const path=join(root,"studies",`${plan.studyId}.json`);
    const record=JSON.parse(await readFile(path,"utf8"));
    record.payload=record.payload.replace("run-study-durable-0","run-study-durable-X");
    await writeFile(path,JSON.stringify(record));
    await assert.rejects(restarted.get(plan.studyId),/integrity/);
    assert.deepEqual(await restarted.list(),[]);
    record.sha256=createHash("sha256").update(record.payload).digest("hex");
    await writeFile(path,JSON.stringify(record));
    await assert.rejects(restarted.get(plan.studyId),/lineage/);
  }finally{await rm(root,{recursive:true,force:true});}
});
