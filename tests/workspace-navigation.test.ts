import test from "node:test";
import assert from "node:assert/strict";
import {locationFromHash,modeForTab,modelForSnapshot,MODEL_GROUPS,tabForMode,workspaceHash,WORKSPACE_MODES} from "../apps/desktop/renderer/workspace-navigation";
import type {WorkspaceSnapshot,WorkspaceTab} from "../packages/contracts";

test("workspace exposes selected-model Theory without turning utilities into experiments",()=>{
  assert.deepEqual(WORKSPACE_MODES.map(mode=>mode.label),["Explore","Dynamics","Sweeps","Analysis","Theory","Scenes","Runs"]);
  assert.deepEqual(["atlas","presets","roadmap","backend"].map(tab=>modeForTab(tab as WorkspaceTab)),[null,null,null,null]);
  assert.equal(modeForTab("spectrum"),"explore");
  assert.equal(modeForTab("hamiltonian"),"analysis");
  assert.equal(modeForTab("theory"),"theory");
});

test("QLAB-UI-1 gates existing experiments by selected model",()=>{
  assert.equal(tabForMode("two_level","explore"),"spectrum");
  assert.equal(tabForMode("two_level","analysis"),"hamiltonian");
  assert.equal(tabForMode("two_level","sweeps"),"sweep","static energy study is distinct from dynamics final-population sweep");
  assert.equal(tabForMode("landau_zener","dynamics"),"dynamics");
  assert.equal(tabForMode("landau_zener","sweeps"),"sweep");
  assert.equal(tabForMode("ising_chain","sweeps"),"sweep");
  assert.equal(tabForMode("landau_zener","analysis"),"hamiltonian","saved-run A/B Analysis is available for every model");
  assert.equal(tabForMode("oscillator","explore"),"oscillator");
  assert.equal(tabForMode("oscillator","dynamics"),null,"internal oscillator modes are not yet a shared workspace adapter");
  for(const model of ["two_level","oscillator","lindblad"] as const){
    assert.equal(tabForMode(model,"theory"),"theory");
    assert.equal(tabForMode(model,"scenes"),"scenes");
    assert.equal(tabForMode(model,"runs"),"runs");
  }
});

test("QLAB-UI-1 maps legacy saved tabs to the same model and experiment",()=>{
  const snapshot={tab:"dynamics",dynamics:{modelId:"stuckelberg"},sweep:{modelId:"landau_zener"},cavity:{modelId:"quantum_rabi"}} as WorkspaceSnapshot;
  assert.equal(modelForSnapshot(snapshot),"stuckelberg");
  assert.equal(modelForSnapshot({...snapshot,tab:"sweep"}),"landau_zener");
  assert.equal(modelForSnapshot({...snapshot,tab:"sweep",sweepView:"two_level"}),"two_level");
  assert.equal(modelForSnapshot({...snapshot,tab:"sweep",sweepView:"ising_chain"}),"ising_chain");
  assert.equal(modelForSnapshot({...snapshot,tab:"cavity"}),"quantum_rabi");
  assert.equal(modelForSnapshot({...snapshot,tab:"oscillator"}),"oscillator");
  assert.equal(modelForSnapshot({...snapshot,tab:"atlas"}),"two_level");
  assert.equal(modelForSnapshot({...snapshot,tab:"hamiltonian",analysisModel:"oscillator"}),"oscillator");
  assert.equal(modelForSnapshot({...snapshot,tab:"hamiltonian"}),"two_level","legacy Hamiltonian snapshots remain two-level");
  assert.equal(modelForSnapshot({...snapshot,tab:"theory",theoryModel:"quantum_rabi"}),"quantum_rabi");
});

test("QLAB-UI-1 groups every model exactly once and keeps safe deep links",()=>{
  const models=MODEL_GROUPS.flatMap(group=>group.models);
  assert.equal(new Set(models).size,models.length);
  assert.equal(models.length,13);
  for(const location of [
    {model:"two_level",tab:"spectrum"},{model:"landau_zener",tab:"dynamics"},
    {model:"oscillator",tab:"oscillator"},{model:"quantum_rabi",tab:"runs"},
    {model:"topology",tab:"atlas"},
    {model:"oscillator",tab:"hamiltonian"},
    {model:"quantum_rabi",tab:"theory"},
  ] as const)assert.deepEqual(locationFromHash(workspaceHash(location)),location);
  assert.deepEqual(locationFromHash("#sweep"),{model:"driven_two_level",tab:"sweep"});
  assert.deepEqual(locationFromHash("#tab/circuit"),{model:"transmon",tab:"circuit"});
  assert.deepEqual(locationFromHash("#lab/two_level/sweep"),{model:"two_level",tab:"sweep"});
  assert.equal(locationFromHash("#lab/unknown/spectrum"),null);
  assert.equal(locationFromHash("#view/backend/../../spectrum"),null);
});
