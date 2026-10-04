import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {WorkerSupervisor} from "../apps/desktop/main/worker";
import {EvolutionCoordinator} from "../apps/desktop/main/evolution";
import {RunStore} from "../apps/desktop/main/runs";
import {MODEL_REGISTRY,defaultsFor,type EvolutionModelId} from "../packages/models";
import {SWEEP_DEFAULTS,sweepJob} from "../packages/models/sweep";
import {selectedSweepCell} from "../apps/desktop/renderer/sweep-selection";

test("all four declared final-P₁ models retain exact-run 1D grid semantics",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qvis015-final-p1-"));
  const worker=new WorkerSupervisor(process.cwd());
  const artifacts=join(root,"artifacts"),runs=new RunStore(join(root,"runs"),artifacts);
  const coordinator=new EvolutionCoordinator(worker,artifacts,()=>{});
  try{
    assert.equal((await worker.start()).state,"READY");
    for(const model of ["driven_two_level","landau_zener","stuckelberg","strong_drive"] as EvolutionModelId[]){
      const window=MODEL_REGISTRY[model].solverDefaults!;
      const job=sweepJob(model,`qvis015-${model}`,defaultsFor(model),
        {...SWEEP_DEFAULTS[model].x,points:3},null,window.tStart,window.tStop,0,"native");
      const result=await coordinator.run(job);
      await runs.record(job,result);
      const reopened=await new RunStore(join(root,"runs"),join(root,"offline")).sweep(result.runId);
      assert.equal(reopened.result.model.type,model);
      assert.equal(reopened.result.sweep.metric,"final_p1");
      assert.deepEqual(reopened.result.data.shape,{x:3,y:1});
      const view=new DataView(reopened.data.buffer,reopened.data.byteOffset,reopened.data.byteLength);
      const values=Float64Array.from(Array.from({length:3},(_,index)=>view.getFloat64(index*8,true)));
      assert.ok(values.every(value=>value>=0&&value<=1));
      const cell=selectedSweepCell({kind:"grid_cell",runId:result.runId,model,xIndex:1,yIndex:0},result,values);
      assert.equal(cell?.finalP1,values[1]);
      assert.equal(selectedSweepCell({kind:"grid_cell",runId:"other",model,xIndex:1,yIndex:0},result,values),null);
    }
  }finally{await worker.stop();await rm(root,{recursive:true,force:true});}
});
