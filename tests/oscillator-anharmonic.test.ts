import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {assertJob,isQuantumResult} from "../packages/contracts";
import type {AnharmonicOscillatorResult} from "../packages/contracts";
import jobSchema from "../packages/contracts/schemas/quantum-job.v1.json";
import resultSchema from "../packages/contracts/schemas/quantum-result.v1.json";
import {ANHARMONIC_DEFAULTS,anharmonicJob,consistentAnharmonicResult} from "../packages/models/oscillator-anharmonic";
import {WorkerSupervisor} from "../apps/desktop/main/worker";

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
