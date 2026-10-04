import test from "node:test";
import assert from "node:assert/strict";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import type {IsingStateArtifact} from "../packages/contracts/ising-state";
import {IsingStatePanel} from "../apps/desktop/renderer/IsingStatePanel";

const state:IsingStateArtifact={schema:"quantum-ising-state/v1",source:{runId:"run-ising",jobSha256:"a".repeat(64),resultSha256:"b".repeat(64)},
  engine:"native",sites:2,basis:"z-up-is-0-msb-first",groundEnergy:-1.5,gap:0.5,
  degeneracyThreshold:1e-8,status:"resolved",norm:1,residual:1e-12,
  siteMagnetization:[0.6,0.6],connectedZCorrelation:[[0.64,0.1],[0.1,0.64]],cutEntropy:[0.2],
  dominantBasis:[{bits:"00",probability:0.7},{bits:"11",probability:0.2}],omittedProbability:0.1};

test("QVIS-017 panel labels source, basis, correlations, cuts and top-probability truncation",()=>{
  const html=renderToStaticMarkup(createElement(IsingStatePanel,{state,selectedSite:1,onSelectSite:()=>{}}));
  assert.match(html,/run-ising/);
  assert.match(html,/0 = σᶻ up/);
  assert.match(html,/Connected Pauli-z correlation matrix/);
  assert.match(html,/Focus correlation row 2/);
  assert.match(html,/1 \| 1/);
  assert.match(html,/omitted probability/);
  assert.match(html,/no amplitudes or full state vector are displayed/);
});

test("QVIS-017 degenerate panel does not claim a unique state",()=>{
  const html=renderToStaticMarkup(createElement(IsingStatePanel,{state:{...state,status:"degenerate",gap:0,
    siteMagnetization:null,connectedZCorrelation:null,cutEntropy:null,dominantBasis:[],omittedProbability:null},
    selectedSite:null,onSelectSite:()=>{}}));
  assert.match(html,/unique ground-state correlation matrix/);
  assert.doesNotMatch(html,/Connected Pauli-z correlation matrix/);
});
