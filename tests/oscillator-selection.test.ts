import test from "node:test";
import assert from "node:assert/strict";
import type {OscillatorFamilyResult} from "../packages/contracts";
import {decodeOscillatorData,selectedOscillatorItem} from "../apps/desktop/renderer/oscillator-selection";

const stationary={operation:"oscillator",runId:"run-static",model:{parameters:{state:0}},
  spectrum:{energies:[.5,1.5]},state:{q:[-1,0,1],amplitude:[.2,.5,.2],density:[.04,.25,.04]}} as OscillatorFamilyResult;
const quartic={operation:"oscillator_anharmonic",runId:"run-quartic",spectrum:{energies:[.53,1.58]},
  states:{coefficients:[[1,0],[0,1]]}} as OscillatorFamilyResult;
const motion={operation:"oscillator_evolve",runId:"run-motion",data:{rows:2,columns:["time","q_mean","norm"],bytes:48}} as OscillatorFamilyResult;

test("oscillator selections never cross runs or infer an unavailable spatial state",()=>{
  assert.equal(selectedOscillatorItem({kind:"energy",runId:"other",index:0},stationary,null),null);
  assert.equal(selectedOscillatorItem({kind:"energy",runId:"run-static",index:5},stationary,null),null);
  assert.deepEqual(selectedOscillatorItem({kind:"energy",runId:"run-static",index:1},stationary,null),
    {kind:"energy",index:1,energy:1.5,coefficients:null,spatialStateAvailable:false});
  assert.deepEqual(selectedOscillatorItem({kind:"position",runId:"run-static",index:1},stationary,null),
    {kind:"position",index:1,q:0,amplitude:.5,density:.25});
  assert.deepEqual(selectedOscillatorItem({kind:"energy",runId:"run-quartic",index:1},quartic,null),
    {kind:"energy",index:1,energy:1.58,coefficients:[0,1],spatialStateAvailable:false});
  assert.equal(selectedOscillatorItem({kind:"position",runId:"run-quartic",index:0},quartic,null),null);
});

test("time selection addresses only a complete named saved row",()=>{
  const data=new Float64Array([0,1,1,1,2,.99]);
  assert.deepEqual(selectedOscillatorItem({kind:"time",runId:"run-motion",index:1},motion,data),
    {kind:"time",index:1,values:{time:1,q_mean:2,norm:.99}});
  assert.equal(selectedOscillatorItem({kind:"time",runId:"run-motion",index:2},motion,data),null);
  assert.equal(selectedOscillatorItem({kind:"time",runId:"run-quartic",index:0},motion,data),null);
  assert.equal(selectedOscillatorItem({kind:"time",runId:"run-motion",index:0},motion,data.subarray(0,3)),null);
  const bytes=new Uint8Array(data.buffer);
  assert.deepEqual(decodeOscillatorData(bytes,motion),data);
  assert.throws(()=>decodeOscillatorData(bytes.subarray(0,8),motion),/shape/);
});
