import test from "node:test";
import assert from "node:assert/strict";
import type {QuantumResult} from "../packages/contracts";
import type {ScenePayload} from "../packages/quantum-scene";
import {availableSceneViews,sceneFocusForLaunch,type SceneLaunch} from "../apps/desktop/renderer/scene-bridge";

const result=(operation:string,model:string,analysis:Record<string,unknown>={})=>
  ({operation,model:{type:model},analysis}) as QuantumResult;

test("UI-8 exposes only declared saved-result scene views",()=>{
  for(const model of ["driven_two_level","landau_zener","stuckelberg","strong_drive"])
    assert.deepEqual(availableSceneViews(result("evolve",model)),{standard:true,bands:false});
  assert.deepEqual(availableSceneViews(result("many_body","ising_chain")),{standard:true,bands:false});
  assert.deepEqual(availableSceneViews(result("orbital","hydrogenic")),{standard:true,bands:false});
  assert.deepEqual(availableSceneViews(result("cavity","jaynes_cummings")),{standard:false,bands:false});
  assert.deepEqual(availableSceneViews(result("sweep","driven_two_level")),{standard:false,bands:false});
  assert.deepEqual(availableSceneViews(result("topology","ssh",{kind:"ssh",lowerBand:[1],upperBand:[2]})),{standard:true,bands:true});
  assert.deepEqual(availableSceneViews(result("topology","qwz",{kind:"qwz",gapClosed:true,lowerBand:[1],upperBand:[2],bandKValues:[0]})),{standard:false,bands:true});
  assert.deepEqual(availableSceneViews(result("topology","qwz",{kind:"qwz",gapClosed:false,lowerBand:[1],upperBand:[2]})),{standard:true,bands:false},
    "older QWZ results without supplied bands keep only their supported standard view");
});

test("UI-8 links only an exact run-scoped sample represented in the scene",()=>{
  const payload={scene:{provenance:{runId:"run-a",model:"driven_two_level"},
    objects:[{id:"bloch-trajectory",positions:"trajectory"}],
    datasets:[{id:"trajectory",count:4},{id:"time",count:4}]}} as ScenePayload;
  const launch:SceneLaunch={nonce:1,runId:"run-a",view:"standard",sample:{kind:"evolution_time",index:2}};
  assert.deepEqual(sceneFocusForLaunch(payload,launch).focus,{kind:"object",objectId:"bloch-trajectory",index:2});
  assert.equal(sceneFocusForLaunch(payload,{...launch,runId:"run-b"}).focus,null);
  assert.equal(sceneFocusForLaunch(payload,{...launch,sample:{kind:"evolution_time",index:4}}).focus,null);
  assert.equal(sceneFocusForLaunch(payload,{...launch,view:"bands"}).focus,null);
  assert.equal(sceneFocusForLaunch(payload,{...launch,sample:{kind:"unmapped",description:"Selected energy"}}).focus,null);
  const qwz={scene:{provenance:{runId:"run-a",model:"qwz"},objects:[{id:"berry-curvature",positions:"grid"}],
    datasets:[{id:"grid",count:9}]}} as ScenePayload;
  assert.deepEqual(sceneFocusForLaunch(qwz,{...launch,sample:{kind:"qwz_cell",x:1,y:2,grid:3}}).focus,
    {kind:"object",objectId:"berry-curvature",index:5},"QWZ cell is x-major / y-fastest");
  assert.equal(sceneFocusForLaunch(qwz,{...launch,sample:{kind:"qwz_cell",x:1,y:2,grid:4}}).focus,null);
  const ssh={scene:{provenance:{runId:"run-a",model:"ssh"},objects:[{id:"edge-density",positions:"sites"},
    {id:"band-0",positions:"band-path"}],datasets:[{id:"sites",count:6},{id:"band-path",count:9}]}} as ScenePayload;
  assert.deepEqual(sceneFocusForLaunch(ssh,{...launch,sample:{kind:"ssh_site",index:4}}).focus,
    {kind:"object",objectId:"edge-density",index:4});
  assert.deepEqual(sceneFocusForLaunch(ssh,{...launch,view:"bands",sample:{kind:"ssh_band",index:8}}).focus,
    {kind:"object",objectId:"band-0",index:8});
  assert.equal(sceneFocusForLaunch(ssh,{...launch,sample:{kind:"ssh_band",index:8}}).focus,null,
    "a band selection cannot be attached to the SSH standard scene");
  const ising={scene:{provenance:{runId:"run-a",model:"ising_chain"},objects:[{id:"ising-sites",positions:"sites"}],
    datasets:[{id:"sites",count:5}]}} as ScenePayload;
  assert.deepEqual(sceneFocusForLaunch(ising,{...launch,sample:{kind:"ising_site",index:2}}).focus,
    {kind:"object",objectId:"ising-sites",index:2});
  assert.match(sceneFocusForLaunch(ising,{...launch,sample:{kind:"unmapped",description:"Selected Ising energy level"}}).message,
    /Full saved-run scene.*no scene sample mapping/);
  const orbital={scene:{provenance:{runId:"run-a",model:"hydrogenic"},fields:[{kind:"complex-field",grid:{shape:[5,5,5]}}]}} as ScenePayload;
  assert.deepEqual(sceneFocusForLaunch(orbital,{...launch,sample:{kind:"orbital_voxel",x:2,y:3,z:4}}).focus,
    {kind:"voxel",grid:[2,3,4]});
  assert.equal(sceneFocusForLaunch(orbital,{...launch,sample:{kind:"orbital_voxel",x:5,y:3,z:4}}).focus,null);
});
