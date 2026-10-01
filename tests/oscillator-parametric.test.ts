import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertJob } from "../packages/contracts";
import { createHash } from "node:crypto";
import jobSchema from "../packages/contracts/schemas/quantum-job.v1.json";
import resultSchema from "../packages/contracts/schemas/quantum-result.v1.json";
import { checkParametricData, PARAMETRIC_DEFAULTS, parametricOscillatorJob, parametricReference } from "../packages/models/oscillator-parametric";
import { WorkerSupervisor } from "../apps/desktop/main/worker";
import { EvolutionCoordinator } from "../apps/desktop/main/evolution";

test("D1-017 validates bounded stable parametric jobs",()=>{
  const job=parametricOscillatorJob("valid-parametric",PARAMETRIC_DEFAULTS,"native");
  assertJob(job);
  for(const patch of [{omega:"0"},{lambdaRe:".9"},{lambdaIm:"1"},{cutoff:"41"},{stop:"30"},{samples:"302"}])
    assert.throws(()=>parametricOscillatorJob("invalid",{...PARAMETRIC_DEFAULTS,...patch},"native"));
  assert.throws(()=>assertJob({...job,model:{...job.model,parameters:{...job.model.parameters,lambdaRe:.9}}}));
});

test("D1-017 appends to D1-016 protocols without altering earlier branches or definitions",()=>{
  const digest=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
  assert.equal(digest({variants:jobSchema.oneOf.slice(0,-1),definitions:jobSchema.definitions}),
    "aef61504eff6a9a0e5435413e3381384eb95b0deef55701d4f11f3141326735c");
  assert.equal(digest({variants:resultSchema.oneOf.slice(0,-1),definitions:resultSchema.definitions}),
    "79c7c23955d24d4135187c174a688e3275cef44b83262f1063190a30468de983");
});

test("D1-017 supervised engines agree with stable squeezing reference and independent host propagation",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-parametric-")),worker=new WorkerSupervisor(process.cwd()),
    coordinator=new EvolutionCoordinator(worker,root,()=>{});
  try{
    await worker.start();
    assert.ok(worker.status.capabilities?.operations.includes("oscillator_parametric"));
    const datasets=[];
    for(const engine of ["native","qutip"] as const){
      const job=parametricOscillatorJob(`parametric-${engine}`,{...PARAMETRIC_DEFAULTS,cutoff:"24",lambdaRe:".3",lambdaIm:".2"},engine);
      const result=await coordinator.run(job),bytes=await coordinator.readData(job.jobId),data=checkParametricData(result,bytes);
      const stride=result.data.columns.length,at=(row:number,col:number)=>data[row*stride+col];
      const exact=parametricReference(job.model.parameters,job.solver.tStop-job.solver.tStart);
      assert.ok(Math.abs(at(job.solver.samples-1,5)-exact.number)<3e-7);
      assert.ok(Math.abs(at(job.solver.samples-1,3)-exact.qVariance)<3e-7);
      assert.ok(Math.abs(at(job.solver.samples-1,4)-exact.pVariance)<3e-7);
      assert.ok(result.analysis.maxBoundaryOccupation<1e-7);
      const corrupt=Buffer.from(bytes);corrupt.writeDoubleLE(corrupt.readDoubleLE(9*8)+.02,9*8);
      assert.throws(()=>checkParametricData(result,corrupt),/propagation|readout/);
      datasets.push({result,data});
    }
    const [a,b]=datasets;
    for(let row=0;row<a.result.data.rows;row++)for(const col of [3,4,5])
      assert.ok(Math.abs(a.data[row*a.result.data.columns.length+col]-b.data[row*b.result.data.columns.length+col])<3e-7);
  } finally{await worker.stop();}
});
