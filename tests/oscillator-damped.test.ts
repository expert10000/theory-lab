import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertJob, isWorkspaceSnapshot } from "../packages/contracts";
import jobSchema from "../packages/contracts/schemas/quantum-job.v1.json";
import resultSchema from "../packages/contracts/schemas/quantum-result.v1.json";
import { dampedOscillatorJob, DAMPED_OSCILLATOR_DEFAULTS, checkDampedOscillatorData } from "../packages/models/oscillator-damped";
import { WorkerSupervisor } from "../apps/desktop/main/worker";
import { EvolutionCoordinator } from "../apps/desktop/main/evolution";
import { RunStore } from "../apps/desktop/main/runs";

test("D1-014 bounds declarative thermal oscillator jobs",()=>{
  const valid=dampedOscillatorJob("bounded",DAMPED_OSCILLATOR_DEFAULTS,"native");
  assertJob(valid);
  for(const change of [{cutoff:"17"},{loss:"2.1"},{thermalOccupation:"2.1"},{samples:"202"},
    {stop:"25"},{initial:"fock" as const,index:"7"},{initial:"coherent" as const,alphaRe:"2",alphaIm:"2"}])
    assert.throws(()=>dampedOscillatorJob("invalid",{...DAMPED_OSCILLATOR_DEFAULTS,...change},"native"));
  assert.throws(()=>assertJob({...valid,model:{...valid.model,parameters:{...valid.model.parameters,loss:3}}}));
});

test("D1-014 appends contracts without changing any D1-013 branch or definition",()=>{
  const digest=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
  assert.equal(digest({variants:jobSchema.oneOf.slice(0,-3),definitions:jobSchema.definitions}),
    "3561ffbd1363e182eaea0c641872609f1a5d9d7eb03b59152f30c46d5c1ff3ff");
  assert.equal(digest({variants:resultSchema.oneOf.slice(0,-3),definitions:resultSchema.definitions}),
    "9a204bef6aac1914bd678aca2d31be95278729ffb6153ee3343ac669154ddfe4");
});

test("D1-014–016 independently verify and persist thermal density matrices",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-damped-")),artifacts=join(root,"artifacts"),
    worker=new WorkerSupervisor(process.cwd()),coordinator=new EvolutionCoordinator(worker,artifacts,()=>{}),
    store=new RunStore(join(root,"runs"),artifacts);
  try {
    await worker.start();
    assert.ok(worker.status.capabilities?.operations.includes("oscillator_damped"));
    const outputs=[];
    for(const engine of ["native","qutip"] as const){
      const job=dampedOscillatorJob(`damped-${engine}`,
        {...DAMPED_OSCILLATOR_DEFAULTS,initial:"coherent",alphaRe:".7",alphaIm:".2"},engine),
        result=await coordinator.run(job),bytes=await coordinator.readData(job.jobId),
        data=checkDampedOscillatorData(result,bytes);
      outputs.push({job,result,data});
      assert.ok(result.analysis.maxTraceError<1e-7);
      assert.ok(result.analysis.maxNumberReferenceError<1e-6);
      await store.record(job,result);
      const corrupt=Buffer.from(bytes);
      corrupt.writeDoubleLE(corrupt.readDoubleLE(8)+.1,8);
      assert.throws(()=>checkDampedOscillatorData(result,corrupt),/density matrix|readout/i);
    }
    const [a,b]=outputs;
    const sa=a.result.data.columns.length,sb=b.result.data.columns.length;
    for(let row=0;row<a.result.data.rows;row++){
      assert.ok(Math.abs(a.data[row*sa+1]-b.data[row*sb+1])<1e-6);
      assert.ok(Math.abs(a.data[row*sa+2]-b.data[row*sb+2])<1e-6);
    }
    const reopened=new RunStore(join(root,"runs"),join(root,"no-live-worker"));
    assert.equal((await reopened.list()).filter(x=>x.operation==="oscillator_damped").length,2);
    for(const format of ["csv","svg","manifest"] as const)await reopened.export(a.result.runId,format,join(root,`damped.${format}`));
    assert.match(await readFile(join(root,"damped.csv"),"utf8"),/^time,mean_number,purity,trace/);
    assert.match(await readFile(join(root,"damped.svg"),"utf8"),/mean_number/);
    const exported=JSON.parse(await readFile(join(root,"damped.manifest"),"utf8"));
    assert.deepEqual(exported.job,a.job);
    assert.deepEqual(exported.result.analysis,a.result.analysis);
    const dir=join(root,"runs",a.result.runId),forged=await readFile(join(dir,"data.f64"));
    // A local phase alteration preserves trace, populations and purity. A
    // rehashed bundle must still fail the independent evolution check.
    const offset=(sa+6+2*(0*a.job.model.parameters.cutoff+1))*8;
    const mirror=(sa+6+2*(1*a.job.model.parameters.cutoff+0))*8;
    forged.writeDoubleLE(-forged.readDoubleLE(offset),offset);
    forged.writeDoubleLE(-forged.readDoubleLE(mirror),mirror);
    const sha=(v:Uint8Array|string)=>createHash("sha256").update(v).digest("hex");
    const forgedResult={...a.result,data:{...a.result.data,sha256:sha(forged)}};
    const resultText=JSON.stringify(forgedResult,null,2)+"\n";
    const manifest=JSON.parse(await readFile(join(dir,"manifest.json"),"utf8"));
    manifest.artifactSha256=forgedResult.data.sha256;manifest.hashes.result=sha(resultText);
    await writeFile(join(dir,"data.f64"),forged);
    await writeFile(join(dir,"result.json"),resultText);
    await writeFile(join(dir,"manifest.json"),JSON.stringify(manifest));
    await assert.rejects(reopened.export(a.result.runId,"csv",join(root,"forged.csv")),/propagation/);
    assert.ok(!(await readdir(root)).includes("forged.csv"));
  } finally {await worker.stop();}
});

test("D1-016 optional workspace inputs remain read-only and backward compatible",()=>{
  const legacy={schema:"quantum-workspace/v1",savedAt:"2026-10-01T00:00:00Z",tab:"oscillator",selectedPresetId:null,
    spectrum:{parameters:{delta:"1",omega:".8"},engine:"qutip"},
    dynamics:{modelId:"driven_two_level",parameters:{delta:"1"},start:"0",stop:"10",samples:"31",basis:0,engine:"qutip"},
    cavity:{modelId:"jaynes_cummings",parameters:{},qubit:"ground",photons:"0",start:"0",stop:"10",samples:"31",engine:"qutip"},
    open:{parameters:{},qubit:"ground",photons:"0",start:"0",stop:"10",samples:"31",engine:"qutip"},
    sweep:{modelId:"driven_two_level",parameters:{},x:{parameter:"delta",start:0,stop:1,points:3},y:{parameter:"frequency",start:0,stop:1,points:3},twoD:false,start:"0",stop:"10",initialIndex:0,engine:"native"}};
  assert.ok(isWorkspaceSnapshot(legacy));
  assert.ok(isWorkspaceSnapshot({...legacy,oscillatorMode:"damped",oscillatorDamped:DAMPED_OSCILLATOR_DEFAULTS}));
  assert.equal(isWorkspaceSnapshot({...legacy,oscillatorDamped:{...DAMPED_OSCILLATOR_DEFAULTS,code:"unsafe"}}),false);
});
