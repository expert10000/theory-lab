import test from "node:test";
import assert from "node:assert/strict";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import type {QuantumResult,SpectrumResult} from "../packages/contracts";
import type {EvolutionSample} from "../packages/quantum-3d/evolution";
import {ObservableWorkspace} from "../apps/desktop/renderer/ObservableWorkspace";
import {resolveObservableWorkspace} from "../apps/desktop/renderer/observable-workspace";
import {activeSelectionReference,type SelectionSources} from "../apps/desktop/renderer/selection-reference";

const empty:SelectionSources={tab:"spectrum",activeModel:"two_level",spectrum:{result:null,selection:null},
  evolution:null,cavity:null,lindblad:null,circuit:null,manyBody:null,sweep:null,topology:null,orbital:null,oscillator:null};
function result(operation:QuantumResult["operation"],model:QuantumResult["model"]["type"],extra:object={}):QuantumResult{
  return {runId:"run-a",operation,model:{type:model,parameters:{}},engine:{name:"native",version:"1"},
    provenance:{computedAt:"2026-10-04T00:00:00Z"},...extra} as QuantumResult;
}
function resolve(tab:SelectionSources["tab"],activeModel:SelectionSources["activeModel"],key:keyof SelectionSources,
  saved:QuantumResult,selection:object,sampleKey:"sample"|"level"|"item"|"cell",sample:object){
  const context={result:saved,selection,[sampleKey]:sample};
  const sources={...empty,tab,activeModel,[key]:context} as SelectionSources;
  const ref=activeSelectionReference(sources);
  assert.ok(ref,`${saved.operation} selection resolves`);
  const view=resolveObservableWorkspace(ref,saved,sources);
  assert.ok(view,`${saved.operation} observable view resolves`);
  assert.equal(view.runId,saved.runId);
  for(const card of view.cards){
    assert.ok(card.operator&&card.state&&card.basis&&card.unit&&card.source&&card.diagnostic);
    assert.equal(card.value===null,card.availability==="unavailable");
  }
  return {view,sources,ref};
}

test("QVIS-016 spectrum and time-row cards remain exact-run and label derived quantities",()=>{
  const spectrum=result("diagonalize","two_level",{spectrum:{eigenvalues:[-1,1]},stateAnalysis:{status:"resolved",states:[
    {bloch:{x:0,y:0,z:1},populations:[1,0],residualNorm:1e-10},
    {bloch:{x:0,y:0,z:-1},populations:[0,1],residualNorm:1e-10}]}}) as SpectrumResult;
  const spectrumSources={...empty,spectrum:{result:spectrum,selection:{kind:"energy",model:"two_level",runId:"run-a",level:1}}} as SelectionSources;
  const ref=activeSelectionReference(spectrumSources);assert.ok(ref);
  const view=resolveObservableWorkspace(ref,spectrum,spectrumSources);assert.ok(view);
  assert.equal(view.cards.find(card=>card.id==="variance_z")?.availability,"derived");
  assert.equal(view.cards.find(card=>card.id==="population_1")?.value,1);
  assert.equal(resolveObservableWorkspace({...ref,coordinate:{kind:"energy",index:0}},spectrum,spectrumSources),null);
  assert.equal(resolveObservableWorkspace(ref,{...spectrum,runId:"run-b"},spectrumSources),null);
  assert.equal(resolveObservableWorkspace(ref,spectrum,{...spectrumSources,tab:"runs"}),null);
  const oldResult={...spectrum,stateAnalysis:undefined};
  const legacy=resolveObservableWorkspace(ref,oldResult,{...spectrumSources,spectrum:{...spectrumSources.spectrum,result:oldResult}});
  assert.equal(legacy?.cards.find(card=>card.id==="eigenstate_expectation")?.availability,"unavailable");

  const evolution=result("evolve","driven_two_level");
  const sample={index:2,time:0.5,populations:[0.6,0.4],bloch:[0.2,0.1,0.2],
    amplitudes:[{re:1,im:0},{re:0,im:0}],density:[[{re:1,im:0},{re:0,im:0}],[{re:0,im:0},{re:0,im:0}]],
    trace:1,purity:1} as EvolutionSample;
  const time=resolve("dynamics","driven_two_level","evolution",evolution,
    {kind:"time_sample",model:"driven_two_level",runId:"run-a",index:2},"sample",sample);
  assert.equal(time.view.cards.find(card=>card.id==="p1")?.value,0.4);
  assert.equal(time.view.cards.find(card=>card.id==="variance_z")?.availability,"derived");
  assert.equal(resolveObservableWorkspace(time.ref,evolution,{...time.sources,evolution:{...time.sources.evolution!,sample:{...sample,index:3}}}),null);
  assert.equal(resolveObservableWorkspace(time.ref,evolution,{...time.sources,evolution:{...time.sources.evolution!,sample:{...sample,populations:[NaN,0.4]}}}),null);
});

test("QVIS-016 cavity, Lindblad and circuit cards use only recorded quantities",()=>{
  const cavity=result("cavity","jaynes_cummings");
  const cavityView=resolve("cavity","jaynes_cummings","cavity",cavity,
    {kind:"time_sample",model:"jaynes_cummings",runId:"run-a",index:1},"sample",
    {index:1,time:0.2,pExcited:0.4,meanPhoton:0.9,boundaryProbability:0.001,parity:-0.2}).view;
  assert.equal(cavityView.cards.find(card=>card.id==="mean_photon")?.unit,"photons");
  assert.ok(!cavityView.cards.some(card=>card.id==="state_vector"));

  const lindblad=result("lindblad","open_jaynes_cummings");
  const openView=resolve("open","lindblad","lindblad",lindblad,
    {kind:"time_sample",model:"open_jaynes_cummings",runId:"run-a",index:0},"sample",
    {index:0,time:0,pExcited:0.5,meanPhoton:0.1,purity:0.9,coherence:0.2,boundaryProbability:0.001,trace:1}).view;
  assert.equal(openView.cards.find(card=>card.id==="purity")?.value,0.9);
  assert.ok(openView.cards.every(card=>!card.label.includes("matrix")));

  const circuit=result("circuit","transmon",{spectrum:{cutoffDriftE01:1e-5,chargeMatrixElement01:0.23}});
  const circuitView=resolve("circuit","transmon","circuit",circuit,
    {kind:"energy_level",runId:"run-a",index:2},"level",{index:2,energyGHz:8.1,relativeGHz:3.2}).view;
  assert.equal(circuitView.cards.find(card=>card.id==="energy")?.unit,"GHz");
  assert.equal(circuitView.cards.find(card=>card.id==="charge_01")?.value,0.23);
  assert.equal(circuitView.cards.find(card=>card.id==="charge_state")?.availability,"unavailable");
});

test("QVIS-016 Ising, sweep and topology avoid invented state, trajectory and correlation data",()=>{
  const ising=result("many_body","ising_chain",{model:{type:"ising_chain",parameters:{sites:2}},
    groundState:{siteMagnetization:[0.7,-0.4]}});
  const isingView=resolve("many_body","ising_chain","manyBody",ising,
    {kind:"site_magnetization",runId:"run-a",index:1},"item",{kind:"site_magnetization",index:1,magnetization:-0.4}).view;
  assert.ok(Math.abs((isingView.cards.find(card=>card.id==="total_z")?.value??0)-0.3)<1e-12);
  assert.equal(isingView.cards.find(card=>card.id==="total_z")?.availability,"derived");
  assert.equal(isingView.cards.find(card=>card.id==="czz")?.availability,"unavailable");
  assert.equal(isingView.cards.find(card=>card.id==="correlation_length")?.availability,"unavailable");

  const sweep=result("sweep","driven_two_level",{data:{shape:{x:3,y:2}}});
  const sweepView=resolve("sweep","driven_two_level","sweep",sweep,
    {kind:"grid_cell",runId:"run-a",xIndex:2,yIndex:1},"cell",{xIndex:2,yIndex:1,finalP1:0.8}).view;
  assert.deepEqual(sweepView.cards.map(card=>card.id),["final_p1"]);
  assert.match(sweepView.cards[0].diagnostic,/no per-cell trajectory/);

  const ssh=result("topology","ssh");
  const sshView=resolve("topology","topology","topology",ssh,
    {kind:"ssh_band",runId:"run-a",index:4},"sample",{kind:"ssh_band",index:4,k:1,lower:-2,upper:2}).view;
  assert.deepEqual(sshView.cards.map(card=>card.id),["lower_band","upper_band"]);
  const qwz=result("topology","qwz",{model:{type:"qwz",parameters:{grid:3}}});
  const qwzView=resolve("topology","topology","topology",qwz,
    {kind:"qwz_cell",runId:"run-a",xIndex:1,yIndex:2},"sample",
    {kind:"qwz_cell",xIndex:1,yIndex:2,curvature:0.3,lower:null,upper:null}).view;
  assert.deepEqual(qwzView.cards.map(card=>card.id),["berry_curvature"]);
});

test("QVIS-016 orbital and oscillator cards preserve basis, units and sample limits",()=>{
  const orbital=result("orbital","hydrogenic");
  const radial=resolve("orbital","hydrogenic","orbital",orbital,
    {kind:"radial",runId:"run-a",index:3},"sample",{kind:"radial",index:3,radius:2,probability:0.2}).view;
  assert.equal(radial.cards[0].unit,"a₀⁻¹");
  const voxel=resolve("orbital","hydrogenic","orbital",orbital,
    {kind:"voxel",runId:"run-a",x:1,y:2,z:3},"sample",{kind:"voxel",x:1,y:2,z:3,density:0.1}).view;
  assert.equal(voxel.cards[0].unit,"a₀⁻³");
  const oscillator=result("oscillator_evolve","harmonic_oscillator");
  const dynamic=resolve("oscillator","oscillator","oscillator",oscillator,
    {kind:"time",runId:"run-a",index:2},"item",{kind:"time",index:2,values:{q_mean:0.2,q_variance:0.5,mean_number:1.2}}).view;
  assert.deepEqual(dynamic.cards.map(card=>card.id),["q_mean","q_variance","mean_number"]);
  assert.equal(dynamic.cards.find(card=>card.id==="q_variance")?.category,"variance");
  const html=renderToStaticMarkup(createElement(ObservableWorkspace,{view:dynamic}));
  assert.match(html,/QVIS-016 \/ OBSERVABLE WORKSPACE/);
  assert.match(html,/q² − ⟨q⟩²/);
  assert.match(html,/derived|stored/);
  assert.equal(renderToStaticMarkup(createElement(ObservableWorkspace,{view:null})),"");
});
