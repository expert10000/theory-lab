import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {CavitySectorPanel} from "../apps/desktop/renderer/CavitySectorPanel";
import type {CavitySectorEvidence} from "../packages/models/cavity-sectors";

function show(evidence:CavitySectorEvidence|null,error=""){
  return renderToStaticMarkup(React.createElement(CavitySectorPanel,{runId:"run-a",evidence,loading:false,error,onRefresh:()=>{}}));
}
const base:CavitySectorEvidence={runId:"run-a",model:"jaynes_cummings",quantity:"excitation number",initialValue:1,
  maximumDrift:1e-10,levels:[],unresolvedLevels:0,source:"verified saved run"};
test("QVIS-019 panel distinguishes verified JC labels, Rabi run parity and unavailable levels",()=>{
  assert.match(show(base),/Excitation N = 1/);
  assert.match(show({...base,model:"quantum_rabi",quantity:"parity",initialValue:-1}),/Dressed-level parity is unavailable/);
  assert.doesNotMatch(show({...base,runId:"other"}),/Excitation N = 1/);
  assert.match(show(null,"integrity check failed"),/Sector label unavailable/);
});
