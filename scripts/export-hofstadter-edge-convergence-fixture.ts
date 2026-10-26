/** Produce the source-linked, matching-termination two-grid fixture for Math3D. */
import {mkdtemp,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {WorkerSupervisor} from "../apps/desktop/main/worker";
import {RunStore} from "../apps/desktop/main/runs";
import {HofstadterEdgeStudyStore} from "../apps/desktop/main/hofstadter-edge-studies";
import {isQuantumResult,type TopologyResult} from "../packages/contracts";
import {type HofstadterEdgePlan} from "../packages/contracts/hofstadter-edge-study";
import {deriveHofstadterEdgeStudy,hofstadterEdgeJobs} from "../packages/models/hofstadter-edge-study";
import {writeSceneBundle} from "../packages/quantum-scene/bundle";

const destination=process.argv[2];if(!destination)throw new Error("Pass an existing output directory");
const root=await mkdtemp(join(tmpdir(),"qlab-edge-fixture-")),worker=new WorkerSupervisor(process.cwd());
const runs=new RunStore(join(root,"runs"),join(root,"artifacts")),store=new HofstadterEdgeStudyStore(join(root,"studies"),runs);
const plan:HofstadterEdgePlan={schema:"quantum-hofstadter-edge-plan/v1",studyId:"fixture-hofstadter-edge-1-5-two-grid",
  p:1,q:5,hopping:1,grid:9,occupiedBands:1,stripSamples:31,widths:[18,23],convergenceSamples:17};
try{
  await worker.start();const results=[] as TopologyResult[];
  for(const job of hofstadterEdgeJobs(plan)){
    const result=await worker.request("quantum.run",job);
    if(!isQuantumResult(result)||result.operation!=="topology"||result.analysis.kind!=="hofstadter")
      throw new Error("Invalid Harper producer result");
    await runs.record(job,result);results.push(result as TopologyResult);
  }
  const study=await deriveHofstadterEdgeStudy(plan,results);
  if(study.comparison.status!=="consistent"||study.convergence?.status!=="consistent")
    throw new Error("Reference two-grid edge comparison did not resolve");
  await store.save(study);const verified=await store.get(study.studyId),scene=await store.scene(study.studyId);
  const folder=await writeSceneBundle(scene,resolve(destination));
  await writeFile(join(resolve(destination),"hofstadter-edge-convergence-producer-results.json"),
    JSON.stringify({study:verified,results}),{flag:"wx"});
  console.log(JSON.stringify({folder,status:verified.comparison.status,resultHash:scene.scene.provenance.resultSha256}));
}finally{await worker.stop();await rm(root,{recursive:true,force:true});}
