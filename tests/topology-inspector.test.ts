import {test} from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import type {TopologyResult} from "../packages/contracts";
import type {TopologyRunContext} from "../apps/desktop/renderer/topology-selection";
import {TopologyRunInspector} from "../apps/desktop/renderer/TopologyRunInspector";

const provenance={pythonVersion:"3.12",workerVersion:"0.1",computedAt:"2026-10-03T00:00:00Z",durationMs:1};
const closed={schema:"quantum-result/v1",jobId:"job-closed",runId:"run-closed",status:"completed",operation:"topology",
  model:{type:"qwz",parameters:{mass:0,grid:11}},engine:{name:"native",version:"1.18"},
  analysis:{kind:"qwz",bulkGap:0,sampledGap:0,gapClosed:true,chern:null,latticeChern:null,analyticChern:null,
    meshResolved:false,chernIntegral:null,berryCurvature:[]},provenance} as TopologyResult;
test("topology inspector preserves undefined invariants and never invents an eigenvector or sample",()=>{
  const context:TopologyRunContext={result:closed,selection:null,sample:null,stale:false};
  const markup=renderToStaticMarkup(React.createElement(TopologyRunInspector,{context}));
  assert.match(markup,/undefined at gap closure/);
  assert.match(markup,/No isolated lower-band Berry curvature/);
  assert.match(markup,/do not store generic eigenvectors/);
  assert.doesNotMatch(markup,/data-testid="topology-selected-value"/);
  const unresolved={...closed,analysis:{...closed.analysis,gapClosed:false,bulkGap:.02,meshResolved:false,
    chern:null,latticeChern:0,analyticChern:-1,chernIntegral:-.7,berryCurvature:Array(121).fill(0)}} as TopologyResult;
  const coarse=renderToStaticMarkup(React.createElement(TopologyRunInspector,{context:{...context,result:unresolved}}));
  assert.match(coarse,/Momentum mesh unresolved: do not use this run as a phase label/);
  assert.match(coarse,/unresolved on this mesh/);
});
