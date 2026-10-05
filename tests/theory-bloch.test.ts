import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {BlochSphereIllustration,hasBlochSphere} from "../apps/desktop/renderer/BlochSphereIllustration";
import {TheoryPanel} from "../apps/desktop/renderer/TheoryPanel";
import type {WorkspaceModel} from "../apps/desktop/renderer/workspace-navigation";

test("Theory offers a labelled conceptual sphere only for qubit and two-band models",()=>{
  const models:WorkspaceModel[]=["two_level","driven_two_level","landau_zener","stuckelberg","strong_drive","topology"];
  for(const model of models){
    assert.equal(hasBlochSphere(model),true);
    const page=renderToStaticMarkup(React.createElement(TheoryPanel,{model}));
    assert.match(page,/Bloch sphere/);
    const sphere=renderToStaticMarkup(React.createElement(BlochSphereIllustration,{model}));
    assert.match(sphere,/schematic/i);
    assert.match(sphere,/not a saved-run state|pseudospin map/i);
    if(model==="topology")assert.match(sphere,/At d\(k\) = 0/);
  }
  for(const model of ["jaynes_cummings","quantum_rabi","lindblad","ising_chain","hydrogenic","oscillator","transmon"] as WorkspaceModel[]){
    assert.equal(hasBlochSphere(model),false);
    assert.doesNotMatch(renderToStaticMarkup(React.createElement(TheoryPanel,{model})),/Bloch sphere/);
  }
});
