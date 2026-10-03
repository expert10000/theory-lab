import {test} from "node:test";
import assert from "node:assert/strict";
import type {ManyBodyResult} from "../packages/contracts";
import {selectedManyBodyItem} from "../apps/desktop/renderer/many-body-selection";

test("Ising selections resolve only stored levels or sites of the exact run",()=>{
  const result={runId:"stored-ising",model:{type:"ising_chain",parameters:{sites:2}},
    spectrum:{lowEnergies:[-1.2,-.1,.1,1.2]},groundState:{siteMagnetization:[.7,-.4]}} as ManyBodyResult;
  const level={kind:"energy_level",runId:result.runId,index:1} as const;
  const site={kind:"site_magnetization",runId:result.runId,index:1} as const;
  const selectedLevel=selectedManyBodyItem(level,result);
  assert.equal(selectedLevel?.kind,"energy_level");
  if(selectedLevel?.kind==="energy_level"){
    assert.equal(selectedLevel.energy,-.1);
    assert.ok(Math.abs(selectedLevel.relativeEnergy-1.1)<1e-12);
  }
  assert.deepEqual(selectedManyBodyItem(site,result),{kind:"site_magnetization",index:1,magnetization:-.4});
  assert.equal(selectedManyBodyItem({...level,runId:"other"},result),null);
  assert.equal(selectedManyBodyItem({...level,index:4},result),null);
  assert.equal(selectedManyBodyItem({...site,index:2},result),null);
  assert.equal(selectedManyBodyItem(site,{...result,groundState:{...result.groundState,siteMagnetization:[.7,Number.NaN]}}),null);
});
