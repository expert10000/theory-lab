import test from "node:test";
import assert from "node:assert/strict";
import {modeForTab,modelForSnapshot,tabForMode,WORKSPACE_MODES} from "../apps/desktop/renderer/workspace-navigation";
import type {WorkspaceSnapshot,WorkspaceTab} from "../packages/contracts";

test("QLAB-UI-1 exposes six modes without turning utilities into experiments",()=>{
  assert.deepEqual(WORKSPACE_MODES.map(mode=>mode.label),["Explore","Dynamics","Sweeps","Analysis","Scenes","Runs"]);
  assert.deepEqual(["atlas","presets","roadmap","backend"].map(tab=>modeForTab(tab as WorkspaceTab)),[null,null,null,null]);
  assert.equal(modeForTab("spectrum"),"explore");
  assert.equal(modeForTab("hamiltonian"),"analysis");
});

test("QLAB-UI-1 gates existing experiments by selected model",()=>{
  assert.equal(tabForMode("two_level","explore"),"spectrum");
  assert.equal(tabForMode("two_level","analysis"),"hamiltonian");
  assert.equal(tabForMode("two_level","sweeps"),null,"current dynamics sweep is not an energy sweep");
  assert.equal(tabForMode("landau_zener","dynamics"),"dynamics");
  assert.equal(tabForMode("landau_zener","sweeps"),"sweep");
  assert.equal(tabForMode("landau_zener","analysis"),null);
  assert.equal(tabForMode("oscillator","explore"),"oscillator");
  assert.equal(tabForMode("oscillator","dynamics"),null,"internal oscillator modes are not yet a shared workspace adapter");
  for(const model of ["two_level","oscillator","lindblad"] as const){
    assert.equal(tabForMode(model,"scenes"),"scenes");
    assert.equal(tabForMode(model,"runs"),"runs");
  }
});

test("QLAB-UI-1 maps legacy saved tabs to the same model and experiment",()=>{
  const snapshot={tab:"dynamics",dynamics:{modelId:"stuckelberg"},sweep:{modelId:"landau_zener"},cavity:{modelId:"quantum_rabi"}} as WorkspaceSnapshot;
  assert.equal(modelForSnapshot(snapshot),"stuckelberg");
  assert.equal(modelForSnapshot({...snapshot,tab:"sweep"}),"landau_zener");
  assert.equal(modelForSnapshot({...snapshot,tab:"cavity"}),"quantum_rabi");
  assert.equal(modelForSnapshot({...snapshot,tab:"oscillator"}),"oscillator");
  assert.equal(modelForSnapshot({...snapshot,tab:"atlas"}),"two_level");
});
