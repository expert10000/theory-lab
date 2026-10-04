import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {WorkerSupervisor} from "../apps/desktop/main/worker";
import {RunStore} from "../apps/desktop/main/runs";
import {IsingStudyStore} from "../apps/desktop/main/ising-studies";
import type {ManyBodyResult} from "../packages/contracts";
import {isingStudyPlan,runIsingStudy} from "../packages/models/ising-study";

test("native and available QuSpin Ising study points reopen as the exact saved runs",async t=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-ising-engines-"));
  const worker=new WorkerSupervisor(process.cwd());
  const runs=new RunStore(join(root,"runs"),join(root,"artifacts"));
  const studies=new IsingStudyStore(join(root,"studies"),runs);
  try{
    const status=await worker.start();assert.equal(status.state,"READY");
    for(const engine of ["native","quspin"] as const){
      if(!status.capabilities?.engines[engine]?.available){
        assert.equal(engine,"quspin","native engine is required");
        t.diagnostic("Optional QuSpin is unavailable; install requirements-quspin.txt for its numerical acceptance.");
        continue;
      }
      const plan=isingStudyPlan(`real-ising-${engine}`,engine,
        {sites:3,interaction:1,longitudinal:.1,boundary:"open"},0,1,3);
      await studies.save({schema:"quantum-ising-study-result/v1",studyId:plan.studyId,plan,
        status:"cancelled",points:[],computedAt:new Date().toISOString()});
      const result=await runIsingStudy(plan,async job=>{
        const calculated=await worker.request("quantum.run",job);
        await runs.record(job,calculated as ManyBodyResult);return calculated;
      },async point=>{
        const old=await studies.get(plan.studyId);
        await studies.save({...old,points:[...old.points,point],
          status:point.index===plan.axis.points-1?"completed":"cancelled",computedAt:new Date().toISOString()});
      });
      assert.equal(result.status,"completed");
      const restarted=new IsingStudyStore(join(root,"studies"),new RunStore(join(root,"runs"),join(root,"offline")));
      assert.deepEqual((await restarted.get(plan.studyId)).points,result.points);
      for(const point of result.points){
        const saved=await runs.manyBody(point.runId);
        assert.equal(saved.model.parameters.transverse,point.ratio*plan.fixed.interaction);
        assert.deepEqual(saved.spectrum.lowEnergies,point.lowEnergies);
        assert.deepEqual(saved.groundState.siteMagnetization,point.siteMagnetization);
        assert.equal(saved.groundState.halfChainEntropy,point.halfChainEntropy);
      }
    }
  }finally{await worker.stop();await rm(root,{recursive:true,force:true});}
});
