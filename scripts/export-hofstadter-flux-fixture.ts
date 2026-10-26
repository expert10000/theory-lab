/** Export a bounded, independently produced and verified flux-sweep scene for Math3D. */
import {mkdtemp,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {WorkerSupervisor} from "../apps/desktop/main/worker";
import {RunStore} from "../apps/desktop/main/runs";
import {HofstadterFluxStudyStore} from "../apps/desktop/main/hofstadter-flux-studies";
import {isQuantumResult,type TopologyResult} from "../packages/contracts";
import {reducedFluxes,type HofstadterFluxPlan} from "../packages/contracts/hofstadter-flux-study";
import {runHofstadterFluxStudy} from "../packages/models/hofstadter-flux-study";
import {writeSceneBundle} from "../packages/quantum-scene/bundle";

const destination=process.argv[2];if(!destination)throw new Error("Pass an existing output directory");
const root=await mkdtemp(join(tmpdir(),"qlab-flux-fixture-")),worker=new WorkerSupervisor(process.cwd());
const runs=new RunStore(join(root,"runs"),join(root,"artifacts")),store=new HofstadterFluxStudyStore(join(root,"studies"),runs);
const plan:HofstadterFluxPlan={schema:"quantum-hofstadter-flux-plan/v1",studyId:"fixture-hofstadter-flux-pq4",hopping:1,grid:7,maxDenominator:4,occupiedBands:1};
try{
  await worker.start();
  await store.save({schema:"quantum-hofstadter-flux-study/v1",studyId:plan.studyId,plan,status:"cancelled",points:[],computedAt:new Date().toISOString()});
  const result=await runHofstadterFluxStudy(plan,async job=>{
    const value=await worker.request("quantum.run",job);
    if(!isQuantumResult(value)||value.operation!=="topology"||value.model.type!=="hofstadter"||value.analysis.kind!=="hofstadter")
      throw new Error("Invalid Harper producer result");
    await runs.record(job,value);return value as TopologyResult;
  },async point=>{
    const previous=(await store.get(plan.studyId)).points;
    await store.save({schema:"quantum-hofstadter-flux-study/v1",studyId:plan.studyId,plan,
      status:point.index===reducedFluxes(plan.maxDenominator).length-1?"completed":"cancelled",
      points:[...previous,point],computedAt:new Date().toISOString()});
  });
  if(result.status!=="completed")throw new Error("Incomplete fixture");
  const verified=await store.get(plan.studyId),scene=await store.scene(plan.studyId);
  const folder=await writeSceneBundle(scene,resolve(destination));
  await writeFile(join(resolve(destination),"hofstadter-flux-producer-result.json"),JSON.stringify(verified),{flag:"wx"});
  console.log(JSON.stringify({folder,points:verified.points.length,resultHash:scene.scene.provenance.resultSha256}));
}finally{await worker.stop();await rm(root,{recursive:true,force:true});}
