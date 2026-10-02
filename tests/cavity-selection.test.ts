import {test} from "node:test";
import assert from "node:assert/strict";
import type {CavityResult} from "../packages/contracts";
import {selectedCavitySample} from "../apps/desktop/renderer/cavity-selection";

const data=new Float64Array([0,1,0,0,1,1,1,.2,.8,.01,1,-1]);
test("cavity time selection is scoped to exact run, model, row and six-column artifact",()=>{
  for(const model of ["jaynes_cummings","quantum_rabi"] as const){
    const result={runId:`stored-${model}`,model:{type:model},data:{rows:2}} as CavityResult;
    const selection={kind:"time_sample",model,runId:result.runId,index:1} as const;
    assert.deepEqual(selectedCavitySample(selection,result,data),{index:1,time:1,pExcited:.2,meanPhoton:.8,boundaryProbability:.01,norm:1,parity:-1});
    assert.equal(selectedCavitySample({...selection,runId:"another"},result,data),null);
    assert.equal(selectedCavitySample({...selection,model:model==="jaynes_cummings"?"quantum_rabi":"jaynes_cummings"},result,data),null);
    assert.equal(selectedCavitySample({...selection,index:2},result,data),null);
    assert.equal(selectedCavitySample(selection,result,data.subarray(0,6)),null);
    const corrupted=data.slice();corrupted[7]=Number.NaN;
    assert.equal(selectedCavitySample(selection,result,corrupted),null);
  }
});
