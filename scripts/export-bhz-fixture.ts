/** Produce a reviewed BHZ example from the real worker and immutable run store.
 * Usage: npx tsx scripts/export-bhz-fixture.ts <output-directory>
 */
import {mkdtemp,mkdir,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {WorkerSupervisor} from "../apps/desktop/main/worker";
import {RunStore} from "../apps/desktop/main/runs";
import {isQuantumResult} from "../packages/contracts";
import {TOPOLOGY_DEFAULTS,isTopologyResponse,topologyJob} from "../packages/models/topology";

const destination=process.argv[2];
if(!destination)throw new Error("Pass an existing output directory");
const root=await mkdtemp(join(tmpdir(),"qlab-bhz-fixture-"));
const worker=new WorkerSupervisor(process.cwd());
try{
  const job=topologyJob("fixture-bhz-m2-g21",{...TOPOLOGY_DEFAULTS,modelId:"bhz",mass:"2",grid:"21"});
  await worker.start();
  const result=await worker.request("quantum.run",job);
  if(!isQuantumResult(result)||result.operation!=="topology"||result.analysis.kind!=="bhz"||
     !isTopologyResponse(result,job)||result.analysis.z2!==1)throw new Error("Unverified BHZ producer result");
  const store=new RunStore(join(root,"runs"),join(root,"artifacts"));
  await store.record(job,result);
  await store.topology(result.runId);
  await mkdir(resolve(destination),{recursive:true});
  const directory=await store.exportScene(result.runId,resolve(destination),"bands");
  const bytes=await readFile(join(root,"runs",result.runId,"result.json"));
  await writeFile(join(resolve(destination),"bhz-producer-result.json"),bytes,{flag:"wx"});
  console.log(JSON.stringify({directory,runId:result.runId,z2:result.analysis.z2,blockChern:result.analysis.blockChern}));
}finally{await worker.stop();await rm(root,{recursive:true,force:true});}
