import {test} from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import type {ManyBodyResult} from "../packages/contracts";
import {ManyBodyRunInspector} from "../apps/desktop/renderer/ManyBodyRunInspector";
import type {ManyBodyRunContext} from "../apps/desktop/renderer/many-body-selection";

test("Ising inspector displays saved finite-chain summaries, never a full state vector",()=>{
  const result={runId:"stored-ising",model:{type:"ising_chain",parameters:{sites:2,interaction:1,transverse:.8,longitudinal:.15,boundary:"open"}},
    engine:{name:"native",version:"1.18"},spectrum:{lowEnergies:[-1.2,-.1,.1,1.2],gap:1.1},
    groundState:{siteMagnetization:[.7,-.4],halfChainEntropy:.2},
    provenance:{computedAt:"2026-10-03T00:00:00Z",durationMs:1,pythonVersion:"3.12"}} as ManyBodyResult;
  const context:ManyBodyRunContext={result,selection:null,item:null,stale:false};
  const idle=renderToStaticMarkup(React.createElement(ManyBodyRunInspector,{context}));
  assert.match(idle,/reopening a run does not invent a selection/);
  assert.match(idle,/not a full ground-state vector/);
  const selected=renderToStaticMarkup(React.createElement(ManyBodyRunInspector,{context:{...context,
    selection:{kind:"site_magnetization",runId:result.runId,index:1},item:{kind:"site_magnetization",index:1,magnetization:-.4}}}));
  assert.match(selected,/data-testid="many-body-inspector-site"/);
  assert.match(selected,/-0\.4000/);
});
