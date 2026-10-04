import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {WorkerSupervisor} from "../apps/desktop/main/worker";
import {RunStore} from "../apps/desktop/main/runs";
import {IsingQuenchStore} from "../apps/desktop/main/ising-quench";
import type {ManyBodyJob,ManyBodyResult} from "../packages/contracts";
import {isIsingQuenchArtifact,isIsingQuenchRequest} from "../packages/contracts/ising-quench";

test("QVIS-020 bounded Ising quench validates requests and recorded rows",()=>{
  assert.equal(isIsingQuenchRequest({targetTransverse:1.2,duration:5,samples:21}),true);
  for(const bad of [{targetTransverse:11,duration:5,samples:21},{targetTransverse:1,duration:0,samples:21},
    {targetTransverse:1,duration:5,samples:102},{targetTransverse:1,duration:5,samples:21,code:"x"}])
    assert.equal(isIsingQuenchRequest(bad),false);
});

test("QVIS-020 native and optional QuSpin saved runs produce verified, restartable quench rows",async t=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-ising-quench-"));
  const worker=new WorkerSupervisor(process.cwd());
  const runs=new RunStore(join(root,"runs"),join(root,"artifacts"));
  const quenches=new IsingQuenchStore(join(root,"quenches"),runs);
  const request={targetTransverse:1.2,duration:4,samples:21};
  try{
    const status=await worker.start();assert.equal(status.state,"READY");
    for(const engine of ["native","quspin"] as const){
      if(!status.capabilities?.engines[engine]?.available){t.diagnostic("Optional QuSpin unavailable");continue;}
      const job:ManyBodyJob={schema:"quantum-job/v1",jobId:`ising-quench-${engine}`,operation:"many_body",engine,
        model:{type:"ising_chain",parameters:{sites:3,interaction:1,transverse:0.6,longitudinal:0.2,boundary:"open"}}};
      const result=await worker.request("quantum.run",job) as ManyBodyResult;
      await runs.record(job,result);
      const compute=(saved:ManyBodyJob,source:unknown,sourceResult:ManyBodyResult,quench:unknown)=>
        worker.request("quantum.isingQuench",{job:saved,source,sourceResult,quench});
      const artifact=await quenches.ensure(result.runId,request,compute);
      assert.ok(isIsingQuenchArtifact(artifact));
      assert.equal(artifact.rows.length,21);
      assert.equal(artifact.rows[0].siteMagnetization.length,3);
      assert.ok(artifact.maximumNormDrift<1e-8);
      assert.ok(artifact.maximumEnergyDrift<1e-8);
      assert.ok(artifact.rows.some((row,index)=>index>0&&Math.abs(row.siteMagnetization[0]-artifact.rows[0].siteMagnetization[0])>1e-4));
      const reopened=new IsingQuenchStore(join(root,"quenches"),new RunStore(join(root,"runs"),join(root,"offline")));
      assert.deepEqual(await reopened.get(result.runId,request),artifact);
      const key=(await import("node:crypto")).createHash("sha256").update(JSON.stringify(request)).digest("hex").slice(0,24);
      const path=join(root,"quenches",`${result.runId}-${key}.json`),original=await readFile(path,"utf8");
      const forged=JSON.parse(original);forged.sha256="0".repeat(64);await writeFile(path,JSON.stringify(forged));
      await assert.rejects(reopened.get(result.runId,request),/integrity/);
      await writeFile(path,original);
      const sourcePath=join(root,"runs",result.runId,"result.json"),sourceText=await readFile(sourcePath,"utf8");
      await writeFile(sourcePath,sourceText.replace("\"gap\"",'"forgedGap"'));
      await assert.rejects(reopened.get(result.runId,request));
    }
  }finally{await worker.stop();await rm(root,{recursive:true,force:true});}
});
