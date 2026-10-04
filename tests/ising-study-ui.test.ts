import {test} from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import type {QuantumBridge,WorkerStatus} from "../packages/contracts";
import {IsingStudyLab} from "../apps/desktop/renderer/IsingStudyLab";

test("Ising Sweeps view exposes bounded fields, engine choice and verified-run action boundary",()=>{
  const status={state:"READY",capabilities:{operations:["many_body"],engines:{native:{available:true},quspin:{available:true}}}} as WorkerStatus;
  const bridge={listIsingStudies:async()=>[]} as unknown as QuantumBridge;
  const html=renderToStaticMarkup(React.createElement(IsingStudyLab,{bridge,status,onOpenPoint:async()=>{}}));
  for(const label of ["Ising h/J study","Interaction J","Longitudinal field","h/J from","h/J to","QuSpin","Run Ising study"])
    assert.ok(html.includes(label),label);
  assert.ok(html.includes("Cancel between points")===false,"cancel only appears while running");
  assert.ok(html.includes("fidelity")===false,"no unavailable fidelity graph is advertised");
});
