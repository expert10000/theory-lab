/** Export one source-linked local Weyl cone scene for Math3D.
 * Usage: npx tsx scripts/export-weyl-fixture.ts <existing-output-directory>
 */
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {WorkerSupervisor} from "../apps/desktop/main/worker";
import {RunStore} from "../apps/desktop/main/runs";
import {isQuantumResult} from "../packages/contracts";
import {TOPOLOGY_DEFAULTS,isTopologyResponse,topologyJob} from "../packages/models/topology";

const destination=process.argv[2];
if(!destination)throw new Error("Pass an existing output directory");
const root=await mkdtemp(join(tmpdir(),"qlab-weyl-fixture-")),worker=new WorkerSupervisor(process.cwd());
try{
  const job=topologyJob("fixture-weyl-local",{...TOPOLOGY_DEFAULTS,modelId:"weyl_minimal",velocity:"1",chirality:"1",radius:"1",subdivisions:"2"});
  await worker.start();
  const result=await worker.request("quantum.run",job);
  if(!isQuantumResult(result)||result.operation!=="topology"||result.analysis.kind!=="weyl_minimal"||
    !isTopologyResponse(result,job)||result.analysis.lowerChern!==-1)throw new Error("Unverified Weyl local result");
  const store=new RunStore(join(root,"runs"),join(root,"artifacts"));
  await store.record(job,result);await store.topology(result.runId);
  const scene=await store.exportScene(result.runId,resolve(destination),"standard");
  await writeFile(join(resolve(destination),"weyl-local-producer-result.json"),
    await readFile(join(root,"runs",result.runId,"result.json")),{flag:"wx"});
  console.log(JSON.stringify({scene,runId:result.runId,chirality:result.analysis.chirality,
    occupiedChern:result.analysis.lowerChern,samples:result.analysis.positions.length}));
}finally{await worker.stop();await rm(root,{recursive:true,force:true});}
