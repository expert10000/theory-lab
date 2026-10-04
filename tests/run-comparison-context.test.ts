import test from "node:test";
import assert from "node:assert/strict";
import type {VerifiedSavedRun} from "../packages/contracts";
import {compareVerifiedRuns} from "../packages/models/run-comparison";
import {comparisonContext} from "../packages/models/run-comparison-context";

function run(id:string,model:string,operation:string,parameters:Record<string,unknown>,extra:Record<string,unknown>,durationMs:number):VerifiedSavedRun{
  return {job:{schema:"quantum-job/v1",jobId:`job-${id}`,operation,engine:"native",model:{type:model,parameters}},
    result:{schema:"quantum-result/v1",runId:id,jobId:`job-${id}`,status:"completed",operation,model:{type:model,parameters},
      engine:{name:"native",version:"test"},provenance:{durationMs,computedAt:"2026-10-04",pythonVersion:"3",workerVersion:"1"},...extra},
    data:null} as VerifiedSavedRun;
}

test("QVIS-018 summarizes only recorded compatible spectrum values and changed inputs",()=>{
  const a=run("a","two_level","diagonalize",{delta:1,omega:.8},
    {spectrum:{eigenvalues:[-.5,.5],units:"normalized"},stateAnalysis:{status:"resolved",states:[{residualNorm:1e-9},{residualNorm:2e-9}]}},10);
  const b=run("b","two_level","diagonalize",{delta:2,omega:.8},
    {spectrum:{eigenvalues:[-1,1],units:"normalized"},stateAnalysis:{status:"resolved",states:[{residualNorm:3e-9},{residualNorm:4e-9}]}},12);
  const context=comparisonContext(a,b,compareVerifiedRuns(a,b));
  assert.equal(context.compatibleModel,true);
  assert.deepEqual(context.parameters.map(item=>[item.label,item.a,item.b,item.delta,item.unit]),[["delta",1,2,1,"normalized"]]);
  assert.deepEqual(context.gap&&[context.gap.a,context.gap.b,context.gap.delta],[1,2,1]);
  assert.equal(context.observables[0].maxAbsDelta,.5);
  assert.equal(context.diagnostics.length,2);
  assert.equal(context.runtime?.delta,2);
});

test("QVIS-018 refuses physical context for different models or unaligned samples",()=>{
  const a=run("a","two_level","diagonalize",{delta:1},{spectrum:{eigenvalues:[-1,1],units:"normalized"}},10);
  const b=run("b","other","diagonalize",{delta:2},{spectrum:{eigenvalues:[-2,2],units:"normalized"}},12);
  const mismatch=comparisonContext(a,b,compareVerifiedRuns(a,b));
  assert.equal(mismatch.compatibleModel,false);
  assert.equal(mismatch.gap,null);
  assert.deepEqual(mismatch.parameters,[]);
  assert.deepEqual(mismatch.observables,[]);
  assert.equal(mismatch.runtime,null);
  const left=run("left","ising_chain","many_body",{sites:2,boundary:"open",transverse:1},
    {spectrum:{lowEnergies:[-1,1],gap:2,units:"normalized"},groundState:{siteMagnetization:[1,-1]}},10);
  const right=run("right","ising_chain","many_body",{sites:3,boundary:"open",transverse:2},
    {spectrum:{lowEnergies:[-2,2],gap:4,units:"normalized"},groundState:{siteMagnetization:[1,0,-1]}},12);
  const unaligned=comparisonContext(left,right,compareVerifiedRuns(left,right));
  assert.equal(unaligned.compatibleModel,true);
  assert.equal(unaligned.gap,null);
  assert.deepEqual(unaligned.observables,[]);
  assert.ok(unaligned.parameters.some(item=>item.label==="sites"));
  assert.match(unaligned.withheld.join(" "),/aligned recorded observables/);
});

test("QVIS-018 withholds absent diagnostics while comparing aligned stored levels",()=>{
  const a=run("a","harmonic_oscillator","oscillator",{omega:1,cutoff:16},
    {spectrum:{energies:[.5,1.5],units:"normalized"},state:{q:[0],density:[1]},analysis:{ladderError:1e-9,cutoffDrift:2e-8}},10);
  const b=run("b","harmonic_oscillator","oscillator",{omega:1.1,cutoff:20},
    {spectrum:{energies:[.55,1.65],units:"normalized"},state:{q:[0],density:[1]},analysis:{ladderError:3e-9}},15);
  const context=comparisonContext(a,b,compareVerifiedRuns(a,b));
  assert.ok(Math.abs((context.gap?.delta??0)-.1)<1e-12);
  assert.equal(context.diagnostics.length,1);
  assert.match(context.withheld.join(" "),/Cutoff drift: not recorded/);
});
