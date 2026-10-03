import {test} from "node:test";
import assert from "node:assert/strict";
import type {OrbitalResult} from "../packages/contracts";
import {selectedOrbitalSample} from "../apps/desktop/renderer/orbital-selection";

const result={runId:"run-orbital",model:{type:"hydrogenic",parameters:{n:1,l:0,m:0,basis:"complex",Z:1,radius:2,grid:2}},
  analysis:{radialRadii:[0,1,2],radialProbability:[0,.5,.2]}} as OrbitalResult;
test("orbital radial and z-fastest voxel selection resolve only the named stored run",()=>{
  const data=new Uint8Array(2**3*16),view=new DataView(data.buffer);
  view.setFloat64(((1*2+0)*2+1)*16,3,true);view.setFloat64(((1*2+0)*2+1)*16+8,4,true);
  assert.deepEqual(selectedOrbitalSample({kind:"radial",runId:"run-orbital",index:1},result,data),
    {kind:"radial",index:1,radius:1,probability:.5});
  assert.deepEqual(selectedOrbitalSample({kind:"voxel",runId:"run-orbital",x:1,y:0,z:1},result,data),
    {kind:"voxel",x:1,y:0,z:1,position:[2,-2,2],real:3,imaginary:4,density:25});
  assert.equal(selectedOrbitalSample({kind:"voxel",runId:"another",x:1,y:0,z:1},result,data),null);
  assert.equal(selectedOrbitalSample({kind:"voxel",runId:"run-orbital",x:2,y:0,z:1},result,data),null);
  assert.equal(selectedOrbitalSample({kind:"radial",runId:"run-orbital",index:3},result,data),null);
});
