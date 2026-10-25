/** Export an exact, source-linked Kitaev bulk invariant fixture for Math3D.
 * Usage: npx tsx scripts/export-kitaev-invariant-fixture.ts <existing-output-directory>
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
const root=await mkdtemp(join(tmpdir(),"qlab-kitaev-invariant-")),worker=new WorkerSupervisor(process.cwd());
try{
  const job=topologyJob("fixture-kitaev-invariant",{...TOPOLOGY_DEFAULTS,modelId:"kitaev_chain",cells:"16",kPoints:"101"});
  await worker.start();
  const result=await worker.request("quantum.run",job);
  if(!isQuantumResult(result)||result.operation!=="topology"||result.analysis.kind!=="kitaev_chain"||
    !result.analysis.invariant||!isTopologyResponse(result,job))throw new Error("Unverified Kitaev invariant result");
  const store=new RunStore(join(root,"runs"),join(root,"artifacts"));
  await store.record(job,result);await store.topology(result.runId);
  const invariant=await store.exportScene(result.runId,resolve(destination),"invariant");
  await writeFile(join(resolve(destination),"kitaev-invariant-producer-result.json"),
    await readFile(join(root,"runs",result.runId,"result.json")),{flag:"wx"});
  console.log(JSON.stringify({invariant,runId:result.runId,parity:result.analysis.invariant.parity,
    winding:result.analysis.invariant.winding}));
}finally{await worker.stop();await rm(root,{recursive:true,force:true});}
