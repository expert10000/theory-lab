import {test} from "node:test";
import assert from "node:assert/strict";
import type {CircuitResult} from "../packages/contracts";
import {selectedCircuitLevel} from "../apps/desktop/renderer/circuit-selection";

test("Transmon level selection is scoped to a saved run and actual stored energy",()=>{
  const result={runId:"stored-circuit",model:{type:"transmon",parameters:{levels:3}},
    spectrum:{energies:[-16,-11,-6.3]}} as CircuitResult;
  const selection={kind:"energy_level",runId:result.runId,index:1} as const;
  assert.deepEqual(selectedCircuitLevel(selection,result),{index:1,energyGHz:-11,relativeGHz:5});
  assert.equal(selectedCircuitLevel({...selection,runId:"other"},result),null);
  assert.equal(selectedCircuitLevel({...selection,index:3},result),null);
  assert.equal(selectedCircuitLevel(selection,{...result,spectrum:{...result.spectrum,energies:[-16,Number.NaN,-6.3]}}),null);
});
