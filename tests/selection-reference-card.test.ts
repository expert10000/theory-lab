import test from "node:test";
import assert from "node:assert/strict";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import type {QuantumResult} from "../packages/contracts";
import {SelectionReferenceCard} from "../apps/desktop/renderer/SelectionReferenceCard";
import type {ScientificSelectionReference} from "../apps/desktop/renderer/selection-reference";

test("QVIS-014 inspector reference is exact-run and discloses missing Ising state quantities",()=>{
  const result={runId:"run-ising",operation:"many_body",model:{type:"ising_chain"}} as QuantumResult;
  const reference:ScientificSelectionReference={schema:"scientific-selection/v1",runId:"run-ising",
    operation:"many_body",model:"ising_chain",coordinate:{kind:"site",index:2}};
  const html=renderToStaticMarkup(createElement(SelectionReferenceCard,{reference,result}));
  assert.match(html,/Stored site 3/);
  assert.match(html,/run-ising/);
  assert.match(html,/full ground-state vector are unavailable/);
  assert.equal(renderToStaticMarkup(createElement(SelectionReferenceCard,{reference:{...reference,runId:"other"},result})),"");
});
