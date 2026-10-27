/** Export one immutable Rice–Mele run as finite and periodic views for Math3D.
 * Usage: npx tsx scripts/export-rice-mele-fixture.ts <existing-output-directory>
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
const root=await mkdtemp(join(tmpdir(),"qlab-rice-mele-fixture-"));
const worker=new WorkerSupervisor(process.cwd());
try{
  const job=topologyJob("fixture-rice-mele-static",{...TOPOLOGY_DEFAULTS,modelId:"rice_mele",delta:"0.2",cells:"16",kPoints:"101"});
  await worker.start();
  const result=await worker.request("quantum.run",job);
  if(!isQuantumResult(result)||result.operation!=="topology"||result.analysis.kind!=="rice_mele"||
     !isTopologyResponse(result,job))throw new Error("Unverified Rice–Mele result");
  const store=new RunStore(join(root,"runs"),join(root,"artifacts"));
  await store.record(job,result);
  await store.topology(result.runId);
  const finite=await store.exportScene(result.runId,resolve(destination),"standard");
  const bands=await store.exportScene(result.runId,resolve(destination),"bands");
  await writeFile(join(resolve(destination),"rice-mele-producer-result.json"),
    await readFile(join(root,"runs",result.runId,"result.json")),{flag:"wx"});
  console.log(JSON.stringify({finite,bands,runId:result.runId,gap:result.analysis.bulkGap}));
}finally{await worker.stop();await rm(root,{recursive:true,force:true});}
