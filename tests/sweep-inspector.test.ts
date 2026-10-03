import {test} from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import type {SweepResult} from "../packages/contracts";
import {SweepRunInspector} from "../apps/desktop/renderer/SweepRunInspector";
import type {SweepRunContext} from "../apps/desktop/renderer/sweep-selection";

test("sweep inspector distinguishes final-P1 cells from unrecorded trajectories",()=>{
  const result={runId:"stored-sweep",model:{type:"driven_two_level",parameters:{delta:1,amplitude:.8,frequency:1,phase:0}},
    sweep:{x:{parameter:"amplitude",start:0,stop:1,points:3},y:null,tStart:0,tStop:20,initialIndex:0},
    data:{shape:{x:3,y:1},sha256:"b".repeat(64)},cache:{key:"a".repeat(64),reusedPoints:1,computedPoints:2},
    engine:{name:"native",version:"1.18"},provenance:{computedAt:"2026-10-03T00:00:00Z",durationMs:1,pythonVersion:"3.12"}} as SweepResult;
  const context:SweepRunContext={result,selection:null,cell:null,range:{minimum:.1,maximum:.9},stale:false};
  const idle=renderToStaticMarkup(React.createElement(SweepRunInspector,{context,modelId:"driven_two_level"}));
  assert.match(idle,/reopening a run does not invent a selection/);
  assert.match(idle,/not a time trajectory or state vector/);
  assert.doesNotMatch(idle,/data-testid="sweep-inspector-value"/);
  const selected=renderToStaticMarkup(React.createElement(SweepRunInspector,{context:{...context,
    selection:{kind:"grid_cell",model:"driven_two_level",runId:result.runId,xIndex:1,yIndex:0},
    cell:{xIndex:1,yIndex:0,xParameter:"amplitude",xValue:.5,yParameter:null,yValue:null,finalP1:.4}},modelId:"driven_two_level"}));
  assert.match(selected,/data-testid="sweep-inspector-value"/);
  assert.match(selected,/0\.400000/);
  const wrong=renderToStaticMarkup(React.createElement(SweepRunInspector,{context,modelId:"landau_zener"}));
  assert.doesNotMatch(wrong,/data-testid="sweep-inspector-inputs"/);
});
