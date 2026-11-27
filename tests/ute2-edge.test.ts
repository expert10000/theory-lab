import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {assertUte2EdgeJob,isUte2EdgeResult} from "../packages/contracts/ute2-edge";
import {isUte2TopologyResult} from "../packages/contracts/ute2-topology";
import {ute2EdgeJob,consistentUte2EdgeResult} from "../packages/models/ute2-edge";
import {ute2TopologyJob} from "../packages/models/ute2-topology";
import {Ute2TopologyRunStore} from "../apps/desktop/main/ute2-topology-runs";
import {Ute2EdgeRunStore} from "../apps/desktop/main/ute2-edge-runs";
import {WorkerSupervisor} from "../apps/desktop/main/worker";

const params={mu:-2,delta:.8,mesh:12};
test("finite strip requires bounded width and a qualified source",async()=>{
  const worker=new WorkerSupervisor(process.cwd());
  try{
    await worker.start();
    const closed=await worker.request("quantum.ute2Topology",ute2TopologyJob({...params,mu:0},"closed-source"));
    assert.ok(isUte2TopologyResult(closed));
    assert.throws(()=>ute2EdgeJob({runId:"run-closed",resultSha256:"a".repeat(64)},closed,12,"edge-closed"),/Qualified/);
    const bulk=await worker.request("quantum.ute2Topology",ute2TopologyJob(params,"valid-source"));
    assert.ok(isUte2TopologyResult(bulk));
    const source={runId:bulk.runId,resultSha256:"a".repeat(64)};
    assertUte2EdgeJob(ute2EdgeJob(source,bulk,12,"edge-valid"));
    assert.throws(()=>assertUte2EdgeJob({...ute2EdgeJob(source,bulk,12,"edge-valid"),width:14}));
  }finally{await worker.stop();}
});

test("negative and positive toy Chern strips localize, trivial strip stays unresolved",async()=>{
  const worker=new WorkerSupervisor(process.cwd());
  try{
    await worker.start();assert.equal(worker.status.state,"READY");
    for(const [mu,status,ky] of [[-2,"localized_in_gap",0],[2,"localized_in_gap",-Math.PI],[5,"not_resolved",-Math.PI]] as const){
      const bulk=await worker.request("quantum.ute2Topology",ute2TopologyJob({...params,mu},`bulk-${mu}`));
      assert.ok(isUte2TopologyResult(bulk));
      const job=ute2EdgeJob({runId:bulk.runId,resultSha256:"a".repeat(64)},bulk,12,`edge-${mu}`);
      const result=await worker.request("quantum.ute2Edge",job);
      assert.ok(isUte2EdgeResult(result));
      assert.ok(consistentUte2EdgeResult(job,result));
      assert.equal(result.edgeStatus,status);assert.equal(result.ky,ky);
      assert.equal(result.widths[0].width,12);assert.equal(result.widths[1].width,24);
      if(status==="localized_in_gap"){
        assert.ok(result.widths[0].boundaryWeight>.8);
        assert.ok(Math.abs(result.widths[1].energies[24])<Math.abs(result.widths[0].energies[12]));
      }else assert.ok(result.widths[1].boundaryWeight<.1);
    }
  }finally{await worker.stop();}
});

test("edge evidence is bound to exact bulk bytes and rejects forged values",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-ute2-edge-"));
  const worker=new WorkerSupervisor(process.cwd());
  try{
    await worker.start();
    const bulkJob=ute2TopologyJob(params,"bulk-source");
    const bulk=await worker.request("quantum.ute2Topology",bulkJob);
    assert.ok(isUte2TopologyResult(bulk));
    const bulkStore=new Ute2TopologyRunStore(join(root,"bulk"));
    const bulkSummary=await bulkStore.record(bulkJob,bulk);
    const source={runId:bulk.runId,resultSha256:bulkSummary.resultSha256};
    const job=ute2EdgeJob(source,bulk,12,"edge-source");
    const edge=await worker.request("quantum.ute2Edge",job);
    assert.ok(isUte2EdgeResult(edge));
    const store=new Ute2EdgeRunStore(join(root,"edge"),bulkStore);
    const summary=await store.record(job,edge);
    const reopened=new Ute2EdgeRunStore(join(root,"edge"),new Ute2TopologyRunStore(join(root,"bulk")));
    assert.equal((await reopened.get(edge.runId)).edgeStatus,"localized_in_gap");
    assert.equal((await reopened.list())[0].resultSha256,summary.resultSha256);
    await assert.rejects(store.record({...job,source:{...source,resultSha256:"b".repeat(64)}},edge),/source failed verification/);
    const file=join(root,"edge",edge.runId,"result.json");
    const original=await readFile(file,"utf8");
    const altered=JSON.parse(original);altered.widths[1].pairDensity[0]+=.2;
    const changed=JSON.stringify(altered,null,2)+"\n";
    await writeFile(file,changed);
    await assert.rejects(reopened.get(edge.runId),/integrity check/);
    const manifestFile=join(root,"edge",edge.runId,"manifest.json");
    const originalManifest=await readFile(manifestFile,"utf8");
    const manifest=JSON.parse(originalManifest);
    manifest.resultSha256=createHash("sha256").update(changed).digest("hex");
    await writeFile(manifestFile,JSON.stringify(manifest,null,2)+"\n");
    await assert.rejects(reopened.get(edge.runId),/scientific consistency/);
    await writeFile(file,original);await writeFile(manifestFile,originalManifest);
    const bulkFile=join(root,"bulk",bulk.runId,"result.json");
    const changedBulk=JSON.parse(await readFile(bulkFile,"utf8"));changedBulk.bulkGap+=.1;
    await writeFile(bulkFile,JSON.stringify(changedBulk,null,2)+"\n");
    await assert.rejects(reopened.get(edge.runId),/integrity check/);
    assert.deepEqual(await reopened.list(),[]);
  }finally{await worker.stop();await rm(root,{recursive:true,force:true});}
});
