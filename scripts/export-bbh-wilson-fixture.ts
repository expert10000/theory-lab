/** Export a new immutable BBH Wilson diagnostic fixture. Old BBH fixtures remain pinned. */
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {WorkerSupervisor} from "../apps/desktop/main/worker";
import {RunStore} from "../apps/desktop/main/runs";
import {isQuantumResult} from "../packages/contracts";
import {TOPOLOGY_DEFAULTS,isTopologyResponse,topologyJob} from "../packages/models/topology";

const destination=process.argv[2];
if(!destination)throw new Error("Pass an existing output directory");
const root=await mkdtemp(join(tmpdir(),"qlab-bbh-wilson-fixture-")),worker=new WorkerSupervisor(process.cwd());
try{
  const job=topologyJob("fixture-bbh-wilson",{...TOPOLOGY_DEFAULTS,modelId:"bbh",grid:"21",cells:"4"});
  await worker.start();
  const result=await worker.request("quantum.run",job);
  if(!isQuantumResult(result)||result.operation!=="topology"||result.analysis.kind!=="bbh"||
    !result.analysis.wilson||!isTopologyResponse(result,job))throw new Error("Unverified BBH Wilson producer result");
  const store=new RunStore(join(root,"runs"),join(root,"artifacts"));
  await store.record(job,result);await store.topology(result.runId);
  const wilson=await store.exportScene(result.runId,resolve(destination),"wilson");
  await writeFile(join(resolve(destination),"bbh-wilson-producer-result.json"),
    await readFile(join(root,"runs",result.runId,"result.json")),{flag:"wx"});
  console.log(JSON.stringify({wilson,runId:result.runId,quadrupole:result.analysis.wilson.quadrupole}));
}finally{await worker.stop();await rm(root,{recursive:true,force:true});}
