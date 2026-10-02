import {test} from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import type {LindbladResult} from "../packages/contracts";
import {LindbladRunInspector} from "../apps/desktop/renderer/LindbladRunInspector";
import type {LindbladRunContext} from "../apps/desktop/renderer/lindblad-selection";

function inspect(steady:boolean){
  const result={runId:"stored-open",model:{type:"open_jaynes_cummings",parameters:{cutoff:6,relaxation:.1,cavityLoss:.1}},
    initialState:{qubit:"excited",photons:0},solver:{tStart:0,tStop:1,samples:2},
    engine:{name:"qutip",version:"5.3"},data:{rows:2,sha256:"a".repeat(64)},
    steadyState:steady?{pExcited:.1,meanPhoton:.2,purity:.6,coherence:.05,boundaryProbability:0,trace:1}:null,
    provenance:{computedAt:"2026-10-03T00:00:00Z",durationMs:1,pythonVersion:"3.12"}} as LindbladResult;
  const context:LindbladRunContext={result,selection:{kind:"time_sample",model:"open_jaynes_cummings",runId:result.runId,index:0},
    sample:{index:0,time:0,pExcited:1,meanPhoton:0,purity:1,coherence:0,boundaryProbability:0,trace:1},
    diagnostics:{maxBoundary:0,maxTraceDrift:0,minPurity:.7},stale:false};
  return renderToStaticMarkup(React.createElement(LindbladRunInspector,{context}));
}
test("Lindblad inspector shows only recorded observables and optional steady-state readout",()=>{
  assert.match(inspect(true),/data-testid="lindblad-inspector-steady"/);
  assert.match(inspect(true),/0\.10000 \/ 0\.20000/);
  assert.match(inspect(false),/Not reported/);
  assert.match(inspect(false),/not a density matrix, state vector, or amplitudes/);
  assert.doesNotMatch(inspect(false),/0\.10000 \/ 0\.20000/);
});
