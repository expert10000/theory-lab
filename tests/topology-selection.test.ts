import {test} from "node:test";
import assert from "node:assert/strict";
import type {TopologyResult} from "../packages/contracts";
import {selectedTopologySample} from "../apps/desktop/renderer/topology-selection";

const provenance={pythonVersion:"3.12",workerVersion:"0.1",computedAt:"2026-10-03T00:00:00Z",durationMs:1};
const ssh={schema:"quantum-result/v1",jobId:"ssh",runId:"run-ssh",status:"completed",operation:"topology",
  model:{type:"ssh",parameters:{t1:0,t2:1,cells:4,kPoints:3}},engine:{name:"native",version:"1.18"},
  analysis:{kind:"ssh",bulkGap:2,winding:1,kValues:[-Math.PI,0,Math.PI],lowerBand:[-1,-1,-1],upperBand:[1,1,1],edgeEnergies:[0,0],edgeDensity:[.5,0,0,0,0,0,0,.5],edgeWeight:1},provenance} as TopologyResult;
const qwz={...ssh,runId:"run-qwz",model:{type:"qwz",parameters:{mass:-1,grid:2}},
  analysis:{kind:"qwz",bulkGap:2,sampledGap:2,gapClosed:false,chern:-1,latticeChern:-1,analyticChern:-1,meshResolved:true,chernIntegral:-1,
    berryCurvature:[.1,.2,.3,.4],bandKValues:[-Math.PI,0],lowerBand:[-1,-2,-3,-4],upperBand:[1,2,3,4]}} as TopologyResult;
test("topology selection stays in its exact SSH run and recorded band/site arrays",()=>{
  assert.deepEqual(selectedTopologySample({kind:"ssh_band",runId:"run-ssh",index:1},ssh),{kind:"ssh_band",index:1,k:0,lower:-1,upper:1});
  assert.deepEqual(selectedTopologySample({kind:"ssh_site",runId:"run-ssh",index:7},ssh),{kind:"ssh_site",index:7,density:.5});
  assert.equal(selectedTopologySample({kind:"ssh_band",runId:"another",index:1},ssh),null);
  assert.equal(selectedTopologySample({kind:"ssh_site",runId:"run-ssh",index:8},ssh),null);
  assert.equal(selectedTopologySample({kind:"qwz_cell",runId:"run-ssh",xIndex:0,yIndex:0},ssh),null);
});
test("QWZ mesh selection uses recorded x-major cells and withholds closed-gap curvature",()=>{
  assert.deepEqual(selectedTopologySample({kind:"qwz_cell",runId:"run-qwz",xIndex:1,yIndex:0},qwz),
    {kind:"qwz_cell",xIndex:1,yIndex:0,curvature:.3,lower:-3,upper:3});
  assert.equal(selectedTopologySample({kind:"qwz_cell",runId:"run-qwz",xIndex:2,yIndex:0},qwz),null);
  assert.equal(selectedTopologySample({kind:"qwz_cell",runId:"run-ssh",xIndex:1,yIndex:0},qwz),null);
  const closed={...qwz,analysis:{...qwz.analysis,gapClosed:true,berryCurvature:[]}} as TopologyResult;
  assert.equal(selectedTopologySample({kind:"qwz_cell",runId:"run-qwz",xIndex:1,yIndex:0},closed),null);
  const legacy={...qwz,analysis:{...qwz.analysis,bandKValues:undefined,lowerBand:undefined,upperBand:undefined}} as TopologyResult;
  assert.deepEqual(selectedTopologySample({kind:"qwz_cell",runId:"run-qwz",xIndex:1,yIndex:0},legacy),
    {kind:"qwz_cell",xIndex:1,yIndex:0,curvature:.3,lower:null,upper:null});
});
