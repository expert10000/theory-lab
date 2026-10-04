import test from "node:test";
import assert from "node:assert/strict";
import type {CavityJob,CavityResult,VerifiedSavedRun} from "../packages/contracts";
import {cavitySectorEvidence,jaynesCummingsLevels} from "../packages/models/cavity-sectors";

function saved(model:"jaynes_cummings"|"quantum_rabi",parameters:CavityJob["model"]["parameters"],initialState:CavityJob["initialState"],rows:number[][]):VerifiedSavedRun{
  const bytes=new Uint8Array(rows.length*48),view=new DataView(bytes.buffer);
  rows.flat().forEach((value,i)=>view.setFloat64(i*8,value,true));
  const job={schema:"quantum-job/v1",jobId:"sector-job",operation:"cavity",engine:"native",model:{type:model,parameters},initialState,
    solver:{type:"schrodinger",tStart:0,tStop:1,samples:rows.length}} as CavityJob;
  const result={schema:"quantum-result/v1",runId:"run-sector",jobId:job.jobId,status:"completed",operation:"cavity",
    model:job.model,initialState,solver:job.solver,engine:{name:"native",version:"test"},
    dressedSpectrum:model==="jaynes_cummings"?jaynesCummingsLevels(parameters).map(level=>level.energy):Array(parameters.cutoff*2).fill(0),
    data:{schema:"quantum-cavity-data/v1",format:"f64le",path:"sector-job.f64",sha256:"0".repeat(64),
      rows:rows.length,bytes:bytes.length,columns:["time","p_excited","mean_photon","boundary_probability","norm","parity"]},
    provenance:{durationMs:1,computedAt:"2026-10-04",pythonVersion:"3",workerVersion:"1"}} as CavityResult;
  return {job,result,data:bytes};
}
const p={qubitFrequency:1,cavityFrequency:1,coupling:.35,cutoff:6};

test("QVIS-019 checks conserved JC excitation and matches every finite-block energy",()=>{
  const run=saved("jaynes_cummings",p,{qubit:"excited",photons:0},[[0,1,0,0,1,-1],[1,.4,.6,0,1,-1]]);
  const evidence=cavitySectorEvidence(run);
  assert.equal(evidence.initialValue,1);
  assert.equal(evidence.maximumDrift,0);
  assert.equal(evidence.levels.length,12);
  assert.equal(evidence.levels.filter(level=>level.excitation===1).length,2);
  assert.ok(evidence.levels.some(level=>level.excitation===6&&level.cutoffEdge));
  if(run.result.operation!=="cavity")throw new Error("Expected cavity fixture");
  run.result.dressedSpectrum[0]+=0.01;
  assert.throws(()=>cavitySectorEvidence(run),/disagree/);
});

test("QVIS-019 withholds ambiguous levels and rejects nonconserved rows",()=>{
  const zero={...p,qubitFrequency:0,cavityFrequency:0,coupling:0};
  const run=saved("jaynes_cummings",zero,{qubit:"ground",photons:0},[[0,0,0,0,1,1],[1,0,0,0,1,1]]);
  const evidence=cavitySectorEvidence(run);
  assert.equal(evidence.unresolvedLevels,12);
  assert.ok(evidence.levels.every(level=>level.excitation===null));
  const bad=saved("jaynes_cummings",p,{qubit:"excited",photons:0},[[0,1,0,0,1,-1],[1,.5,.3,0,1,-1]]);
  assert.throws(()=>cavitySectorEvidence(bad),/do not support/);
});

test("QVIS-019 shows Rabi run parity but never assigns a dressed-level sector",()=>{
  const run=saved("quantum_rabi",p,{qubit:"ground",photons:1},[[0,0,1,0,1,-1],[1,.4,1.3,0,1,-1]]);
  const evidence=cavitySectorEvidence(run);
  assert.equal(evidence.quantity,"parity");
  assert.equal(evidence.initialValue,-1);
  assert.deepEqual(evidence.levels,[]);
  const wrong={...run,job:{...run.job,jobId:"different"}} as VerifiedSavedRun;
  assert.throws(()=>cavitySectorEvidence(wrong),/matching verified cavity/);
});
