import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdtemp,readFile,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {assertJob,isQuantumResult,isWorkspaceSnapshot} from "../packages/contracts";
import type {AnharmonicOscillatorResult} from "../packages/contracts";
import jobSchema from "../packages/contracts/schemas/quantum-job.v1.json";
import resultSchema from "../packages/contracts/schemas/quantum-result.v1.json";
import {ANHARMONIC_DEFAULTS,anharmonicJob,consistentAnharmonicResult} from "../packages/models/oscillator-anharmonic";
import {WorkerSupervisor} from "../apps/desktop/main/worker";
import {RunStore} from "../apps/desktop/main/runs";

test("D1-020 adds bounded append-only quartic contracts",()=>{
  const job=anharmonicJob("quartic",ANHARMONIC_DEFAULTS,"native");assertJob(job);
  for(const patch of [{omega:".4"},{lambda:"-.01"},{lambda:".21"},{cutoff:"33"},{levels:"7"}])
    assert.throws(()=>anharmonicJob("bad",{...ANHARMONIC_DEFAULTS,...patch},"native"));
  const digest=(v:unknown)=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
  assert.equal(digest({variants:jobSchema.oneOf.slice(0,-1),definitions:jobSchema.definitions}),
    "ca066575dde7eecbd516af42923df76b7fce1f86148be36524368bb92aa475d8");
  assert.equal(digest({variants:resultSchema.oneOf.slice(0,-1),definitions:resultSchema.definitions}),
    "468087cb74fe14bc3ab15f9f5095bab7761304c8a9596b8548050fb848b98059");
});

test("D1-022 verified quartic runs reopen and export without a worker",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-quartic-")),worker=new WorkerSupervisor(process.cwd()),
    store=new RunStore(join(root,"runs"),join(root,"artifacts"));
  try{
    await worker.start();
    const job=anharmonicJob("quartic-save",ANHARMONIC_DEFAULTS,"native"),candidate=await worker.request("quantum.run",job);
    assert.ok(isQuantumResult(candidate)&&candidate.operation==="oscillator_anharmonic");
    const result=candidate;
    await store.record(job,result);
    const reopened=new RunStore(join(root,"runs"),join(root,"missing-worker"));
    assert.equal((await reopened.list()).filter(entry=>entry.operation==="oscillator_anharmonic").length,1);
    for(const format of ["csv","svg","manifest"] as const)
      await reopened.export(result.runId,format,join(root,`quartic.${format}`));
    assert.match(await readFile(join(root,"quartic.csv"),"utf8"),/^level,energy,harmonic_energy,shift,units/);
    assert.match(await readFile(join(root,"quartic.svg"),"utf8"),/anharmonic_oscillator/);
    assert.deepEqual(JSON.parse(await readFile(join(root,"quartic.manifest"),"utf8")).job,job);
    const dir=join(root,"runs",result.runId),forged={...result,spectrum:{...result.spectrum,energies:[result.spectrum.energies[0]+.01,...result.spectrum.energies.slice(1)]}};
    const text=JSON.stringify(forged,null,2)+"\n",manifest=JSON.parse(await readFile(join(dir,"manifest.json"),"utf8"));
    manifest.hashes.result=createHash("sha256").update(text).digest("hex");
    await writeFile(join(dir,"result.json"),text);await writeFile(join(dir,"manifest.json"),JSON.stringify(manifest));
    await assert.rejects(reopened.export(result.runId,"csv",join(root,"forged.csv")),/consistency/);
  }finally{await worker.stop();}
});

test("D1-022 quartic workspace draft is optional and strict",()=>{
  const legacy={schema:"quantum-workspace/v1",savedAt:"2026-10-01T00:00:00Z",tab:"oscillator",selectedPresetId:null,
    spectrum:{parameters:{delta:"1",omega:".8"},engine:"qutip"},
    dynamics:{modelId:"driven_two_level",parameters:{delta:"1"},start:"0",stop:"10",samples:"31",basis:0,engine:"qutip"},
    cavity:{modelId:"jaynes_cummings",parameters:{},qubit:"ground",photons:"0",start:"0",stop:"10",samples:"31",engine:"qutip"},
    open:{parameters:{},qubit:"ground",photons:"0",start:"0",stop:"10",samples:"31",engine:"qutip"},
    sweep:{modelId:"driven_two_level",parameters:{},x:{parameter:"delta",start:0,stop:1,points:3},y:{parameter:"frequency",start:0,stop:1,points:3},twoD:false,start:"0",stop:"10",initialIndex:0,engine:"native"}};
  assert.ok(isWorkspaceSnapshot(legacy));
  assert.ok(isWorkspaceSnapshot({...legacy,oscillatorMode:"anharmonic",oscillatorAnharmonic:ANHARMONIC_DEFAULTS}));
  assert.equal(isWorkspaceSnapshot({...legacy,oscillatorAnharmonic:{...ANHARMONIC_DEFAULTS,script:"unsafe"}}),false);
});

test("D1-020 supervised engines return host-verified eigenpairs",async()=>{
  const worker=new WorkerSupervisor(process.cwd());
  try{
    await worker.start();assert.ok(worker.status.capabilities?.operations.includes("oscillator_anharmonic"));
    const outputs=[];
    for(const engine of ["native","qutip"] as const){
      const job=anharmonicJob(`quartic-${engine}`,ANHARMONIC_DEFAULTS,engine);
      const result=await worker.request("quantum.run",job);
      assert.ok(isQuantumResult(result)&&result.operation==="oscillator_anharmonic");
      assert.ok(consistentAnharmonicResult(job,result));
      const forged:AnharmonicOscillatorResult={...result,spectrum:{...result.spectrum,energies:[result.spectrum.energies[0]+.01,...result.spectrum.energies.slice(1)]}};
      assert.equal(consistentAnharmonicResult(job,forged),false);
      outputs.push(result);
    }
    for(let i=0;i<outputs[0].spectrum.energies.length;i++)
      assert.ok(Math.abs(outputs[0].spectrum.energies[i]-outputs[1].spectrum.energies[i])<1e-9);
  }finally{await worker.stop();}
});
