/** Export an independently produced, source-linked Harper band scene for Math3D. */
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { WorkerSupervisor } from "../apps/desktop/main/worker";
import { RunStore } from "../apps/desktop/main/runs";
import { isQuantumResult } from "../packages/contracts";
import { TOPOLOGY_DEFAULTS, isTopologyResponse, topologyJob } from "../packages/models/topology";

const destination=process.argv[2];
if(!destination)throw new Error("Pass an existing output directory");
const root=await mkdtemp(join(tmpdir(),"qlab-harper-fixture-")),worker=new WorkerSupervisor(process.cwd());
try{
  const job=topologyJob("fixture-harper-p1-q4",{...TOPOLOGY_DEFAULTS,modelId:"hofstadter",
    p:"1",q:"4",hopping:"1",grid:"9"});
  await worker.start();
  const result=await worker.request("quantum.run",job);
  if(!isQuantumResult(result)||result.operation!=="topology"||result.analysis.kind!=="hofstadter"||
     !isTopologyResponse(result,job))throw new Error("Unverified Hofstadter result");
  const store=new RunStore(join(root,"runs"),join(root,"artifacts"));
  await store.record(job,result);
  await store.topology(result.runId);
  const scene=await store.exportScene(result.runId,resolve(destination),"standard");
  await writeFile(join(resolve(destination),"hofstadter-producer-result.json"),
    await readFile(join(root,"runs",result.runId,"result.json")),{flag:"wx"});
  console.log(JSON.stringify({scene,runId:result.runId,bands:result.analysis.bandIndices.length,
    samples:result.analysis.kxValues.length*result.analysis.kyValues.length}));
}finally{await worker.stop();await rm(root,{recursive:true,force:true});}
