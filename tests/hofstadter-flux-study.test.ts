import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {test} from "node:test";
import {WorkerSupervisor} from "../apps/desktop/main/worker";
import {RunStore} from "../apps/desktop/main/runs";
import {HofstadterFluxStudyStore} from "../apps/desktop/main/hofstadter-flux-studies";
import {isQuantumResult,type TopologyResult} from "../packages/contracts";
import {assertHofstadterFluxPlan,reducedFluxes,type HofstadterFluxPlan} from "../packages/contracts/hofstadter-flux-study";
import {hofstadterFluxJob,runHofstadterFluxStudy} from "../packages/models/hofstadter-flux-study";
import {verifyScenePayload} from "../packages/quantum-scene";
import {readSceneBundle,writeSceneBundle} from "../packages/quantum-scene/bundle";

const digest=async(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
test("bounded reduced flux ordering and filling validation",()=>{
  assert.deepEqual(reducedFluxes(4),[{p:0,q:1},{p:1,q:4},{p:1,q:3},{p:1,q:2},{p:2,q:3},{p:3,q:4}]);
  assert.equal(reducedFluxes(7).length,18);
  assert.throws(()=>reducedFluxes(8));
  assert.throws(()=>assertHofstadterFluxPlan({schema:"quantum-hofstadter-flux-plan/v1",studyId:"bad",hopping:1,grid:7,maxDenominator:4,occupiedBands:4}));
});
test("each butterfly flux is an immutable verified run; restart, scene and tamper refusal",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-flux-study-")),worker=new WorkerSupervisor(process.cwd());
  const runs=new RunStore(join(root,"runs"),join(root,"artifacts"));
  const store=new HofstadterFluxStudyStore(join(root,"studies"),runs);
  const plan:HofstadterFluxPlan={schema:"quantum-hofstadter-flux-plan/v1",studyId:"flux-test",hopping:1,grid:7,maxDenominator:3,occupiedBands:1};
  try{
    await worker.start();
    await store.save({schema:"quantum-hofstadter-flux-study/v1",studyId:plan.studyId,plan,status:"cancelled",points:[],computedAt:new Date().toISOString()});
    const run=async(job:ReturnType<typeof hofstadterFluxJob>)=>{
      const value=await worker.request("quantum.run",job);
      assert.ok(isQuantumResult(value)&&value.operation==="topology"&&value.model.type==="hofstadter");
      await runs.record(job,value);return value as TopologyResult;
    };
    const checkpoint=async(point:import("../packages/contracts/hofstadter-flux-study").HofstadterFluxPoint)=>{
      const previous=(await store.get(plan.studyId)).points;
      await store.save({schema:"quantum-hofstadter-flux-study/v1",studyId:plan.studyId,plan,
        status:point.index===reducedFluxes(plan.maxDenominator).length-1?"completed":"cancelled",
        points:[...previous,point],computedAt:new Date().toISOString()});
    };
    const controller=new AbortController();
    const partial=await runHofstadterFluxStudy(plan,run,async point=>{
      await checkpoint(point);if(point.index===1)controller.abort();
    },controller.signal);
    assert.equal(partial.status,"cancelled");assert.equal(partial.points.length,2);
    const prefix=(await new HofstadterFluxStudyStore(join(root,"studies"),runs).get(plan.studyId)).points;
    const study=await runHofstadterFluxStudy(plan,run,checkpoint,undefined,prefix);
    assert.equal(study.status,"completed");assert.equal(study.points.length,4);
    assert.equal(study.points[0].filling,null);
    assert.equal(study.points.find(p=>p.q===2)?.filling?.conductance,null);
    assert.equal(study.points[0].energies[0].some(energy=>Math.abs(energy-4)<1e-10),true);
    assert.equal(study.points.find(p=>p.q===2)?.converged,false);
    const thirds=study.points.filter(p=>p.q===3);
    assert.equal(thirds.length,2);
    assert.equal(thirds[0].filling?.conductance,-thirds[1].filling!.conductance!);
    assert.ok(thirds.every(p=>p.converged));
    const reopened=await new HofstadterFluxStudyStore(join(root,"studies"),runs).get(plan.studyId);
    assert.deepEqual(reopened.points,study.points);
    const scene=await store.scene(plan.studyId),arrays=await verifyScenePayload(scene,digest);
    assert.deepEqual([...arrays.get("flux-1-energy")!],study.points[1].energies.flat());
    assert.equal(scene.scene.annotations[1].text.includes(study.points[1].resultSha256),true);
    const folder=await writeSceneBundle(scene,root);
    assert.equal((await readSceneBundle(folder)).scene.provenance.resultSha256,scene.scene.provenance.resultSha256);
    const changed=structuredClone(study);changed.points[1].energies[0][0]+=.01;
    await assert.rejects(store.save(changed),/verification/);
    await writeFile(join(root,"runs",study.points[1].runId,"result.json"),"{}\n");
    await assert.rejects(store.get(plan.studyId),/integrity|verification/);
    await assert.rejects(store.scene(plan.studyId),/integrity|verification/);
    const sceneFile=join(folder,"flux-1-energy.f64"),bytes=await readFile(sceneFile);bytes[0]^=1;await writeFile(sceneFile,bytes);
    await assert.rejects(readSceneBundle(folder),/integrity|hash/i);
    assert.equal(hofstadterFluxJob(plan,0).model.type,"hofstadter");
  }finally{await worker.stop();await rm(root,{recursive:true,force:true});}
});
