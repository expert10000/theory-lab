import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {WorkerSupervisor} from "../apps/desktop/main/worker";
import {RunStore} from "../apps/desktop/main/runs";
import {IsingStateStore} from "../apps/desktop/main/ising-state";
import type {ManyBodyJob,ManyBodyResult} from "../packages/contracts";
import {isIsingStateArtifact} from "../packages/contracts/ising-state";

test("QVIS-017 real native/QuSpin state summaries attach only to exact verified runs",async t=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-ising-state-real-"));
  const worker=new WorkerSupervisor(process.cwd());
  const runs=new RunStore(join(root,"runs"),join(root,"artifacts"));
  const states=new IsingStateStore(join(root,"states"),runs);
  try{
    const status=await worker.start();assert.equal(status.state,"READY");
    for(const engine of ["native","quspin"] as const){
      if(!status.capabilities?.engines[engine]?.available){
        assert.equal(engine,"quspin");t.diagnostic("Optional QuSpin unavailable");continue;
      }
      const job:ManyBodyJob={schema:"quantum-job/v1",jobId:`ising-state-${engine}`,operation:"many_body",engine,
        model:{type:"ising_chain",parameters:{sites:4,interaction:1,transverse:0.8,longitudinal:0.15,boundary:"open"}}};
      const result=await worker.request("quantum.run",job) as ManyBodyResult;
      await runs.record(job,result);
      const inspected=await states.ensure(result.runId,async(saved,source)=>worker.request("quantum.isingState",{job:saved,source}));
      assert.ok(isIsingStateArtifact(inspected));
      assert.equal(inspected.status,"resolved");
      assert.equal(inspected.source.runId,result.runId);
      assert.equal(inspected.source.resultSha256,(await runs.inspect(result.runId)).hashes.result);
      assert.equal(inspected.connectedZCorrelation?.length,4);
      const restarted=new IsingStateStore(join(root,"states"),new RunStore(join(root,"runs"),join(root,"offline")));
      assert.deepEqual(await restarted.get(result.runId),inspected);
    }
  }finally{await worker.stop();await rm(root,{recursive:true,force:true});}
});
