import test from "node:test";
import assert from "node:assert/strict";
import type {SpectrumResult} from "../packages/contracts";
import {validatedSelection} from "../apps/desktop/renderer/scientific-selection";

const result={runId:"run-verified-a"} as SpectrumResult;

test("energy selection is scoped to an exact verified run",()=>{
  const selected={kind:"energy",model:"two_level",runId:result.runId,level:1};
  assert.deepEqual(validatedSelection(selected,"two_level",result),selected);
  assert.equal(validatedSelection(selected,"two_level",null),null);
  assert.equal(validatedSelection(selected,"two_level",{runId:"run-new"} as SpectrumResult),null);
  assert.equal(validatedSelection({...selected,level:2},"two_level",result),null);
  assert.equal(validatedSelection(selected,"oscillator",result),null);
});

test("draft parameter and exact operator references reject unsupported IDs",()=>{
  assert.deepEqual(validatedSelection({kind:"parameter",model:"two_level",key:"omega"},"two_level",null),
    {kind:"parameter",model:"two_level",key:"omega"});
  assert.deepEqual(validatedSelection({kind:"operator",model:"two_level",key:"sigma_x"},"two_level",null),
    {kind:"operator",model:"two_level",key:"sigma_x"});
  for(const invalid of [
    {kind:"operator",model:"two_level",key:"sigma_y"},
    {kind:"parameter",model:"two_level",key:"amplitude"},
    {kind:"energy",model:"two_level",runId:"missing",level:0},
    {kind:"energy",model:"two_level",runId:result.runId,level:-1},
  ])assert.equal(validatedSelection(invalid,"two_level",result),null);
});
