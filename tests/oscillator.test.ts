import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { assertJob, isQuantumJob, isQuantumResult } from "../packages/contracts";
import { oscillatorJob, OSCILLATOR_DEFAULTS, oscillatorAmplitude, consistentOscillatorResult } from "../packages/models/oscillator";
import type { OscillatorResult } from "../packages/contracts";
import currentJobSchema from "../packages/contracts/schemas/quantum-job.v1.json";
import currentResultSchema from "../packages/contracts/schemas/quantum-result.v1.json";
import legacySchemas from "../packages/atlas/fixtures/protocols-r5.v1.json";
import { createHash } from "node:crypto";

test("D1 appends oscillator variants without changing any legacy job/result definitions or branches", () => {
  for (const [name, schema] of [["job", currentJobSchema], ["result", currentResultSchema]] as const) {
    const baseline = legacySchemas[name], hash=(v:unknown)=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
    assert.deepEqual(schema.oneOf.slice(0,baseline.variants.length).map(hash), baseline.variants);
    for (const [key, fingerprint] of Object.entries(baseline.definitions)) assert.equal(hash((schema.definitions as any)[key]), fingerprint, key);
  }
});
test("bounded oscillator contract rejects unsupported scopes and cross-field violations in TS and Python", () => {
  const good = oscillatorJob("oscillator-test", OSCILLATOR_DEFAULTS, "native"); assertJob(good);
  const mutations = [{omega:0}, {omega:Infinity}, {cutoff:7}, {cutoff:65}, {levels:12,cutoff:8}, {state:7,cutoff:8}, {points:200}, {points:403}, {extent:13}, {state:-1}];
  for (const p of mutations) {
    const value={...good,model:{...good.model,parameters:{...good.model.parameters,...p}}};
    assert.throws(()=>assertJob(value));
  }
  assert.equal(isQuantumJob({...good,script:"execute"}),false);
  const check=spawnSync(process.execPath,["scripts/python.mjs","-c","import json,sys; from quantum_worker.contracts import validate; values=json.load(sys.stdin); validate('quantum-job',values[0]);\nfor v in values[1:]:\n try: validate('quantum-job',v)\n except Exception: continue\n raise AssertionError('invalid oscillator accepted')"],
    {input:JSON.stringify([good,...mutations.filter(p=>p.omega!==Infinity).map(p=>({...good,model:{...good.model,parameters:{...good.model.parameters,...p}}}))]),encoding:"utf8"});
  assert.equal(check.status,0,check.stderr);
});
export function syntheticOscillatorResult(): OscillatorResult {
  const job=oscillatorJob("oscillator-test",OSCILLATOR_DEFAULTS,"native"),p=job.model.parameters;
  const q=Array.from({length:p.points},(_,i)=>-p.extent+2*p.extent*i/(p.points-1)), amplitude=q.map(q=>oscillatorAmplitude(p.state,q)),density=amplitude.map(v=>v*v);
  const integral=density.reduce((sum,v,i)=>sum+v*(i===0||i===p.points-1?.5:1)*2*p.extent/(p.points-1),0);
  return {schema:"quantum-result/v1",jobId:job.jobId,runId:"run-oscillator",status:"completed",operation:"oscillator",engine:{name:"native",version:"test"},model:job.model,
    spectrum:{energies:Array.from({length:p.levels},(_,i)=>p.omega*(i+.5)),units:"normalized",hbar:1},state:{q,amplitude,density},
    analysis:{ladderError:0,cutoffDrift:0,qVariance:.5,pVariance:.5,boundaryOccupation:0,gridProbability:integral},
    provenance:{pythonVersion:"test",workerVersion:"test",computedAt:"2026-09-29T00:00:00Z",durationMs:1}};
}
test("stationary oscillator data is checked independently, not renormalized or confused with physical coordinates",()=>{
  const job=oscillatorJob("oscillator-test",OSCILLATOR_DEFAULTS,"native"),result=syntheticOscillatorResult();
  assert.ok(isQuantumResult(result));assert.ok(consistentOscillatorResult(job,result));
  for (const mutate of [(r:OscillatorResult)=>{r.spectrum.energies[0]=0;},(r:OscillatorResult)=>{r.state.q[1]+=1;},(r:OscillatorResult)=>{r.state.amplitude[100]*=-1;},(r:OscillatorResult)=>{r.analysis.gridProbability=.1;}]){
    const bad=structuredClone(result);mutate(bad);assert.equal(consistentOscillatorResult(job,bad),false);
  }
});
