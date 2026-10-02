import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { EvolutionResult } from "../packages/contracts";
import { sampleAt } from "../packages/quantum-3d/evolution";
import { EvolutionRunInspector } from "../apps/desktop/renderer/EvolutionRunInspector";
import type { EvolutionRunContext } from "../apps/desktop/renderer/evolution-selection";

const rows = new Float64Array([
  0,1,0,0,0,1,1,0,0,0,
  1,0,1,0,0,-1,0,0,1,0,
]);
function inspect(model: EvolutionResult["model"]): string {
  const result = {
    runId:"stored-evolution",model,initialState:{index:0},
    solver:{tStart:0,tStop:1,samples:2},data:{rows:2,sha256:"a".repeat(64)},
    engine:{name:"qutip",version:"5.3"},
    provenance:{computedAt:"2026-10-03T00:00:00Z",durationMs:1,pythonVersion:"3.12"},
  } as EvolutionResult;
  const context:EvolutionRunContext={result,sample:sampleAt(rows,0),finalSample:sampleAt(rows,1),stale:false,
    selection:{kind:"time_sample",model:model.type,runId:result.runId,index:0}};
  return renderToStaticMarkup(React.createElement(EvolutionRunInspector,{context,modelId:model.type}));
}

test("passage inspectors label references and withhold undefined crossings",()=>{
  const landau=inspect({type:"landau_zener",parameters:{sweepRate:0,gap:.8,bias:0}});
  assert.match(landau,/Unavailable · zero sweep rate/);
  assert.match(landau,/finite endpoints/);
  assert.doesNotMatch(landau,/Infinity|NaN/);
  const stuckelberg=inspect({type:"stuckelberg",parameters:{sweepRate:1,gap:.8,bias:100,turnTime:4}});
  assert.match(stuckelberg,/None in real time/);
  assert.match(stuckelberg,/does not store an independent interference phase/);
});

test("strong-drive inspector does not invent absent Floquet analysis",()=>{
  const html=inspect({type:"strong_drive",parameters:{delta:1,amplitude:1.6,frequency:1,phase:0}});
  assert.match(html,/contains no Floquet analysis/);
  assert.doesNotMatch(html,/data-testid="inspector-quasienergies"/);
});
