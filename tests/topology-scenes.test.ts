import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import fixture from "../packages/quantum-scene/fixtures/bloch-vector.json";
import {assertScene,verifyScenePayload} from "../packages/quantum-scene";
test("supplied vector topology is portable, explicit and cross-language validated",async()=>{
  const scene:unknown=structuredClone(fixture.scene);assertScene(scene);
  scene.topology={quantities:[{id:"texture",label:"Supplied pseudospin test vector",kind:"pseudospin",object:scene.objects[0].id,dataset:scene.objects[0].values!,convention:"Synthetic contract fixture, not a computed model"}],invariants:[{id:"invariant",label:"No computed invariant",value:null,status:"undefined",method:"No physics calculation in this fixture"}],limitations:["Geometry does not prove a topology invariant."]};
  const artifacts=Object.fromEntries(Object.entries(fixture.values).map(([p,v])=>{const bytes=Buffer.alloc(v.length*8);v.forEach((n,i)=>bytes.writeDoubleLE(n,i*8));return[p,bytes];}));
  await verifyScenePayload({scene,artifacts},async b=>createHash("sha256").update(b).digest("hex"));
  const python=spawnSync(process.execPath,["scripts/python.mjs","-c","import json,sys,struct; from quantum_worker.scene import verify_scene_artifacts; p=json.load(sys.stdin); verify_scene_artifacts(p['scene'],{k:struct.pack('<'+str(len(v))+'d',*v) for k,v in p['values'].items()})"],{input:JSON.stringify({scene,values:fixture.values}),encoding:"utf8"});assert.equal(python.status,0,python.stderr);
  const bad=structuredClone(scene);bad.topology!.quantities[0].dataset="absent";assert.throws(()=>assertScene(bad),/reference mismatch/);
  const wrong=structuredClone(scene);wrong.topology!.invariants[0].value=1;assert.throws(()=>assertScene(wrong),/status\/value/);
});
