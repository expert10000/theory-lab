import {_electron as electron} from "playwright";
import assert from "node:assert/strict";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";

const profile=await mkdtemp(join(tmpdir(),"qlab-classd-desktop-"));
const env={...process.env,QLAB_TEST_PROFILE:profile};
delete env.ELECTRON_RUN_AS_NODE;
let desktop;
async function open(){
  desktop=await electron.launch({args:["."],env});
  const page=await desktop.firstWindow();
  await page.getByTestId("worker-status").filter({hasText:"READY"}).waitFor({timeout:45000});
  await page.getByTestId("open-ute2-landau").click();
  await page.getByTestId("ute2-topology-page").waitFor();
  return page;
}
try{
  let page=await open();
  assert.match(await page.getByTestId("ute2-topology-page").textContent(),/No UTe₂ band structure/);
  await page.getByLabel("Class-D delta").fill("-1");
  assert.equal(await page.getByTestId("run-ute2-topology").isDisabled(),true);
  await page.getByLabel("Class-D delta").fill("0.8");
  await page.getByTestId("run-ute2-topology").click();
  await page.getByTestId("ute2-topology-result").waitFor();
  assert.match(await page.getByTestId("ute2-topology-status").textContent(),/defined for this toy and convention.*toy Chern: -1/);
  assert.match(await page.getByTestId("ute2-topology-result").textContent(),/bulk band separation: 1\.60000/);
  const rows=await page.evaluate(()=>window.quantum.listUte2TopologyRuns());
  assert.equal(rows.length,1);assert.equal(rows[0].resultSha256.length,64);
  const runId=rows[0].runId;
  await page.getByLabel("Class-D mu").fill("0");
  await page.getByTestId("run-ute2-topology").click();
  await page.getByTestId("ute2-topology-status").filter({hasText:"withheld: exact bulk gap closed"}).waitFor();
  await page.getByLabel("Class-D mu").fill("0.001");
  await page.getByLabel("Class-D mesh").selectOption("12");
  await page.getByTestId("run-ute2-topology").click();
  await page.getByTestId("ute2-topology-status").filter({hasText:"withheld: mesh or curvature unresolved"}).waitFor();
  await desktop.close();desktop=null;
  page=await open();
  await page.getByRole("button",{name:/Open μ=-2, Δₚ=0\.8 · defined/}).click();
  await page.getByTestId("ute2-topology-result").waitFor();
  assert.match(await page.getByTestId("ute2-topology-result").textContent(),new RegExp(runId));
  const file=join(profile,"ute2-topology-runs",runId,"result.json");
  const changed=JSON.parse(await readFile(file,"utf8"));
  changed.chern=1;
  await writeFile(file,JSON.stringify(changed,null,2)+"\n");
  await page.getByRole("button",{name:/Open μ=-2, Δₚ=0\.8 · defined/}).click();
  await page.getByRole("alert").filter({hasText:"integrity check"}).waitFor();
  assert.equal(await page.getByTestId("ute2-topology-result").count(),0);
  await desktop.close();desktop=null;
  page=await open();
  assert.equal(await page.getByRole("button",{name:/Open μ=-2, Δₚ=0\.8 · defined/}).count(),0);
  console.log(`Class-D desktop gap/convergence/restart/tamper gate verified: ${runId}`);
}finally{if(desktop)await desktop.close();await rm(profile,{recursive:true,force:true});}
