import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {test} from "node:test";
import {WorkerSupervisor} from "../apps/desktop/main/worker";
import {RunStore} from "../apps/desktop/main/runs";
import {HofstadterEdgeStudyStore} from "../apps/desktop/main/hofstadter-edge-studies";
import {isQuantumResult,type TopologyResult} from "../packages/contracts";
import {type HofstadterEdgePlan} from "../packages/contracts/hofstadter-edge-study";
import {deriveHofstadterEdgeStudy,hofstadterEdgeJobs} from "../packages/models/hofstadter-edge-study";
import {verifyScenePayload} from "../packages/quantum-scene";
import {readSceneBundle,writeSceneBundle} from "../packages/quantum-scene/bundle";

test("paired source hashes, exact scene arrays, restart and tamper refusal",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-edge-study-")),worker=new WorkerSupervisor(process.cwd());
  const runs=new RunStore(join(root,"runs"),join(root,"artifacts"));
  const store=new HofstadterEdgeStudyStore(join(root,"studies"),runs);
  const plan:HofstadterEdgePlan={schema:"quantum-hofstadter-edge-plan/v1",studyId:"edge-proof",
    p:1,q:6,hopping:1,grid:9,occupiedBands:1,stripSamples:31,widths:[18,24]};
  try{
    await worker.start();const results=[] as TopologyResult[];
    for(const job of hofstadterEdgeJobs(plan)){
      const result=await worker.request("quantum.run",job);
      assert.ok(isQuantumResult(result)&&result.operation==="topology");
      await runs.record(job,result);results.push(result as TopologyResult);
    }
    const study=await deriveHofstadterEdgeStudy(plan,results as [TopologyResult,TopologyResult,TopologyResult]);
    assert.equal(study.comparison.status,"consistent");assert.equal(study.tracking?.status,"consistent");await store.save(study);
    assert.deepEqual(await new HofstadterEdgeStudyStore(join(root,"studies"),runs).get(plan.studyId),study);
    const scene=await store.scene(plan.studyId),arrays=await verifyScenePayload(scene,async b=>createHash("sha256").update(b).digest("hex"));
    const strip=results[1].analysis;assert.equal(strip.kind,"hofstadter");
    assert.deepEqual([...arrays.get("strip-18-left-weight")!],strip.strip!.leftWeights.flat());
    assert.ok(scene.scene.annotations.find(note=>note.id==="bulk")?.text.includes(study.sources[0].resultSha256));
    assert.ok(scene.scene.objects.some(object=>object.id.startsWith("tracked-18-left")));
    const folder=await writeSceneBundle(scene,root);assert.equal((await readSceneBundle(folder)).scene.provenance.model,"hofstadter_bulk_edge_study");
    const changed=structuredClone(study);changed.widths[0].leftFlow++;
    await assert.rejects(store.save(changed),/verification/);
    const changedTracking=structuredClone(study);changedTracking.tracking!.widths[0].crossings[0].overlap=.75;
    await assert.rejects(store.save(changedTracking),/verification/);
    const file=join(folder,"strip-18-left-weight.f64"),bytes=await readFile(file);bytes[0]^=1;await writeFile(file,bytes);
    await assert.rejects(readSceneBundle(folder),/integrity|hash/i);
    await writeFile(join(root,"runs",study.sources[2].runId,"result.json"),"{}\n");
    await assert.rejects(store.get(plan.studyId),/integrity|verification/i);
  }finally{await worker.stop();await rm(root,{recursive:true,force:true});}
});
