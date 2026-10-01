import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {WorkerSupervisor} from "../apps/desktop/main/worker";
import {RunStore} from "../apps/desktop/main/runs";
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
  assert.ok(isSpectrumStudyPlan(plan));
  assert.deepEqual(Array.from({length:5},(_,i)=>studyDelta(plan,i)),[-2,-1,0,1,2]);
  for(const bad of [{...plan,output:"final_p1"},{...plan,engine:"dynamiqs"},
    {...plan,axis:{...plan.axis,points:32}},{...plan,axis:{...plan.axis,start:2,stop:-2}},
    {...plan,fixed:{omega:Infinity}},{...plan,unknown:true}])
    await assert.rejects(runSpectrumStudy(bad as typeof plan,async()=>null),/Invalid bounded/);
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
    }
  }finally{await worker.stop();await rm(root,{recursive:true,force:true});}
});
