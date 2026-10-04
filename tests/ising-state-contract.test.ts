import test from "node:test";
import assert from "node:assert/strict";
import {isIsingStateArtifact} from "../packages/contracts/ising-state";

test("QVIS-017 sidecar contract is bounded and independent of frozen result v1",()=>{
  const state={schema:"quantum-ising-state/v1",source:{runId:"run-a",jobSha256:"a".repeat(64),resultSha256:"b".repeat(64)},
    engine:"native",sites:2,basis:"z-up-is-0-msb-first",groundEnergy:-1.5,gap:0.5,
    degeneracyThreshold:1e-8,status:"resolved",norm:1,residual:1e-12,
    siteMagnetization:[0.6,0.6],connectedZCorrelation:[[0.64,0.1],[0.1,0.64]],cutEntropy:[0.2],
    dominantBasis:[{bits:"00",probability:0.7},{bits:"11",probability:0.2}],omittedProbability:0.1} as const;
  assert.ok(isIsingStateArtifact(state));
  assert.equal(isIsingStateArtifact({...state,source:{...state.source,resultSha256:"bad"}}),false);
  assert.equal(isIsingStateArtifact({...state,connectedZCorrelation:[[0.64,0.1]]}),false);
  assert.equal(isIsingStateArtifact({...state,dominantBasis:[{bits:"00",probability:1.1}]}),false);
  assert.equal(isIsingStateArtifact({...state,omittedProbability:0.3}),false);
  assert.ok(isIsingStateArtifact({...state,status:"degenerate",gap:0,siteMagnetization:null,
    connectedZCorrelation:null,cutEntropy:null,dominantBasis:[],omittedProbability:null}));
});
