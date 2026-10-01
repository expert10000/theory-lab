import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertJob, isWorkspaceSnapshot } from "../packages/contracts";
import { createHash } from "node:crypto";
import jobSchema from "../packages/contracts/schemas/quantum-job.v1.json";
import resultSchema from "../packages/contracts/schemas/quantum-result.v1.json";
import { checkParametricData, PARAMETRIC_DEFAULTS, parametricOscillatorJob, parametricReference } from "../packages/models/oscillator-parametric";
import { WorkerSupervisor } from "../apps/desktop/main/worker";
import { EvolutionCoordinator } from "../apps/desktop/main/evolution";
import { RunStore } from "../apps/desktop/main/runs";

test("D1-017 validates bounded stable parametric jobs",()=>{
  const job=parametricOscillatorJob("valid-parametric",PARAMETRIC_DEFAULTS,"native");
  assertJob(job);
  for(const patch of [{omega:"0"},{lambdaRe:".9"},{lambdaIm:"1"},{cutoff:"41"},{stop:"30"},{samples:"302"}])
    assert.throws(()=>parametricOscillatorJob("invalid",{...PARAMETRIC_DEFAULTS,...patch},"native"));
  assert.throws(()=>assertJob({...job,model:{...job.model,parameters:{...job.model.parameters,lambdaRe:.9}}}));
});

test("D1-017 appends to D1-016 protocols without altering earlier branches or definitions",()=>{
  const digest=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
  assert.equal(digest({variants:jobSchema.oneOf.slice(0,-2),definitions:jobSchema.definitions}),
    "aef61504eff6a9a0e5435413e3381384eb95b0deef55701d4f11f3141326735c");
  assert.equal(digest({variants:resultSchema.oneOf.slice(0,-2),definitions:resultSchema.definitions}),
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

test("D1-019 saves, reloads and exports verified parametric runs",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-parametric-run-")),artifacts=join(root,"artifacts"),
    worker=new WorkerSupervisor(process.cwd()),coordinator=new EvolutionCoordinator(worker,artifacts,()=>{}),
    store=new RunStore(join(root,"runs"),artifacts);
  try{
    await worker.start();
    const job=parametricOscillatorJob("parametric-save",PARAMETRIC_DEFAULTS,"native"),result=await coordinator.run(job);
    assert.equal((await store.record(job,result)).operation,"oscillator_parametric");
    const reopened=new RunStore(join(root,"runs"),join(root,"no-live-worker"));
    assert.equal((await reopened.list()).filter(row=>row.operation==="oscillator_parametric").length,1);
    for(const format of ["csv","svg","manifest"] as const)
      await reopened.export(result.runId,format,join(root,`parametric.${format}`));
    assert.match(await readFile(join(root,"parametric.csv"),"utf8"),/^time,q_mean,p_mean,q_variance,p_variance,mean_number/);
    assert.match(await readFile(join(root,"parametric.svg"),"utf8"),/q_variance/);
    assert.deepEqual(JSON.parse(await readFile(join(root,"parametric.manifest"),"utf8")).job,job);
    const dir=join(root,"runs",result.runId),data=await readFile(join(dir,"data.f64"));
    data.writeDoubleLE(data.readDoubleLE(result.data.columns.length*8+9*8)+.04,result.data.columns.length*8+9*8);
    const hash=(bytes:Uint8Array|string)=>createHash("sha256").update(bytes).digest("hex");
    const forged={...result,data:{...result.data,sha256:hash(data)}},resultText=JSON.stringify(forged,null,2)+"\n";
    const manifest=JSON.parse(await readFile(join(dir,"manifest.json"),"utf8"));
    manifest.artifactSha256=forged.data.sha256;manifest.hashes.result=hash(resultText);
    await writeFile(join(dir,"data.f64"),data);await writeFile(join(dir,"result.json"),resultText);
    await writeFile(join(dir,"manifest.json"),JSON.stringify(manifest));
    await assert.rejects(reopened.export(result.runId,"csv",join(root,"forged.csv")),/propagation|readout/);
  }finally{await worker.stop();}
});

test("D1-019 workspace extension preserves old snapshots and rejects extra fields",()=>{
  const legacy={schema:"quantum-workspace/v1",savedAt:"2026-10-01T00:00:00Z",tab:"oscillator",selectedPresetId:null,
    spectrum:{parameters:{delta:"1",omega:".8"},engine:"qutip"},
    dynamics:{modelId:"driven_two_level",parameters:{delta:"1"},start:"0",stop:"10",samples:"31",basis:0,engine:"qutip"},
    cavity:{modelId:"jaynes_cummings",parameters:{},qubit:"ground",photons:"0",start:"0",stop:"10",samples:"31",engine:"qutip"},
    open:{parameters:{},qubit:"ground",photons:"0",start:"0",stop:"10",samples:"31",engine:"qutip"},
    sweep:{modelId:"driven_two_level",parameters:{},x:{parameter:"delta",start:0,stop:1,points:3},y:{parameter:"frequency",start:0,stop:1,points:3},twoD:false,start:"0",stop:"10",initialIndex:0,engine:"native"}};
  assert.ok(isWorkspaceSnapshot(legacy));
  assert.ok(isWorkspaceSnapshot({...legacy,oscillatorMode:"parametric",oscillatorParametric:PARAMETRIC_DEFAULTS}));
  assert.equal(isWorkspaceSnapshot({...legacy,oscillatorParametric:{...PARAMETRIC_DEFAULTS,code:"unsafe"}}),false);
});
