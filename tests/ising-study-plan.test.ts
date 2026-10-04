import {test} from "node:test";
import assert from "node:assert/strict";
import Ajv from "ajv";
import schema from "../packages/contracts/schemas/quantum-ising-study.v1.json";
import {isIsingStudyPlan} from "../packages/contracts/ising-study";
import {isingStudyJob,isingStudyPlan,isingStudyRatio} from "../packages/models/ising-study";

test("versioned Ising plan fixes J, longitudinal field, sites, and boundary",()=>{
  const plan=isingStudyPlan("ising-1","native",{sites:4,interaction:2,longitudinal:.3,boundary:"periodic"},-2,2,5);
  assert.ok(isIsingStudyPlan(plan));
  assert.ok(new Ajv({strict:true}).compile(schema)(plan));
  assert.deepEqual(Array.from({length:5},(_,i)=>isingStudyRatio(plan,i)),[-2,-1,0,1,2]);
  assert.deepEqual(isingStudyJob(plan,3).model.parameters,{sites:4,interaction:2,longitudinal:.3,boundary:"periodic",transverse:2});
  for(const fixed of [{...plan.fixed,interaction:0},{...plan.fixed,sites:9},{...plan.fixed,longitudinal:11}])
    assert.throws(()=>isingStudyPlan("bad","native",fixed,-1,1,5),/Invalid bounded/);
  for(const [start,stop,points] of [[-6,6,5],[2,-2,5],[-1,1,32]])
    assert.throws(()=>isingStudyPlan("bad","quspin",plan.fixed,start,stop,points),/Invalid bounded/);
  assert.equal(isIsingStudyPlan({...plan,output:"fidelity"}),false);
});
