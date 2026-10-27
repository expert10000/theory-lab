import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdtemp,readFile,rename,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {test} from "node:test";
import {WorkerSupervisor} from "../apps/desktop/main/worker";
import {RunStore} from "../apps/desktop/main/runs";
import {RiceMeleConvergenceStudyStore} from "../apps/desktop/main/rice-mele-convergence-studies";
import {isQuantumResult} from "../packages/contracts";
import {deriveRiceMeleConvergenceStudy} from "../packages/models/rice-mele-convergence";
import {TOPOLOGY_DEFAULTS,topologyJob} from "../packages/models/topology";
import {readSceneBundle,writeSceneBundle} from "../packages/quantum-scene/bundle";
import {verifyScenePayload} from "../packages/quantum-scene";

const digest=async(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
test("Rice–Mele convergence links controlled runs and refuses missing or changed sources",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-rice-convergence-"));
  const worker=new WorkerSupervisor(process.cwd());
  const runs=new RunStore(join(root,"runs"),join(root,"artifacts"));
  const studies=new RiceMeleConvergenceStudyStore(join(root,"studies"),runs);
  try{
    await worker.start();
    const inputs=[[20,6],[30,6],[40,6],[30,4],[30,8]] as const;
    const results=[];
    for(const [duration,width] of inputs){
      const job=topologyJob(`rice-conv-${duration}-${width}`,{...TOPOLOGY_DEFAULTS,
        modelId:"rice_mele_pump",pumpK:"16",pumpPhases:"16",pumpSteps:"4",
        pumpDuration:String(duration),pumpChainCells:String(width)});
      const value=await worker.request("quantum.run",job);
      assert.ok(isQuantumResult(value)&&value.operation==="topology"&&value.analysis.kind==="rice_mele_pump");
      await runs.record(job,value);results.push(value);
    }
    const [short,anchor,long,narrow,wide]=results;
    if(anchor.analysis.kind!=="rice_mele_pump"||wide.analysis.kind!=="rice_mele_pump")throw new Error("Wrong analysis");
    const plan={schema:"quantum-rice-mele-convergence-plan/v1" as const,studyId:"rice-convergence-acceptance",
      anchorRunId:anchor.runId,durationRuns:[short.runId,anchor.runId,long.runId],
      widthRuns:[narrow.runId,anchor.runId,wide.runId]};
    const study=await deriveRiceMeleConvergenceStudy(plan,results);
    assert.equal(study.sources.length,5);
    assert.equal(study.sources[1].periodicCharge,anchor.analysis.dynamics!.transportedCharge);
    assert.equal(study.sources[4].chainCentralBondCharge,wide.analysis.finiteChain!.centralBondCharge.at(-1));
    assert.deepEqual(study.durationRuns,[short.runId,anchor.runId,long.runId]);
    await studies.save(study);
    const restarted=new RiceMeleConvergenceStudyStore(join(root,"studies"),
      new RunStore(join(root,"runs"),join(root,"artifacts")));
    assert.deepEqual(await restarted.get(study.studyId),study);
    const payload=await restarted.scene(study.studyId);
    const arrays=await verifyScenePayload(payload,digest);
    assert.deepEqual([...arrays.get("periodic-recorded-charge")!],
      [study.sources[0].periodicCharge,study.sources[1].periodicCharge,study.sources[2].periodicCharge]);
    assert.deepEqual([...arrays.get("chain-recorded-charge")!],
      [study.sources[3].chainCentralBondCharge,study.sources[1].chainCentralBondCharge,study.sources[4].chainCentralBondCharge]);
    assert.match(payload.scene.annotations.find(a=>a.id==="scope")!.text,/no equal-limit/);
    const exported=await writeSceneBundle(payload,root);
    assert.equal((await readSceneBundle(exported)).scene.provenance.resultSha256,payload.scene.provenance.resultSha256);
    const manifestPath=join(root,"studies",`${study.studyId}.json`);
    const originalManifest=await readFile(manifestPath,"utf8");
    await writeFile(manifestPath,originalManifest.replace("periodicCharge","periodicChargX"));
    await assert.rejects(restarted.get(study.studyId),/integrity/);
    await writeFile(manifestPath,originalManifest);
    const changed=structuredClone(wide);
    if(changed.analysis.kind!=="rice_mele_pump")throw new Error("Wrong analysis");
    if(changed.model.type!=="rice_mele_pump")throw new Error("Wrong model");
    changed.model.parameters.modulation+=.01;
    await assert.rejects(deriveRiceMeleConvergenceStudy(plan,[short,anchor,long,narrow,changed]),/cycle parameters differ/);
    const wrongWidth=structuredClone(wide);
    if(wrongWidth.model.type!=="rice_mele_pump")throw new Error("Wrong model");
    wrongWidth.model.parameters.duration=31;
    await assert.rejects(deriveRiceMeleConvergenceStudy(plan,[short,anchor,long,narrow,wrongWidth]),/linked periodic and open-chain/);
    const runDir=join(root,"runs",wide.runId);
    await rename(runDir,`${runDir}-missing`);
    await assert.rejects(restarted.get(study.studyId));
    assert.equal((await restarted.list()).length,0);
    await rename(`${runDir}-missing`,runDir);
    await writeFile(join(runDir,"result.json"),"{}\n");
    await assert.rejects(restarted.get(study.studyId),/integrity/);
    await assert.rejects(restarted.scene(study.studyId),/integrity/);
    await assert.rejects(studies.save(study),/integrity/);
  }finally{await worker.stop();await rm(root,{recursive:true,force:true});}
});
