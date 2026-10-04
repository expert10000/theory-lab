import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {MODEL_GROUPS} from "../apps/desktop/renderer/workspace-navigation";
import {TheoryIllustration} from "../apps/desktop/renderer/TheoryIllustration";

test("selected-system illustrations are labelled schematics for every model",()=>{
  const figures=MODEL_GROUPS.flatMap(group=>group.models).map(model=>[model,
    renderToStaticMarkup(React.createElement(TheoryIllustration,{model}))] as const);
  assert.equal(figures.length,13);
  for(const [model,markup] of figures){
    assert.match(markup,/role="img"/,model);
    assert.match(markup,/Conceptual schematic/,model);
    assert.match(markup,/not a computed wavefunction, trajectory, or saved run/,model);
  }
  assert.match(figures.find(([model])=>model==="hydrogenic")![1],/electron probability cloud/);
  assert.match(figures.find(([model])=>model==="hydrogenic")![1],/one proton if Z = 1/);
  assert.notEqual(figures.find(([model])=>model==="hydrogenic")![1],figures.find(([model])=>model==="ising_chain")![1]);
});
