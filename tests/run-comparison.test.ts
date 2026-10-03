import test from "node:test";
import assert from "node:assert/strict";
import type {VerifiedSavedRun} from "../packages/contracts";
import {compareVerifiedRuns} from "../packages/models/run-comparison";

function bytes(values:number[]):Uint8Array{
  const output=new Uint8Array(values.length*8),view=new DataView(output.buffer);
  values.forEach((value,index)=>view.setFloat64(index*8,value,true));
  return output;
}
function saved(operation:string,model:string,extra:Record<string,unknown>,id:string,data:Uint8Array|null=null):VerifiedSavedRun{
  return {job:{operation,model:{type:model,parameters:{}},engine:"native",jobId:`job-${id}`},
    result:{schema:"quantum-result/v1",operation,runId:id,jobId:`job-${id}`,model:{type:model,parameters:{}},
      engine:{name:"native",version:"test"},provenance:{pythonVersion:"3",workerVersion:"1",durationMs:1,computedAt:"2026-10-03"},...extra},data} as VerifiedSavedRun;
}
function rows(operation:string,model:string,columns:string[],readout:string,id:string,value:number){
  const data=bytes([0,1,1,1,value,1]);
  return saved(operation,model,{data:{columns,rows:2,bytes:data.byteLength,sha256:"test"}},id,data);
}

test("UI-6 declares a physical observable for every current saved result family",()=>{
  const cases:[VerifiedSavedRun,VerifiedSavedRun][]=[];
  const pair=(operation:string,model:string,extra:(v:number)=>Record<string,unknown>)=>
    cases.push([saved(operation,model,extra(1),`${operation}-a`),saved(operation,model,extra(2),`${operation}-b`)]);
  pair("diagonalize","two_level",v=>({spectrum:{eigenvalues:[-v,v],units:"normalized"}}));
  pair("circuit","transmon",v=>({spectrum:{energies:[0,v],e01:v,e12:v,anharmonicity:v,units:"GHz"}}));
  pair("many_body","ising_chain",v=>({model:{type:"ising_chain",parameters:{sites:2,boundary:"open"}},
    spectrum:{lowEnergies:[-v,v]},groundState:{siteMagnetization:[v,-v]}}));
  pair("topology","ssh",v=>({model:{type:"ssh",parameters:{cells:2}},analysis:{kind:"ssh",kValues:[0,1],lowerBand:[-v,-v],upperBand:[v,v],edgeDensity:[v,0,0,v]}}));
  pair("topology","qwz",v=>({model:{type:"qwz",parameters:{grid:2}},analysis:{kind:"qwz",gapClosed:false,berryCurvature:[v,0,0,v],bandKValues:[0,1],lowerBand:[-v,-v],upperBand:[v,v]}}));
  const orbital=(id:string,v:number)=>{
    const data=bytes([v,0,v,0]);
    return saved("orbital","hydrogenic",{model:{type:"hydrogenic",parameters:{basis:"complex",grid:2,radius:4}},
      data:{rows:2,bytes:data.byteLength},analysis:{energyHartree:-v,radialRadii:[0,1],radialProbability:[v,0]}},id,data);
  };
  cases.push([orbital("orbital-a",1),orbital("orbital-b",2)]);
  pair("oscillator","harmonic_oscillator",v=>({spectrum:{energies:[v,2*v],units:"normalized"},state:{q:[-1,1],density:[v,v]}}));
  pair("oscillator_anharmonic","anharmonic_oscillator",v=>({spectrum:{energies:[v,2*v]}}));
  const sweep=(id:string,v:number)=>{
    const data=bytes([v,v,v,v]);
    return saved("sweep","driven_two_level",{sweep:{x:{parameter:"delta",start:0,stop:1,points:2},y:{parameter:"frequency",start:0,stop:1,points:2},metric:"final_p1",tStart:0,tStop:1,initialIndex:0},
      data:{shape:{x:2,y:2},bytes:data.byteLength}},id,data);
  };
  cases.push([sweep("sweep-a",.2),sweep("sweep-b",.4)]);
  for(const [operation,model,name] of [
    ["evolve","driven_two_level","p1"],["cavity","jaynes_cummings","p_excited"],
    ["lindblad","open_jaynes_cummings","purity"],["oscillator_evolve","harmonic_oscillator","q_mean"],
    ["oscillator_drive","driven_harmonic_oscillator","q_mean"],["oscillator_pulse","driven_harmonic_oscillator","q_mean"],
    ["oscillator_damped","damped_harmonic_oscillator","mean_number"],["oscillator_parametric","parametric_oscillator","q_variance"],
  ])cases.push([rows(operation,model,["time",name,"norm"],name,`${operation}-a`,2),
    rows(operation,model,["time",name,"norm"],name,`${operation}-b`,3)]);
  assert.equal(cases.length,17);
  for(const [a,b] of cases){
    const comparison=compareVerifiedRuns(a,b);
    assert.equal(comparison.status,"aligned",`${a.result.operation}/${a.result.model.type}: ${comparison.reason}`);
    assert.ok(comparison.observables.length>0);
    assert.ok(comparison.observables[0].maxAbsDelta>0);
    assert.equal(comparison.observables[0].b[0]-comparison.observables[0].a[0],
      comparison.observables[0].b[0]-comparison.observables[0].a[0]);
  }
});

test("UI-6 refuses cross-model, duplicate, unaligned and undefined scientific deltas",()=>{
  const a=rows("evolve","driven_two_level",["time","p1","norm"],"p1","a",.2);
  const b=rows("evolve","landau_zener",["time","p1","norm"],"p1","b",.3);
  assert.equal(compareVerifiedRuns(a,b).status,"metadata-only");
  assert.equal(compareVerifiedRuns(a,a).status,"metadata-only");
  const off=rows("evolve","driven_two_level",["time","p1","norm"],"p1","off",.4);
  off.data=bytes([0,1,1,1.01,.4,1]);
  assert.match(compareVerifiedRuns(a,off).reason,/time coordinates differ/);
  const closed=saved("topology","qwz",{model:{type:"qwz",parameters:{grid:2}},analysis:{kind:"qwz",gapClosed:true,berryCurvature:[0,0,0,0]}},"closed");
  const closedB={...closed,result:{...closed.result,runId:"closed-b"}} as VerifiedSavedRun;
  const result=compareVerifiedRuns(closed,closedB);
  assert.equal(result.status,"metadata-only");
  assert.match(result.withheld.join(" "),/undefined at gap closure/);
});
