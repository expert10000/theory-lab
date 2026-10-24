/** Export real worker-backed Atlas BHZ continuum and lattice/ribbon scenes.
 * Usage: npx tsx scripts/export-bhz-general-fixtures.ts <output-directory>
 */
import {mkdtemp,mkdir,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {WorkerSupervisor} from "../apps/desktop/main/worker";
import {RunStore} from "../apps/desktop/main/runs";
import {isQuantumResult} from "../packages/contracts";
import {TOPOLOGY_DEFAULTS,isTopologyResponse,topologyJob} from "../packages/models/topology";

const destination=process.argv[2];
if(!destination)throw new Error("Pass an output directory");
const root=await mkdtemp(join(tmpdir(),"qlab-bhz-general-fixture-"));
const worker=new WorkerSupervisor(process.cwd());
try{
  const job=topologyJob("fixture-bhz-general-m2",{...TOPOLOGY_DEFAULTS,modelId:"bhz_general",mass:"2",grid:"21",R:"0.2",edgeCells:"12",edgeSamples:"15"});
  await worker.start();
  const result=await worker.request("quantum.run",job);
  if(!isQuantumResult(result)||result.operation!=="topology"||result.analysis.kind!=="bhz_general"||
     !isTopologyResponse(result,job)||result.analysis.z2!==1)throw new Error("Unverified BHZ producer result");
  const store=new RunStore(join(root,"runs"),join(root,"artifacts"));
  await store.record(job,result);
  await store.topology(result.runId);
  const output=resolve(destination);
  await mkdir(output,{recursive:true});
  const continuum=await store.exportScene(result.runId,output,"standard");
  const lattice=await store.exportScene(result.runId,output,"bands");
  const bytes=await readFile(join(root,"runs",result.runId,"result.json"));
  await writeFile(join(output,"bhz-general-producer-result.json"),bytes,{flag:"wx"});
  console.log(JSON.stringify({continuum,lattice,runId:result.runId,z2:result.analysis.z2}));
}finally{await worker.stop();await rm(root,{recursive:true,force:true});}
