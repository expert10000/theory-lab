import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import type {SpectrumJob,SpectrumResult} from "../packages/contracts";
import {blochFromSpinor,twoLevelStateView,type ComplexPair,type Spinor} from "../packages/models/two-level-state-view";
import {WorkerSupervisor} from "../apps/desktop/main/worker";
import {RunStore} from "../apps/desktop/main/runs";
import {TwoLevelStateView} from "../apps/desktop/renderer/TwoLevelStateView";

const close=(a:number,b:number,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<tolerance,`${a} ≠ ${b}`);

test("Bloch expectations are normalized and invariant under global complex phase",()=>{
  const base:Spinor=[[Math.sqrt(.3),0],[Math.sqrt(.7),0]];
  const vector=blochFromSpinor(base)!;
  close(vector.x,2*Math.sqrt(.21));close(vector.y,0);close(vector.z,-.4);
  const theta=.73,c=Math.cos(theta),s=Math.sin(theta);
  const rotate=([re,im]:ComplexPair):ComplexPair=>[re*c-im*s,re*s+im*c];
  const rotated:Spinor=[rotate(base[0]),rotate(base[1])];
  const after=blochFromSpinor(rotated)!;
  close(after.x,vector.x);close(after.y,vector.y);close(after.z,vector.z);
  const plusY=blochFromSpinor([[1,0],[0,1]])!;
  close(plusY.y,1);
  assert.equal(blochFromSpinor([[0,0],[0,0]]),null);
  assert.equal(blochFromSpinor([[Infinity,0],[0,1]]),null);
});

test("verified QuTiP/native states project and reopen; degenerate or legacy results stay unavailable",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-state-view-"));
  const worker=new WorkerSupervisor(process.cwd());
  const store=new RunStore(join(root,"runs"),join(root,"artifacts"));
  try{
    assert.equal((await worker.start()).state,"READY");
    for(const engine of ["qutip","native"] as const){
      const job:SpectrumJob={schema:"quantum-job/v1",jobId:`state-${engine}`,operation:"diagonalize",engine,
        model:{type:"two_level",parameters:{delta:1,omega:.8}}};
      const result=await worker.request("quantum.run",job) as SpectrumResult;
      await store.record(job,result);
      const reopened=await store.spectrum(result.runId);
      const low=twoLevelStateView(reopened,0),high=twoLevelStateView(reopened,1);
      assert.ok(low&&high);
      assert.equal(low.runId,reopened.runId);
      const view=renderToStaticMarkup(React.createElement(TwoLevelStateView,
        {result:reopened,selectedLevel:0,onSelectLevel:()=>{}}));
      assert.match(view,/Bloch x-z great circle for verified real eigenstates/);
      assert.match(view,/P0 · \|0⟩/);
      assert.match(view,/STORED-RUN HAMILTONIAN/);
      assert.match(view,/0\.500000/);
      assert.match(view,/0\.400000/);
      close(low.populations[0]+low.populations[1],1);
      close(low.bloch.x*low.bloch.x+low.bloch.y*low.bloch.y+low.bloch.z*low.bloch.z,1);
      close(low.bloch.x,-high.bloch.x);close(low.bloch.z,-high.bloch.z);
      close(low.bloch.x,reopened.stateAnalysis?.status==="resolved"?reopened.stateAnalysis.states[0].bloch.x:NaN);
      const {stateAnalysis:_analysis,...legacy}=reopened;
      assert.equal(twoLevelStateView(legacy,0),null);
      assert.match(renderToStaticMarkup(React.createElement(TwoLevelStateView,
        {result:legacy,selectedLevel:null,onSelectLevel:()=>{}})),/No eigenvector or Bloch point can be inferred/);
      if(reopened.stateAnalysis?.status==="resolved"){
        const forged={...reopened,stateAnalysis:{...reopened.stateAnalysis,states:[
          {...reopened.stateAnalysis.states[0],bloch:{...reopened.stateAnalysis.states[0].bloch,z:0}},
          reopened.stateAnalysis.states[1]]}} as SpectrumResult;
        assert.equal(twoLevelStateView(forged,0),null);
      }
      const zeroJob:SpectrumJob={...job,jobId:`degenerate-${engine}`,
        model:{type:"two_level",parameters:{delta:0,omega:0}}};
      const zero=await worker.request("quantum.run",zeroJob) as SpectrumResult;
      assert.equal(zero.stateAnalysis?.status,"degenerate");
      assert.equal(twoLevelStateView(zero,0),null);
      assert.match(renderToStaticMarkup(React.createElement(TwoLevelStateView,
        {result:zero,selectedLevel:null,onSelectLevel:()=>{}})),/no unique Bloch point is displayed/);
    }
  }finally{await worker.stop();await rm(root,{recursive:true,force:true});}
});
