/** Export exact saved BBH producer views for Math3D's read-only fixtures.
 * Usage: npx tsx scripts/export-bbh-fixture.ts <existing-output-directory>
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
const root=await mkdtemp(join(tmpdir(),"qlab-bbh-fixture-")),worker=new WorkerSupervisor(process.cwd());
try{
  const job=topologyJob("fixture-bbh-corners",{...TOPOLOGY_DEFAULTS,modelId:"bbh",grid:"11",cells:"4"});
  await worker.start();
  const result=await worker.request("quantum.run",job);
  if(!isQuantumResult(result)||result.operation!=="topology"||result.analysis.kind!=="bbh"||
    !isTopologyResponse(result,job))throw new Error("Unverified BBH producer result");
  const store=new RunStore(join(root,"runs"),join(root,"artifacts"));
  await store.record(job,result);await store.topology(result.runId);
  const finite=await store.exportScene(result.runId,resolve(destination),"standard");
  const bands=await store.exportScene(result.runId,resolve(destination),"bands");
  await writeFile(join(resolve(destination),"bbh-producer-result.json"),
    await readFile(join(root,"runs",result.runId,"result.json")),{flag:"wx"});
  console.log(JSON.stringify({finite,bands,runId:result.runId,cornerWeight:result.analysis.finite.cornerWeight}));
}finally{await worker.stop();await rm(root,{recursive:true,force:true});}
