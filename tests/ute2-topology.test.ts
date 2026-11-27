import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {assertUte2TopologyJob,isUte2TopologyResult} from "../packages/contracts/ute2-topology";
import {consistentUte2TopologyResult,exactUte2ToyMinimum,ute2TopologyJob,ute2ToySolidAngleChern} from "../packages/models/ute2-topology";
import {Ute2TopologyRunStore} from "../apps/desktop/main/ute2-topology-runs";
import {WorkerSupervisor} from "../apps/desktop/main/worker";

const reference={mu:-2,delta:.8,mesh:16};

test("class-D toy contract bounds parameters and mesh",()=>{
  assertUte2TopologyJob(ute2TopologyJob(reference,"classd-contract"));
  for(const change of [{mu:-5.1},{delta:-.1},{delta:2.1},{mesh:14},{mu:Infinity}])
    assert.throws(()=>assertUte2TopologyJob(ute2TopologyJob({...reference,...change},"classd-contract")));
});

test("continuous gap minimization bounds dense momentum samples and closes at exact transitions",()=>{
  for(const [mu,delta] of [[-5,.8],[-2,.8],[-.3,1.2],[.4,.3],[3,2],[0,0]]){
    const exact=exactUte2ToyMinimum(mu,delta);
    for(let ix=0;ix<=100;ix++)for(let iy=0;iy<=100;iy++){
      const kx=-Math.PI+2*Math.PI*ix/100,ky=-Math.PI+2*Math.PI*iy/100;
      const xi=-2*(Math.cos(kx)+Math.cos(ky))-mu;
      const sampled=Math.hypot(delta*Math.sin(kx),delta*Math.sin(ky),xi);
      assert.ok(sampled>=exact-1e-10);
    }
  }
  for(const mu of [-4,0,4])assert.ok(exactUte2ToyMinimum(mu,.8)<1e-10);
  assert.ok(Math.abs(exactUte2ToyMinimum(-2,.8)-.8)<1e-12);
  assert.ok(Math.abs(ute2ToySolidAngleChern(-2,.8,16)+1)<1e-10);
  assert.ok(Math.abs(ute2ToySolidAngleChern(2,.8,16)-1)<1e-10);
});

test("worker withholds closed and unresolved invariants, defines only converged toy Chern",async()=>{
  const worker=new WorkerSupervisor(process.cwd());
  try{
    await worker.start();assert.equal(worker.status.state,"READY");
    for(const [mu,expectedStatus,expectedChern] of [
      [-5,"defined",0],[-2,"defined",-1],[0,"gap_closed",null],[.001,"mesh_unresolved",null],[2,"defined",1],[4,"gap_closed",null],[5,"defined",0]
    ] as const){
      const job=ute2TopologyJob({...reference,mu,mesh:12},`classd-${String(mu).replace('.','p')}`);
      const result=await worker.request("quantum.ute2Topology",job);
      assert.ok(isUte2TopologyResult(result));
      assert.ok(consistentUte2TopologyResult(job,result));
      assert.equal(result.invariantStatus,expectedStatus);
      assert.equal(result.chern,expectedChern);
      if(expectedStatus==="gap_closed")assert.equal(result.curvatureIntegralFine,null);
    }
    for(const [mu,expectedStatus,expectedChern] of [[2,"gap_closed",null],[5,"defined",0]] as const){
      const job=ute2TopologyJob({mu,delta:0,mesh:12},`classd-zero-${mu}`);
      const result=await worker.request("quantum.ute2Topology",job);
      assert.ok(isUte2TopologyResult(result));
      assert.ok(consistentUte2TopologyResult(job,result));
      assert.equal(result.invariantStatus,expectedStatus);
      assert.equal(result.chern,expectedChern);
    }
  }finally{await worker.stop();}
});

test("saved class-D toy run reopens and refuses changed or forged evidence",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-classd-"));
  const worker=new WorkerSupervisor(process.cwd());
  try{
    await worker.start();assert.equal(worker.status.state,"READY");
    const job=ute2TopologyJob(reference,"classd-saved");
    const result=await worker.request("quantum.ute2Topology",job);
    assert.ok(isUte2TopologyResult(result));
    const store=new Ute2TopologyRunStore(root);
    const summary=await store.record(job,result);
    const reopened=new Ute2TopologyRunStore(root);
    assert.equal((await reopened.get(result.runId)).chern,-1);
    assert.equal((await reopened.list())[0].resultSha256,summary.resultSha256);
    const file=join(root,result.runId,"result.json");
    const altered=JSON.parse(await readFile(file,"utf8"));
    altered.chern=1;
    const changedText=JSON.stringify(altered,null,2)+"\n";
    await writeFile(file,changedText);
    await assert.rejects(reopened.get(result.runId),/integrity check/);
    const manifestFile=join(root,result.runId,"manifest.json");
    const manifest=JSON.parse(await readFile(manifestFile,"utf8"));
    manifest.resultSha256=createHash("sha256").update(changedText).digest("hex");
    await writeFile(manifestFile,JSON.stringify(manifest,null,2)+"\n");
    await assert.rejects(reopened.get(result.runId),/scientific consistency/);
    assert.deepEqual(await reopened.list(),[]);
  }finally{await worker.stop();await rm(root,{recursive:true,force:true});}
});
