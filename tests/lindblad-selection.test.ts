import {test} from "node:test";
import assert from "node:assert/strict";
import type {LindbladResult} from "../packages/contracts";
import {selectedLindbladSample} from "../apps/desktop/renderer/lindblad-selection";

const data=new Float64Array([0,1,0,1,0,0,1,1,.2,.8,.7,.1,.01,1]);
test("Lindblad time selection requires the exact saved run, model, row and seven-column artifact",()=>{
  const result={runId:"stored-open",model:{type:"open_jaynes_cummings"},data:{rows:2}} as LindbladResult;
  const selection={kind:"time_sample",model:"open_jaynes_cummings",runId:result.runId,index:1} as const;
  assert.deepEqual(selectedLindbladSample(selection,result,data),{index:1,time:1,pExcited:.2,meanPhoton:.8,purity:.7,coherence:.1,boundaryProbability:.01,trace:1});
  assert.equal(selectedLindbladSample({...selection,runId:"another"},result,data),null);
  assert.equal(selectedLindbladSample({...selection,index:2},result,data),null);
  assert.equal(selectedLindbladSample(selection,result,data.subarray(0,7)),null);
  const corrupted=data.slice();corrupted[10]=Number.NaN;
  assert.equal(selectedLindbladSample(selection,result,corrupted),null);
});
