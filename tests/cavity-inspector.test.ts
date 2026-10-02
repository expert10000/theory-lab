import {test} from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import type {CavityResult} from "../packages/contracts";
import {CavityRunInspector} from "../apps/desktop/renderer/CavityRunInspector";
import type {CavityRunContext} from "../apps/desktop/renderer/cavity-selection";

function inspect(model:"jaynes_cummings"|"quantum_rabi",initial:"ground"|"excited"){
  const result={runId:"stored-cavity",model:{type:model,parameters:{qubitFrequency:1,cavityFrequency:1,coupling:.35,cutoff:6}},
    initialState:{qubit:initial,photons:0},solver:{tStart:0,tStop:1,samples:2},
    engine:{name:"qutip",version:"5.3"},data:{rows:2,sha256:"a".repeat(64)},
    provenance:{computedAt:"2026-10-03T00:00:00Z",durationMs:1,pythonVersion:"3.12"}} as CavityResult;
  const context:CavityRunContext={result,selection:{kind:"time_sample",model,runId:result.runId,index:0},
    sample:{index:0,time:0,pExcited:1,meanPhoton:0,boundaryProbability:0,norm:1,parity:1},
    diagnostics:{maxBoundary:0,maxNormDrift:0,maxParityDrift:0,maxReferenceError:0,dressedSplitting:.7},stale:false};
  return renderToStaticMarkup(React.createElement(CavityRunInspector,{context,modelId:model}));
}
test("cavity inspector limits vacuum-Rabi reference to applicable stored Jaynes–Cummings run",()=>{
  assert.match(inspect("jaynes_cummings","excited"),/data-testid="cavity-inspector-jc-error"/);
  assert.doesNotMatch(inspect("jaynes_cummings","ground"),/data-testid="cavity-inspector-jc-error"/);
  assert.match(inspect("jaynes_cummings","ground"),/only to the stored/);
  assert.doesNotMatch(inspect("quantum_rabi","excited"),/data-testid="cavity-inspector-jc-reference"/);
  assert.match(inspect("quantum_rabi","excited"),/not cavity state amplitudes or a Bloch vector/);
});
