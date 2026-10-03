import {test} from "node:test";
import assert from "node:assert/strict";
import type {SweepResult} from "../packages/contracts";
import {selectedSweepCell} from "../apps/desktop/renderer/sweep-selection";

function fixture(twoD:boolean):SweepResult{
  return {runId:`run-sweep-${twoD}`,model:{type:"driven_two_level"},
    sweep:{x:{parameter:"amplitude",start:0,stop:1,points:3},
      y:twoD?{parameter:"frequency",start:.8,stop:1.2,points:2}:null},
    data:{shape:{x:3,y:twoD?2:1}}} as SweepResult;
}
test("one sweep selection resolves exact-run 1D points and row-major 2D cells",()=>{
  const one=fixture(false),two=fixture(true);
  assert.deepEqual(selectedSweepCell({kind:"grid_cell",runId:one.runId,model:"driven_two_level",xIndex:1,yIndex:0},one,
    new Float64Array([.1,.4,.9])),{xIndex:1,yIndex:0,xParameter:"amplitude",xValue:.5,yParameter:null,yValue:null,finalP1:.4});
  const selection={kind:"grid_cell",runId:two.runId,model:"driven_two_level",xIndex:2,yIndex:1} as const;
  assert.deepEqual(selectedSweepCell(selection,two,new Float64Array([.1,.2,.3,.4,.5,.6])),
    {xIndex:2,yIndex:1,xParameter:"amplitude",xValue:1,yParameter:"frequency",yValue:1.2,finalP1:.6});
  assert.equal(selectedSweepCell({...selection,runId:one.runId},two,new Float64Array(6)),null);
  assert.equal(selectedSweepCell({...selection,yIndex:2},two,new Float64Array(6)),null);
  assert.equal(selectedSweepCell(selection,two,new Float64Array(3)),null);
  const corrupted=new Float64Array(6);corrupted[5]=Number.NaN;
  assert.equal(selectedSweepCell(selection,two,corrupted),null);
});
