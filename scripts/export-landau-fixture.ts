/** Export a source-linked continuum Landau level fan for Math3D. */
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { WorkerSupervisor } from "../apps/desktop/main/worker";
import { RunStore } from "../apps/desktop/main/runs";
import { isQuantumResult } from "../packages/contracts";
import { TOPOLOGY_DEFAULTS, isTopologyResponse, topologyJob } from "../packages/models/topology";

const destination=process.argv[2];
if(!destination)throw new Error("Pass an existing output directory");
const root=await mkdtemp(join(tmpdir(),"qlab-landau-fixture-")),worker=new WorkerSupervisor(process.cwd());
try{
  const job=topologyJob("fixture-landau-fan",{...TOPOLOGY_DEFAULTS,modelId:"landau_continuum",
    mass:"1",charge:"-1",fieldStart:"0.5",fieldStop:"2",fieldSamples:"7",levels:"5",grid:"64"});
  await worker.start();
  const result=await worker.request("quantum.run",job);
  if(!isQuantumResult(result)||result.operation!=="topology"||result.analysis.kind!=="landau_continuum"||
     !isTopologyResponse(result,job)||!result.analysis.converged)throw new Error("Unverified Landau result");
  const store=new RunStore(join(root,"runs"),join(root,"artifacts"));
  await store.record(job,result);
  await store.topology(result.runId);
  const scene=await store.exportScene(result.runId,resolve(destination),"standard");
  await writeFile(join(resolve(destination),"landau-producer-result.json"),
    await readFile(join(root,"runs",result.runId,"result.json")),{flag:"wx"});
  console.log(JSON.stringify({scene,runId:result.runId,fields:result.analysis.fieldValues.length,
    levels:result.analysis.levelIndices.length,maxFineError:Math.max(...result.analysis.fineMaxErrors)}));
}finally{await worker.stop();await rm(root,{recursive:true,force:true});}
