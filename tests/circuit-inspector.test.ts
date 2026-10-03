import {test} from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import type {CircuitResult} from "../packages/contracts";
import {CircuitRunInspector} from "../apps/desktop/renderer/CircuitRunInspector";
import type {CircuitRunContext} from "../apps/desktop/renderer/circuit-selection";

test("Transmon inspector exposes stored scalar data without an eigenstate claim",()=>{
  const result={runId:"stored-circuit",model:{type:"transmon",parameters:{EJ:20,EC:.25,ng:.2,ncut:12,levels:3}},
    engine:{name:"native",version:"1.18"},spectrum:{energies:[-16,-11,-6.3],e01:5,e12:4.7,
      anharmonicity:-.3,chargeMatrixElement01:1.1,cutoffDriftE01:1e-8},
    provenance:{computedAt:"2026-10-03T00:00:00Z",durationMs:1,pythonVersion:"3.12"}} as CircuitResult;
  const context:CircuitRunContext={result,selection:null,level:null,stale:false};
  const idle=renderToStaticMarkup(React.createElement(CircuitRunInspector,{context}));
  assert.match(idle,/reopening a run does not invent a selection/);
  assert.match(idle,/not eigenvectors or charge-basis amplitudes/);
  assert.doesNotMatch(idle,/data-testid="circuit-inspector-energy"/);
  const selected=renderToStaticMarkup(React.createElement(CircuitRunInspector,{context:{...context,
    selection:{kind:"energy_level",runId:result.runId,index:1},level:{index:1,energyGHz:-11,relativeGHz:5}}}));
  assert.match(selected,/data-testid="circuit-inspector-energy"/);
  assert.match(selected,/5\.000000 GHz/);
});
