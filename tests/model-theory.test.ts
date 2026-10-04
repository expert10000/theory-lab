import test from "node:test";
import assert from "node:assert/strict";
import { MODEL_GROUPS } from "../apps/desktop/renderer/workspace-navigation";
import { theoryForModel } from "../apps/desktop/renderer/TheoryPanel";

test("every selected Lab model has a bounded, model-specific Theory guide",()=>{
  const models=MODEL_GROUPS.flatMap(group=>group.models);
  assert.equal(models.length,13);
  for(const model of models){
    const guide=theoryForModel(model);
    assert.ok(guide.idea.length>30,model);
    assert.ok(guide.formula.length>10,model);
    assert.ok(guide.basis.length>10,model);
    assert.ok(guide.parameters.length>0,model);
    assert.ok(guide.shows.length>0,model);
    assert.ok(guide.boundary.length>20,model);
  }
  assert.match(theoryForModel("lindblad").boundary,/not a stored density matrix/);
  assert.match(theoryForModel("transmon").boundary,/not a full eigenstate vector/);
  assert.match(theoryForModel("hydrogenic").boundary,/not a multi-electron atom/);
});
