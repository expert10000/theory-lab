import test from "node:test";
import assert from "node:assert/strict";
import type {QuantumResult} from "../packages/contracts";
import {availableSceneViews} from "../apps/desktop/renderer/scene-bridge";

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
