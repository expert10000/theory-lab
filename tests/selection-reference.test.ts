import test from "node:test";
import assert from "node:assert/strict";
import type {SelectionSources,ScientificSelectionReference} from "../apps/desktop/renderer/selection-reference";
import {activeSelectionReference} from "../apps/desktop/renderer/selection-reference";

const empty:SelectionSources={tab:"spectrum",activeModel:"two_level",spectrum:{result:null,selection:null},
  evolution:null,cavity:null,lindblad:null,circuit:null,manyBody:null,sweep:null,topology:null,orbital:null,oscillator:null};
const result=(operation:string,model:string)=>({runId:"run-source",operation,model:{type:model}});
function source(tab:SelectionSources["tab"],activeModel:SelectionSources["activeModel"],key:keyof SelectionSources,context:unknown):SelectionSources{
  return {...empty,tab,activeModel,[key]:context} as SelectionSources;
}
function expectRef(s:SelectionSources,coordinate:ScientificSelectionReference["coordinate"]){
  assert.deepEqual(activeSelectionReference(s),{schema:"scientific-selection/v1",runId:"run-source",
    operation:(s[keyForTab(s.tab)] as {result:{operation:string}}).result.operation,
    model:(s[keyForTab(s.tab)] as {result:{model:{type:string}}}).result.model.type,coordinate});
}
function keyForTab(tab:SelectionSources["tab"]):keyof SelectionSources{
  return ({spectrum:"spectrum",dynamics:"evolution",cavity:"cavity",open:"lindblad",circuit:"circuit",
    many_body:"manyBody",sweep:"sweep",topology:"topology",orbital:"orbital",oscillator:"oscillator"} as Partial<Record<SelectionSources["tab"],keyof SelectionSources>>)[tab]!;
}

test("QVIS-014 maps existing resolved selections into one exact-run reference",()=>{
  const spectrum=source("spectrum","two_level","spectrum",{result:{...result("diagonalize","two_level"),spectrum:{eigenvalues:[-1,1]}},
    selection:{kind:"energy",model:"two_level",runId:"run-source",level:1}});
  expectRef(spectrum,{kind:"energy",index:1});
  for(const [tab,model,key,operation] of [
    ["dynamics","driven_two_level","evolution","evolve"],
    ["cavity","jaynes_cummings","cavity","cavity"],
    ["open","lindblad","lindblad","lindblad"],
  ] as const){
    const resultModel=model==="lindblad"?"open_jaynes_cummings":model;
    expectRef(source(tab,model,key,{result:result(operation,resultModel),
      selection:{kind:"time_sample",model:resultModel,runId:"run-source",index:3},sample:{index:3}}),{kind:"time",index:3});
  }
  expectRef(source("circuit","transmon","circuit",{result:result("circuit","transmon"),
    selection:{kind:"energy_level",runId:"run-source",index:2},level:{index:2}}),{kind:"energy",index:2});
  expectRef(source("many_body","ising_chain","manyBody",{result:result("many_body","ising_chain"),
    selection:{kind:"site_magnetization",runId:"run-source",index:4},item:{kind:"site_magnetization",index:4}}),{kind:"site",index:4});
  expectRef(source("sweep","driven_two_level","sweep",{result:result("sweep","driven_two_level"),
    selection:{kind:"grid_cell",runId:"run-source",xIndex:2,yIndex:1},cell:{xIndex:2,yIndex:1}}),
    {kind:"cell",xIndex:2,yIndex:1});
  expectRef(source("topology","topology","topology",{result:result("topology","qwz"),
    selection:{kind:"qwz_cell",runId:"run-source",xIndex:1,yIndex:2},sample:{kind:"qwz_cell",xIndex:1,yIndex:2}}),
    {kind:"cell",xIndex:1,yIndex:2});
  expectRef(source("orbital","hydrogenic","orbital",{result:result("orbital","hydrogenic"),
    selection:{kind:"voxel",runId:"run-source",x:1,y:2,z:3},sample:{kind:"voxel",x:1,y:2,z:3}}),
    {kind:"voxel",x:1,y:2,z:3});
  expectRef(source("oscillator","oscillator","oscillator",{result:result("oscillator_evolve","oscillator"),
    selection:{kind:"time",runId:"run-source",index:5},item:{kind:"time",index:5}}),{kind:"time",index:5});
});

test("QVIS-014 refuses mismatched, unresolved and inactive references",()=>{
  const base=source("many_body","ising_chain","manyBody",{result:result("many_body","ising_chain"),
    selection:{kind:"energy_level",runId:"run-source",index:1},item:{kind:"energy_level",index:1}});
  expectRef(base,{kind:"energy",index:1});
  assert.equal(activeSelectionReference({...base,manyBody:{...base.manyBody!,selection:{kind:"energy_level",runId:"other-run",index:1}}}),null);
  assert.equal(activeSelectionReference({...base,manyBody:{...base.manyBody!,item:null}}),null);
  assert.equal(activeSelectionReference({...base,activeModel:"two_level"}),null);
  assert.equal(activeSelectionReference({...base,tab:"runs"}),null);
  assert.equal(activeSelectionReference({...base,manyBody:{...base.manyBody!,selection:{kind:"energy_level",runId:"run-source",index:-1}}}),null);
  const evolution=source("dynamics","driven_two_level","evolution",{result:result("evolve","driven_two_level"),
    selection:{kind:"time_sample",model:"landau_zener",runId:"run-source",index:1},sample:{index:1}});
  assert.equal(activeSelectionReference(evolution),null,"a matching row does not excuse a cross-model reference");
});
