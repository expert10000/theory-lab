import assert from "node:assert/strict";
import {test} from "node:test";
import {WorkerSupervisor} from "../apps/desktop/main/worker";
import {isQuantumResult,type TopologyResult} from "../packages/contracts";
import {type HofstadterEdgePlan} from "../packages/contracts/hofstadter-edge-study";
import {deriveHofstadterEdgeStudy,hofstadterEdgeJobs} from "../packages/models/hofstadter-edge-study";

test("bounded bulk-edge evidence, reversal, gap closure and sampling refusal",async()=>{
  const worker=new WorkerSupervisor(process.cwd());await worker.start();
  const calculate=async(p:number,q:number,occupiedBands:number,stripSamples:17|31=31)=>{
    const plan:HofstadterEdgePlan={schema:"quantum-hofstadter-edge-plan/v1",studyId:`edge-${p<0?"neg":"pos"}-${q}-${occupiedBands}-${stripSamples}`,
      p,q,hopping:1,grid:9,occupiedBands,stripSamples,widths:[18,24]};
    const jobs=hofstadterEdgeJobs(plan),results=[] as TopologyResult[];
    for(const job of jobs){const value=await worker.request("quantum.run",job);
      assert.ok(isQuantumResult(value)&&value.operation==="topology"&&value.analysis.kind==="hofstadter");
      results.push(value as TopologyResult);}
    return {plan,results:results as [TopologyResult,TopologyResult,TopologyResult],study:await deriveHofstadterEdgeStudy(plan,results as [TopologyResult,TopologyResult,TopologyResult])};
  };
  try{
    const forward=await calculate(1,6,1),reversed=await calculate(-1,6,1);
    assert.equal(forward.study.bulk.hall,-1);assert.equal(reversed.study.bulk.hall,1);
    assert.equal(forward.study.comparison.status,"consistent");assert.equal(reversed.study.comparison.status,"consistent");
    assert.equal(forward.study.tracking?.status,"consistent");assert.equal(reversed.study.tracking?.status,"consistent");
    assert.ok(forward.study.tracking!.widths.every(w=>w.ambiguousCandidates===0&&w.crossings.every(c=>c.overlap>=.5&&c.margin>=.02)));
    assert.deepEqual(forward.study.tracking!.widths.map(w=>[w.leftFlow,w.rightFlow]),[[1,-1],[1,-1]]);
    assert.deepEqual(reversed.study.tracking!.widths.map(w=>[w.leftFlow,w.rightFlow]),[[-1,1],[-1,1]]);
    assert.ok(forward.study.comparison.maximumKyDrift!==null&&forward.study.comparison.maximumKyDrift<.01);
    assert.ok(forward.study.widths.every(w=>w.crossings.every(c=>c.minimumWeight>=.35)));
    const ambiguous=await calculate(1,3,1);assert.equal(ambiguous.study.comparison.status,"undefined");
    assert.ok(ambiguous.study.tracking?.widths.every(w=>w.ambiguousCandidates>0));
    const legacy=structuredClone(ambiguous.results);
    for(const result of legacy.slice(1))if(result.analysis.kind==="hofstadter"&&result.analysis.strip)
      delete result.analysis.strip.continuation;
    const legacyStudy=await deriveHofstadterEdgeStudy(ambiguous.plan,legacy);
    assert.equal(legacyStudy.tracking,undefined);
    assert.equal(legacyStudy.comparison.status,"consistent");
    const mismatchedTermination=await calculate(1,5,1);
    assert.equal(mismatchedTermination.study.comparison.status,"undefined");
    assert.equal(mismatchedTermination.study.tracking?.widths[0].ambiguousCandidates,0);
    const coarse=await calculate(1,3,1,17);assert.equal(coarse.study.comparison.status,"undefined");
    const touching=await calculate(1,4,2);assert.equal(touching.study.bulk.gapStatus,"gap-closed");
    assert.equal(touching.study.bulk.hall,null);assert.equal(touching.study.comparison.status,"undefined");
    await assert.rejects(deriveHofstadterEdgeStudy(forward.plan,[forward.results[0],reversed.results[1],forward.results[2]]),/Mismatched/);
  }finally{await worker.stop();}
});
