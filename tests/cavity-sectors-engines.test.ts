import test from "node:test";
import assert from "node:assert/strict";
import {appendFile,mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {WorkerSupervisor} from "../apps/desktop/main/worker";
import {EvolutionCoordinator} from "../apps/desktop/main/evolution";
import {RunStore} from "../apps/desktop/main/runs";
import {cavityJob} from "../packages/models/cavity";
import {cavitySectorEvidence} from "../packages/models/cavity-sectors";

test("QVIS-019 verifies native/QuTiP JC and Rabi sectors against immutable runs, restart and tampering",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-cavity-sectors-"));
  const worker=new WorkerSupervisor(process.cwd());
  const artifacts=join(root,"artifacts"),savedRoot=join(root,"runs");
  const coordinator=new EvolutionCoordinator(worker,artifacts,()=>{});
  const runs=new RunStore(savedRoot,artifacts);
  try{
    const status=await worker.start();assert.equal(status.state,"READY");
    for(const engine of ["native","qutip"] as const){
      assert.equal(status.capabilities?.engines[engine]?.available,true);
      for(const model of ["jaynes_cummings","quantum_rabi"] as const){
        const job=cavityJob(model,`sector-${model}-${engine}`,{qubitFrequency:"1",cavityFrequency:"1.2",coupling:"0.35",cutoff:"6"},
          {qubit:"excited",photons:0},{type:"schrodinger",tStart:0,tStop:4,samples:41},engine);
        const result=await coordinator.run(job);
        await runs.record(job,result);
        const reopened=new RunStore(savedRoot,join(root,"unused-artifacts"));
        const evidence=cavitySectorEvidence(await reopened.verified(result.runId));
        assert.equal(evidence.runId,result.runId);
        assert.equal(evidence.model,model);
        assert.ok(evidence.maximumDrift<1e-6);
        if(model==="jaynes_cummings"){
          assert.equal(evidence.initialValue,1);
          assert.equal(evidence.levels.length,12);
          assert.ok(evidence.levels.some(level=>level.excitation===1));
        }else{
          assert.equal(evidence.initialValue,-1);
          assert.equal(evidence.levels.length,0,"Rabi eigenlevel parity cannot be inferred from energies");
        }
        await appendFile(join(savedRoot,result.runId,"data.f64"),Buffer.from([0]));
        await assert.rejects(reopened.verified(result.runId),/integrity check/);
      }
    }
  }finally{await worker.stop();await rm(root,{recursive:true,force:true});}
});
