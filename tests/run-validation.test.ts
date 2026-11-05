import { test } from "node:test";
import assert from "node:assert/strict";
import type { VerifiedSavedRun } from "../packages/contracts";
import { savedRunValidation } from "../apps/desktop/renderer/run-validation";

test("saved-run dashboard measures population normalization and separates unavailable checks", () => {
  const data = new Uint8Array(2 * 3 * 8), view = new DataView(data.buffer);
  [0, 0.4, 0.6, 1, 0.3, 0.7].forEach((value, index) => view.setFloat64(index * 8, value, true));
  const run = { job: {} as VerifiedSavedRun["job"], data,
    result: { operation: "evolve", data: { rows: 2, columns: ["time", "p0", "p1"] } } as unknown as VerifiedSavedRun["result"] };
  const checks = savedRunValidation(run);
  assert.match(checks.find(check => check.name === "Normalization")!.detail, /0\.000e\+0/);
  assert.equal(checks.find(check => check.name === "Normalization")!.status, "checked");
  assert.equal(checks.find(check => check.name === "Hermiticity")!.status, "unavailable");
});

test("stored density matrix Hermiticity is measured and a broken conjugate is warned", () => {
  const columns = ["rho_0_0_re", "rho_0_0_im", "rho_0_1_re", "rho_0_1_im",
    "rho_1_0_re", "rho_1_0_im", "rho_1_1_re", "rho_1_1_im"];
  const data = new Uint8Array(columns.length * 8), view = new DataView(data.buffer);
  [0.5, 0, 0.2, 0.1, 0.2, -0.1, 0.5, 0].forEach((value, index) => view.setFloat64(index * 8, value, true));
  const run = { job: {} as VerifiedSavedRun["job"], data,
    result: { operation: "oscillator_damped", model: { parameters: { cutoff: 2 } },
      data: { rows: 1, columns } } as unknown as VerifiedSavedRun["result"] };
  assert.equal(savedRunValidation(run).find(check => check.name === "Hermiticity")?.status, "checked");
  view.setFloat64(5 * 8, 0.1, true);
  assert.equal(savedRunValidation(run).find(check => check.name === "Hermiticity")?.status, "warning");
});

test("cavity norm and Lindblad purity use stored samples",()=>{
  const data=new Uint8Array(16),view=new DataView(data.buffer);
  view.setFloat64(0,0.95,true);view.setFloat64(8,1.2,true);
  const cavity={job:{} as VerifiedSavedRun["job"],data:data.subarray(0,8),
    result:{operation:"cavity",data:{rows:1,columns:["norm"]}} as unknown as VerifiedSavedRun["result"]};
  const lindblad={job:{} as VerifiedSavedRun["job"],data:data.subarray(8,16),
    result:{operation:"lindblad",data:{rows:1,columns:["purity"]}} as unknown as VerifiedSavedRun["result"]};
  assert.equal(savedRunValidation(cavity).find(item=>item.name==="Normalization")?.status,"warning");
  assert.equal(savedRunValidation(lindblad).find(item=>item.name==="Purity bounds")?.status,"warning");
});

test("unresolved topology is not presented as a checked invariant",()=>{
  const run={job:{} as VerifiedSavedRun["job"],data:null,
    result:{operation:"topology",analysis:{kind:"nodal_line_two_band",status:"mesh-unresolved"}} as unknown as VerifiedSavedRun["result"]};
  assert.equal(savedRunValidation(run).find(item=>item.name==="Topological invariant")?.status,"warning");
});
