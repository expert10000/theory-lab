import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import fixture from "../packages/contracts/fixtures/two-level.job.json";
import {isQuantumResult,type SpectrumJob,type SpectrumResult} from "../packages/contracts";
import {consistentTwoLevelSpectrum} from "../packages/models/two-level-spectrum";
import {RunStore} from "../apps/desktop/main/runs";

const job=fixture as SpectrumJob;
const norm=Math.hypot(job.model.parameters.delta,job.model.parameters.omega);
const [delta,omega]=[job.model.parameters.delta,job.model.parameters.omega];
const lower=(()=>{const a=Math.sqrt((1-delta/norm)/2);return [a,-Math.sqrt((1+delta/norm)/2)] as [number,number];})();
const upper=(()=>{const a=Math.sqrt((1+delta/norm)/2);return [a,Math.sqrt((1-delta/norm)/2)] as [number,number];})();
const state=(amplitudes:[number,number])=>{
  const [a,b]=amplitudes;
  return {amplitudes,populations:[a*a,b*b] as [number,number],bloch:{x:2*a*b,y:0,z:a*a-b*b},residualNorm:0};
};
const result:SpectrumResult={schema:"quantum-result/v1",jobId:job.jobId,runId:"analysis-test",status:"completed",
  operation:"diagonalize",model:job.model,engine:{name:"qutip",version:"5"},
  spectrum:{eigenvalues:[-norm/2,norm/2],units:"normalized",hbar:1},
  provenance:{pythonVersion:"3.12",workerVersion:"test",computedAt:"2026-10-01T00:00:00Z",durationMs:1},
  stateAnalysis:{status:"resolved",gap:norm,threshold:1e-10,states:[state(lower),state(upper)]}};

test("optional state diagnostics preserve old spectra and reject forged observables",()=>{
  const {stateAnalysis:_analysis,...old}=result;
  assert.ok(isQuantumResult(old));
  assert.ok(consistentTwoLevelSpectrum(job,old));
  const approximateLegacy={...old,spectrum:{...old.spectrum,eigenvalues:[-0.64,0.64] as [number,number]}};
  assert.ok(consistentTwoLevelSpectrum(job,approximateLegacy),"historical result remains reopenable");
  assert.equal(consistentTwoLevelSpectrum(job,approximateLegacy,true),false,"new worker responses still need analytic energies");
  assert.ok(isQuantumResult(result));
  assert.ok(consistentTwoLevelSpectrum(job,result));
  const analysis=result.stateAnalysis;
  assert.ok(analysis?.status==="resolved");
  const wrong={...result,stateAnalysis:{...analysis,states:[{...analysis.states[0],bloch:{...analysis.states[0].bloch,z:0.5}},analysis.states[1]]}};
  assert.ok(isQuantumResult(wrong));
  assert.equal(consistentTwoLevelSpectrum(job,wrong),false);
  assert.equal(isQuantumResult({...result,stateAnalysis:{...analysis,extra:true}}),false);
  assert.equal(isQuantumResult({...result,stateAnalysis:{status:"degenerate",gap:norm,threshold:1e-10,states:analysis.states}}),false);
});

test("saved spectra reopen with verified diagnostics; legacy energy-only runs remain readable",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-two-level-"));
  try{
    const store=new RunStore(join(root,"runs"),join(root,"artifacts"));
    await store.record(job,result);
    const loaded=await store.spectrum(result.runId);
    assert.deepEqual(loaded.stateAnalysis,result.stateAnalysis);
    const {stateAnalysis:_analysis,...legacy}=result;
    const old={...legacy,runId:"old-spectrum"};
    await store.record(job,old);
    assert.equal((await store.spectrum(old.runId)).stateAnalysis,undefined);
    const forged={...result,runId:"bad-spectrum",stateAnalysis:{...result.stateAnalysis,status:"degenerate"}};
    await assert.rejects(store.record(job,forged as SpectrumResult),/inconsistent two-level spectrum|mismatched quantum run/);
  }finally{await rm(root,{recursive:true,force:true});}
});
