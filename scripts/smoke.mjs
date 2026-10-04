import { _electron as electron } from "playwright";
import assert from "node:assert/strict";
import { mkdir, mkdtemp } from "node:fs/promises";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
async function expandGroup(page,id){
  const group=page.locator(`[data-model-group="${id}"]`);
  if(!(await group.evaluate(element=>element.open)))await group.locator("summary").click();
}
const env = { ...process.env };
env.QLAB_TEST_PROFILE=await mkdtemp(join(tmpdir(),"qlab-desktop-acceptance-"));
delete env.ELECTRON_RUN_AS_NODE;
const app = await electron.launch({ args: ["."], env });
let preservedRunId = null;
let preservedSpectrumRunId = null;
let preservedRerunId = null;
let preservedRabiRunId = null;
const preservedPassageRunIds = {};
const preservedCavityRunIds = {};
const preservedSweepRunIds = {};
const preservedTopologyRunIds = {};
let preservedLindbladRunId = null;
let preservedCircuitRunId = null;
let preservedManyBodyRunId = null;
let preservedIsingStudyId = null;
let preservedStudyId = null;
let preservedMotionRunId = null;
let preservedDriveRunId = null;
let preservedPulseRunId = null;
let preservedOrbitalRunId = null;
const preservedOscillatorRunIds = {};
let preservedComparisonPins = null;
let portableInlineBundle = null;
let portableBinaryBundle = null;
let preservedBinaryRerunId = null;
let portableHashes = null;
const errors = [];
try {
  const page = await app.firstWindow();
  // Some headless Xvfb renderers reject Page.captureScreenshot while DOM and
  // Electron interactions still work. Keep captures for local visual review.
  if (process.env.QLAB_SKIP_SCREENSHOTS === "1") {
    page.screenshot = async () => {};
  }
  page.on("pageerror", (error) => errors.push(error.message));
  await page
    .getByTestId("worker-status")
    .filter({ hasText: "READY" })
    .waitFor({ timeout: 45000 });
  await page
    .getByTestId("result-state")
    .filter({ hasText: "COMPUTED" })
    .waitFor();
  assert.equal(await page.getByTestId("energy-low").textContent(), "-0.640312");
  assert.equal(await page.getByTestId("energy-high").textContent(), "0.640312");
  const workspaceModes=page.getByRole("tablist",{name:/Workspace modes for/});
  const historyBack=page.getByRole("button",{name:"Back",exact:true});
  const historyForward=page.getByRole("button",{name:"Forward",exact:true});
  assert.ok(await historyBack.isDisabled());
  assert.ok(await historyForward.isDisabled());
  assert.deepEqual(await workspaceModes.getByRole("tab").allTextContents(),
    ["Explore","Dynamics","Sweeps","Analysis","Theory","Scenes","Runs"]);
  await workspaceModes.getByRole("tab",{name:"Theory"}).click();
  assert.equal(await page.locator("[data-testid=model-theory] h2").innerText(),"Two-level system");
  assert.match(await page.getByTestId("theory-visual").innerText(),/Conceptual schematic/);
  assert.match(await page.getByRole("img",{name:/Schematic illustration of Two-level system/}).getAttribute("aria-label"),/Two-level system/);
  assert.equal(await page.evaluate(()=>window.location.hash),"#lab/two_level/theory");
  assert.ok(await historyBack.isEnabled());
  await historyBack.click();
  await page.waitForFunction(()=>window.location.hash==="#lab/two_level/spectrum");
  assert.ok(await historyForward.isEnabled());
  await historyForward.click();
  await page.waitForFunction(()=>window.location.hash==="#lab/two_level/theory");
  assert.ok(await page.locator(".dynamics-layout .workspace").evaluate(element=>{
    const workspace=element.getBoundingClientRect(),layout=element.parentElement.getBoundingClientRect();
    return Math.abs(workspace.right-layout.right)<2;
  }),"Theory stretches to the right edge of the desktop layout");
  await workspaceModes.getByRole("tab",{name:"Explore"}).click();
  assert.ok(await historyForward.isDisabled(),"a new route drops the forward branch");
  assert.equal(await workspaceModes.getByRole("tab",{name:"Sweeps"}).isDisabled(),false);
  assert.equal(await page.getByRole("button",{name:/Two-level system/}).getAttribute("aria-pressed"),"true");
  assert.equal(await page.getByRole("navigation",{name:"Model families"}).locator("details").count(),7);
  const lightMatter=page.locator('[data-model-group="light-matter"]');
  await lightMatter.locator("summary").focus();
  await page.keyboard.press("Enter");
  assert.equal(await lightMatter.evaluate(element=>element.open),true,"model groups expand from keyboard");
  await page.keyboard.press("Enter");
  assert.equal(await lightMatter.evaluate(element=>element.open),false,"model groups collapse from keyboard");
  assert.equal(await page.locator(".breadcrumb").innerText().then(text=>text.includes("SPECTRUM")),true);
  assert.equal(await page.getByTestId("workspace-run-id").innerText(),
    (await page.evaluate(()=>window.quantum.listRuns())).find(run=>run.operation==="diagonalize")?.runId);
  const isolation = await page.evaluate(() => ({
    require: typeof window.require,
    process: typeof window.process,
    keys: Object.keys(window.quantum).sort(),
  }));
  assert.deepEqual(isolation, {
    require: "undefined",
    process: "undefined",
    keys: [
      "cancel",
      "cavity",
      "circuit",
      "evolve",
      "exportRun",
      "exportRunBundle",
      "exportScene",
      "exportSceneExample",
      "getCapabilities",
      "getCavityRun",
      "getCircuitRun",
      "getEvolutionRun",
      "getIsingState",
      "getIsingStudy",
      "getLindbladRun",
      "getManyBodyRun",
      "getOrbitalRun",
      "getOscillatorRun",
      "getRabiRun",
      "getResources",
      "getRunComparisonPins",
      "getScene",
      "getSceneExample",
      "getSpectrumRun",
      "getSpectrumStudy",
      "getStatus",
      "getSweepRun",
      "getTopologyRun",
      "getVerifiedRun",
      "importRunBundle",
      "importScene",
      "importSceneStream",
      "inspectSavedRun",
      "lindblad",
      "listIsingStudies",
      "listRuns",
      "listSpectrumStudies",
      "loadWorkspace",
      "manyBody",
      "onProgress",
      "openAtlasSource",
      "orbital",
      "oscillator",
      "oscillatorAnharmonic",
      "oscillatorDamped",
      "oscillatorDrive",
      "oscillatorEvolve",
      "oscillatorParametric",
      "oscillatorPulse",
      "readData",
      "readSceneChunk",
      "releaseSceneStream",
      "rerunSaved",
      "restart",
      "run",
      "saveIsingStudy",
      "saveSpectrumStudy",
      "saveWorkspace",
      "setRunComparisonPins",
      "sweep",
      "topology",
    ],
  });
  const prefs = await app.evaluate(({ BrowserWindow }) => {
    const prefs =
      BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
    return {
      sandbox: prefs.sandbox,
      contextIsolation: prefs.contextIsolation,
      nodeIntegration: prefs.nodeIntegration,
      webSecurity: prefs.webSecurity,
    };
  });
  assert.deepEqual(prefs, {
    sandbox: true,
    contextIsolation: true,
    nodeIntegration: false,
    webSecurity: true,
  });
  assert.equal(await page.evaluate(()=>window.location.hash),"#lab/two_level/spectrum");
  await page.getByRole("button",{name:/Rabi dynamics/}).click();
  await page.waitForFunction(()=>window.location.hash==="#lab/driven_two_level/dynamics");
  await page.evaluate(()=>window.history.back());
  await page.waitForFunction(()=>window.location.hash==="#lab/two_level/spectrum"&&
    document.querySelector('button[aria-pressed="true"]')?.textContent?.includes("Two-level system"));
  await page.evaluate(()=>window.history.forward());
  await page.waitForFunction(()=>window.location.hash==="#lab/driven_two_level/dynamics"&&
    document.querySelector('button[aria-pressed="true"]')?.textContent?.includes("Rabi dynamics"));
  await page.evaluate(()=>window.history.back());
  await page.waitForFunction(()=>window.location.hash==="#lab/two_level/spectrum");
  await page.evaluate(()=>{window.location.hash="#tab/circuit";});
  await page.waitForFunction(()=>window.location.hash==="#tab/circuit"&&
    document.querySelector('button[aria-pressed="true"]')?.textContent?.includes("Transmon circuit"));
  await page.evaluate(()=>window.history.back());
  await page.waitForFunction(()=>window.location.hash==="#lab/two_level/spectrum"&&
    document.querySelector('button[aria-pressed="true"]')?.textContent?.includes("Two-level system"));
  await mkdir("artifacts",{recursive:true});
  await page.locator("#delta-slider").focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.locator("#delta").inputValue(),await page.locator("#delta-slider").inputValue(),
    "coarse slider and exact draft share one value");
  await page.locator("#delta").fill("100");
  assert.equal(await page.locator("#delta-slider").count(),0,"out-of-range exact input is not clamped");
  await page.locator("#delta").fill("1");
  await page.getByRole("button",{name:"Select upper energy E plus"}).click();
  assert.equal(await page.getByRole("button",{name:"Select upper energy E plus"}).getAttribute("aria-pressed"),"true");
  assert.match(await page.getByTestId("scientific-selection").innerText(),/E₊ = 0\.640312/);
  assert.match(await page.getByTestId("scientific-selection").innerText(),/Verified \|ψ⟩/);
  assert.match(await page.getByTestId("scientific-reference-coordinate").innerText(),/Stored energy level 1/);
  assert.equal(await page.getByTestId("scientific-reference-run").getAttribute("title"),await page.getByTestId("workspace-run-id").innerText());
  const stateView=page.getByTestId("two-level-state-view");
  assert.ok(await stateView.isVisible());
  assert.match(await page.getByTestId("state-view-run-matrix").innerText(),/0\.400000/);
  assert.match(await page.getByTestId("state-view-details").innerText(),/P0 · \|0⟩/);
  assert.equal(await page.getByTestId("bloch-select-1").getAttribute("aria-pressed"),"true");
  const xLow=Number(await page.getByTestId("bloch-select-0").getAttribute("data-bloch-x"));
  const xHigh=Number(await page.getByTestId("bloch-select-1").getAttribute("data-bloch-x"));
  assert.ok(Math.abs(xLow+xHigh)<1e-9,"verified eigenstates are antipodal");
  await page.getByTestId("bloch-select-0").focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.getByRole("button",{name:"Select lower energy E minus"}).getAttribute("aria-pressed"),"true");
  await page.getByTestId("bloch-select-1").click();
  const inspectorTabs=page.getByRole("navigation",{name:"Model inspector views"});
  await inspectorTabs.getByRole("button",{name:"Observables"}).click();
  assert.match(await page.getByTestId("observable-inspector").innerText(),/Populations P₀ \/ P₁/);
  assert.match(await page.getByTestId("observable-inspector").innerText(),/‖Hψ − Eψ‖/);
  await inspectorTabs.getByRole("button",{name:"Provenance"}).click();
  assert.match(await page.locator(".inspector").innerText(),/Δ \/ Ω · stored/);
  await inspectorTabs.getByRole("button",{name:"Parameters"}).click();
  await page.screenshot({path:"artifacts/desktop-linked-energy.png",fullPage:true});
  await page.getByRole("tab",{name:"Analysis",exact:true}).click();
  assert.match(await page.getByTestId("scientific-selection").innerText(),/E₊ = 0\.640312/);
  assert.match(await page.getByTestId("state-view-details").innerText(),/E₊ · VERIFIED RUN STATE/);
  await page.getByRole("button",{name:"Select sigma x operator"}).click();
  assert.match(await page.getByTestId("scientific-selection").innerText(),/σx · Pauli matrix/);
  assert.equal(await page.getByLabel("Sigma x matrix").locator("span").count(),4);
  assert.equal(await page.locator(".matrix-selected").count(),2);
  await page.screenshot({path:"artifacts/desktop-linked-operator.png",fullPage:true});
  await page.getByRole("button",{name:"Select transverse coupling Omega"}).click();
  assert.equal(await page.locator("#omega").evaluate(element=>document.activeElement===element),true);
  assert.match(await page.getByTestId("scientific-selection").innerText(),/Draft value:/);
  await page.getByRole("tab",{name:"Explore",exact:true}).click();
  await page.getByRole("button",{name:"Select lower energy E minus"}).focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.getByRole("button",{name:"Select lower energy E minus"}).getAttribute("aria-pressed"),"true");
  const selectedRunId=await page.getByTestId("workspace-run-id").innerText();
  await page.locator("#omega").fill("0.9");
  await page.getByTestId("result-state").filter({hasText:"OUT OF DATE"}).waitFor();
  assert.match(await page.getByTestId("scientific-selection").innerText(),/E₋ = -0\.640312/);
  assert.match(await stateView.innerText(),/SAVED RUN · DRAFT CHANGED/);
  assert.match(await page.getByTestId("state-view-run-matrix").innerText(),/0\.400000/,"stored-run matrix is unaffected by the edited draft");
  await page.getByRole("button",{name:"Restore smoke values"}).click();
  await page.getByRole("button",{name:/Run spectrum/}).click();
  await page.waitForFunction(oldRunId=>document.querySelector('[data-testid="workspace-run-id"]')?.textContent!==oldRunId,selectedRunId);
  assert.equal(await page.getByTestId("scientific-selection").count(),0,"new verified run clears old run-scoped selection");
  assert.equal(await page.getByTestId("state-view-prompt").count(),1,"new run starts with no selected state");
  preservedSpectrumRunId=await page.getByTestId("workspace-run-id").innerText();
  await page.getByRole("button",{name:"Select upper energy E plus"}).click();
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  await page.getByRole("button",{name:`Inspect provenance ${preservedSpectrumRunId}`}).click();
  await page.getByTestId("run-provenance").waitFor();
  const sourceInspection=await page.evaluate(id=>window.quantum.inspectSavedRun(id),preservedSpectrumRunId);
  assert.equal(sourceInspection.preflight.ready,true);
  assert.match(await page.getByTestId("run-provenance").innerText(),/Job SHA-256/);
  const beforeRerun=await page.evaluate(()=>window.quantum.listRuns().then(r=>r.length));
  assert.ok(await page.evaluate(async id=>{try{await window.quantum.rerunSaved(id,"0".repeat(64));return false;}catch{return true;}},preservedSpectrumRunId),
    "unreviewed or stale environment fingerprints cannot dispatch a rerun");
  assert.equal(await page.evaluate(()=>window.quantum.listRuns().then(r=>r.length)),beforeRerun);
  await page.getByTestId("rerun-saved").click();
  await page.getByRole("status").filter({hasText:"New saved run"}).waitFor();
  const rerunSummary=await page.evaluate(parent=>window.quantum.listRuns().then(r=>r.find(v=>v.parentRunId===parent)),preservedSpectrumRunId);
  assert.ok(rerunSummary&&rerunSummary.runId!==preservedSpectrumRunId);
  preservedRerunId=rerunSummary.runId;
  const rerunPair=await page.evaluate(async ids=>Promise.all(ids.map(id=>window.quantum.getVerifiedRun(id))),[preservedSpectrumRunId,preservedRerunId]);
  assert.deepEqual({...rerunPair[1].job,jobId:rerunPair[0].job.jobId},rerunPair[0].job,
    "rerun reconstructs exact stored inputs apart from new job identity");
  await page.getByRole("button",{name:`Pin A ${preservedSpectrumRunId}`}).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button",{name:`Pin B ${selectedRunId}`}).click();
  preservedComparisonPins={a:preservedSpectrumRunId,b:selectedRunId};
  await page.getByTestId("open-comparison").click();
  await page.getByTestId("comparison-status").filter({hasText:"Aligned"}).waitFor();
  assert.match(await page.getByTestId("comparison-context").innerText(),/Stored gap \/ transition.*Level gap/s);
  assert.match(await page.getByTestId("comparison-context").innerText(),/Backend and runtime/);
  assert.match(await page.getByTestId("comparison-science").innerText(),/Δ = B − A, with no interpolation/);
  assert.equal(await page.getByTestId("comparison-delta").innerText(),"0.000000");
  assert.match(await page.getByTestId("comparison-inputs").innerText(),/model.parameters.delta/);
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  await page.getByRole("button",{name:`Open spectrum ${preservedSpectrumRunId}`}).scrollIntoViewIfNeeded();
  await page.screenshot({path:"artifacts/desktop-reopen-spectrum.png",fullPage:true});
  await page.getByRole("button",{name:`Open spectrum ${preservedSpectrumRunId}`}).click();
  await page.getByTestId("workspace-run-id").filter({hasText:preservedSpectrumRunId}).waitFor();
  assert.match(await page.getByTestId("scientific-selection").innerText(),/E₊ = 0\.640312/,
    "a verified selection survives reopening its exact source run");
  assert.match(await page.getByTestId("state-view-details").innerText(),/E₊ · VERIFIED RUN STATE/);
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  await page.getByRole("button",{name:`Open spectrum ${selectedRunId}`}).click();
  await page.getByTestId("workspace-run-id").filter({hasText:selectedRunId}).waitFor();
  assert.match(await page.getByTestId("scientific-selection").innerText(),/E₋ = -0\.640312/,
    "reopening the older run restores its own level, not the newer run's selection");
  await page.getByRole("button",{name:"Select upper energy E plus"}).click();
  await page.getByRole("button",{name:/Rabi dynamics/}).click();
  assert.equal(await page.getByTestId("two-level-state-view").count(),0,"a two-level Bloch view is not fabricated for dynamics models");
  await page.getByRole("button",{name:/Two-level system/}).click();
  assert.equal(await page.getByTestId("scientific-selection").count(),0,"model change invalidates selection");
  await page.getByRole("tab",{name:"Sweeps",exact:true}).click();
  await page.getByTestId("spectrum-study-lab").waitFor();
  assert.match(await page.getByTestId("spectrum-study-lab").innerText(),/not the final-state probability/);
  await page.getByLabel("Study points").fill("3");
  await page.getByLabel("Study engine").selectOption("native");
  await page.getByTestId("run-spectrum-study").click();
  await page.getByTestId("spectrum-study-status").filter({hasText:"Study complete"}).waitFor();
  assert.match(await page.getByTestId("spectrum-study-progress").innerText(),/3\/3 verified points/);
  await page.screenshot({path:"artifacts/desktop-spectrum-study.png",fullPage:true});
  await page.getByRole("button",{name:/Select energy sample 1,/}).click();
  const studyRunId=await page.getByTestId("spectrum-study-selection").locator("code").innerText();
  await page.getByRole("button",{name:"Use as parameter draft"}).click();
  assert.equal(await page.locator("#delta").inputValue(),"-2");
  assert.equal(await page.getByTestId("result-state").innerText(),"AWAITING WORKER");
  await page.getByRole("tab",{name:"Sweeps",exact:true}).click();
  await page.getByRole("button",{name:/Select energy sample 1,/}).click();
  await page.getByRole("button",{name:"Open verified spectrum"}).click();
  await page.getByTestId("workspace-run-id").filter({hasText:studyRunId}).waitFor();
  assert.equal(await page.locator("#delta").inputValue(),"-2");
  await page.getByRole("tab",{name:"Sweeps",exact:true}).click();
  await page.getByTestId("save-workspace").click();
  await page.getByLabel("Study points").fill("5");
  await page.getByTestId("restore-workspace").click();
  await page.waitForFunction(()=>document.querySelector('input[aria-label="Study points"]')?.value==="3");
  assert.equal(await page.evaluate(()=>window.location.hash),"#lab/two_level/sweep");
  assert.equal(await page.getByTestId("spectrum-study-chart").count(),0,"workspace restore carries inputs, not stale study results");
    const studyId=(await page.evaluate(()=>window.quantum.listSpectrumStudies()))
      .find(study=>study.status==="completed"&&study.totalPoints===3)?.studyId;
    assert.ok(studyId,"completed study is present in durable manifest list");
    preservedStudyId=studyId;
    await page.getByTestId(`open-study-${studyId}`).click();
    await page.getByTestId("spectrum-study-status").filter({hasText:"Verified saved study reopened"}).waitFor();
    assert.equal(await page.getByTestId("spectrum-study-chart").count(),1,"verified study can be reopened separately from workspace inputs");
    assert.match(await page.getByTestId("spectrum-study-progress").innerText(),/3\/3 verified points/);
  await page.getByRole("combobox",{name:"Study axis"}).selectOption("omega");
  await page.getByRole("spinbutton",{name:"Study fixed Delta"}).fill("0.4");
  await page.getByTestId("run-spectrum-study").click();
  await page.getByTestId("spectrum-study-status").filter({hasText:"Study complete"}).waitFor();
  assert.match(await page.getByTestId("spectrum-study-selection").innerText(),/Δ = 0\.400000/);
  const omegaStudy=(await page.evaluate(()=>window.quantum.listSpectrumStudies())).find(study=>"fixedDelta" in study&&study.fixedDelta===.4);
  assert.ok(omegaStudy,"versioned Ω study is listed separately from legacy Δ studies");
  await page.getByTestId(`open-study-${omegaStudy.studyId}`).click();
  await page.getByTestId("spectrum-study-status").filter({hasText:"Verified saved study reopened"}).waitFor();
  assert.equal(await page.getByRole("combobox",{name:"Study axis"}).inputValue(),"omega");
  const omegaPointId=await page.getByTestId("spectrum-study-selection").locator("code").innerText();
  await page.getByRole("button",{name:"Open verified spectrum"}).click();
  await page.getByTestId("workspace-run-id").filter({hasText:omegaPointId}).waitFor();
  await page.getByRole("tab",{name:"Sweeps",exact:true}).click();
  await page.getByRole("combobox",{name:"Study axis"}).selectOption("delta");
  await page.getByRole("tab",{name:"Explore",exact:true}).click();
  await page.getByRole("button",{name:"Restore smoke values"}).click();
  await page.getByRole("button",{name:/Run spectrum/}).click();
  await page.getByTestId("energy-low").filter({hasText:"-0.640312"}).waitFor();
  const circuit = await page.evaluate(() => window.quantum.circuit({
    schema: "quantum-job/v1", jobId: `circuit-${crypto.randomUUID()}`, operation: "circuit", engine: "native",
    model: { type: "transmon", parameters: { EJ: 20, EC: 0.25, ng: 0.2, ncut: 12, levels: 5 } },
  }));
  assert.equal(circuit.operation, "circuit");
  assert.ok(circuit.spectrum.e01 > 0 && circuit.spectrum.cutoffDriftE01 < 1e-4);
  assert.equal(await page.evaluate(async id=>{try{await window.quantum.getSpectrumRun(id);return false;}catch{return true;}},circuit.runId),true);
  assert.equal(await page.evaluate(async()=>{try{await window.quantum.getSpectrumRun("../other");return false;}catch{return true;}}),true);
  const rejected = await page.evaluate(async () => {
    try {
      await window.quantum.run({ schema: "quantum-job/v2" });
      return false;
    } catch {
      return true;
    }
  });
  assert.ok(rejected, "IPC must validate renderer input");
  await expandGroup(page,"atomic-continuous");
  await page.getByTestId("open-oscillator").click();
  await page.getByTestId("open-atlas").click();
  await page.getByLabel("Search Atlas").fill("harmonic_oscillator");
  await page.getByRole("button",{name:/^Quantum harmonic oscillator harmonic_oscillator/}).click();
  await page.getByTestId("open-atlas-binding").click();
  assert.ok(await page.getByTestId("oscillator-lab").isVisible());
  assert.equal(await page.getByLabel("Oscillator omega",{exact:true}).inputValue(),"1");
  await page.getByTestId("run-oscillator").click();
  await page.getByTestId("oscillator-state").filter({hasText:"COMPLETE"}).waitFor();
  preservedOscillatorRunIds.oscillator=await page.getByTestId("workspace-run-id").innerText();
  await page.getByRole("button",{name:"Select oscillator E1"}).click();
  await page.getByTestId("oscillator-inspector-value").waitFor();
  assert.match(await page.getByTestId("oscillator-inspector-selection").innerText(),/No spatial state was stored/);
  assert.equal(await page.getByTestId("oscillator-e0").innerText(),"0.500000");
  assert.ok(await page.getByTestId("oscillator-compare").isVisible());
  assert.ok(await page.getByRole("img",{name:"Oscillator stationary density and real amplitude"}).isVisible());
  await page.getByLabel("Oscillator points",{exact:true}).fill("200");
  assert.ok(await page.getByTestId("run-oscillator").isDisabled());
  await page.getByLabel("Oscillator points",{exact:true}).fill("201");
  await page.getByLabel("Oscillator state",{exact:true}).fill("2");
  await page.getByTestId("oscillator-result").getByText("OUT OF DATE").waitFor();
  await page.getByTestId("run-oscillator").click();
  await page.getByTestId("oscillator-state").filter({hasText:"COMPLETE"}).waitFor();
  assert.equal(await page.getByTestId("oscillator-variance").innerText(),"2.500000");
  await page.screenshot({path:"artifacts/desktop-oscillator.png",fullPage:true});
  await page.getByRole("img",{name:"Oscillator stationary density and real amplitude"}).scrollIntoViewIfNeeded();
  await page.screenshot({path:"artifacts/desktop-oscillator-density.png",fullPage:true});
  await page.getByTestId("save-workspace").click();
  await page.getByTestId("workspace-message").filter({hasText:"Workspace saved"}).waitFor();
  await page.getByLabel("Oscillator state",{exact:true}).fill("1");
  await page.getByTestId("restore-workspace").click();
  await page.waitForFunction(()=>document.querySelector('input[aria-label="Oscillator state"]')?.value==="2");
  await page.getByRole("tab",{name:"Free dynamics",exact:true}).click();
  const initialMotionRuns=await page.evaluate(()=>window.quantum.listRuns().then(r=>r.filter(v=>v.operation==="oscillator_evolve").length));
  await page.getByLabel("Motion points",{exact:true}).fill("200");
  assert.ok(await page.getByTestId("run-oscillator-motion").isDisabled());
  await page.getByLabel("Motion points",{exact:true}).fill("201");
  await page.getByTestId("run-oscillator-motion").click();
  await page.getByTestId("oscillator-motion-state").filter({hasText:"COMPLETE"}).waitFor();
  preservedOscillatorRunIds.oscillator_evolve=await page.getByTestId("workspace-run-id").innerText();
  assert.equal(await page.getByTestId("motion-q").innerText(),"1.414214");
  assert.ok(await page.getByTestId("oscillator-motion-compare").isVisible());
  assert.ok(Number(await page.getByTestId("motion-compare-q").innerText())<1e-7);
  await page.getByLabel("Oscillator motion time cursor",{exact:true}).fill("50");
  await page.getByTestId("oscillator-inspector-q_mean").waitFor();
  assert.equal(await page.getByTestId("oscillator-inspector-q_mean").innerText(),await page.getByTestId("motion-q").innerText());
  assert.ok(Math.abs(Number(await page.getByTestId("motion-q").innerText()))<1e-6);
  assert.equal(await page.getByTestId("motion-p").innerText(),"-1.414214");
  await page.getByRole("img",{name:"Moving oscillator density",exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:"artifacts/desktop-oscillator-motion.png",fullPage:true});
  await page.getByLabel("Motion engine",{exact:true}).selectOption("native");
  await page.getByLabel("Motion alphaRe",{exact:true}).fill("2");
  await page.getByLabel("Motion cutoff",{exact:true}).fill("8");
  await page.getByTestId("motion-result-state").filter({hasText:"OUT OF DATE"}).waitFor();
  await page.getByTestId("run-oscillator-motion").click();
  await page.getByTestId("oscillator-motion-state").filter({hasText:"COMPLETE"}).waitFor();
  assert.ok(await page.getByTestId("motion-truncation-warning").isVisible());
  assert.ok(Number(await page.getByTestId("motion-omitted").innerText())>.05);
  await page.getByLabel("Motion engine",{exact:true}).selectOption("qutip");
  await page.getByLabel("Motion cutoff",{exact:true}).fill("64");
  await page.getByLabel("Motion stop",{exact:true}).fill("100");
  await page.getByLabel("Motion samples",{exact:true}).fill("1001");
  // Cancel through the visible UI immediately after React renders its running state.
  await page.evaluate(async()=>{
    document.querySelector('[data-testid="run-oscillator-motion"]').click();
    await new Promise(requestAnimationFrame);
    const cancel=document.querySelector('[data-testid="cancel-oscillator-motion"]');
    if(!cancel)throw new Error("Missing oscillator cancellation UI");cancel.click();
  });
  await page.getByTestId("oscillator-motion-state").filter({hasText:"CANCELLED"}).waitFor();
  assert.ok(await page.getByRole("img",{name:"Moving oscillator density",exact:true}).isVisible(),"last verified plot survives cancellation");
  const beforeCancelRuns=await page.evaluate(()=>window.quantum.listRuns());
  assert.equal(beforeCancelRuns.filter(r=>r.operation==="oscillator_evolve").length,initialMotionRuns+3,"cancelled work creates no fourth saved motion run");
  await page.getByTestId("save-workspace").click();
  await page.getByTestId("workspace-message").filter({hasText:"Workspace saved"}).waitFor();
  await page.getByLabel("Motion alphaRe",{exact:true}).fill("1");
  await page.getByRole("tab",{name:"Stationary spectrum",exact:true}).click();
  await page.getByTestId("restore-workspace").click();
  await page.waitForFunction(()=>document.querySelector('input[aria-label="Motion alphaRe"]')?.value==="2");
  assert.equal(await page.getByRole("tab",{name:"Free dynamics",exact:true}).getAttribute("aria-selected"),"true");
  assert.equal(await page.getByLabel("Motion samples",{exact:true}).inputValue(),"1001");
  assert.equal(await page.getByTestId("oscillator-motion-result").count(),0,"workspace restores inputs, never an unverified plot");
  await page.getByRole("tab",{name:"Stationary spectrum",exact:true}).click();
  assert.equal(await page.getByLabel("Oscillator state",{exact:true}).inputValue(),"2");
  await page.getByRole("tab",{name:"Free dynamics",exact:true}).click();
  await page.getByTestId("open-atlas").click();
  await page.getByLabel("Search Atlas").fill("driven_harmonic_oscillator");
  await page.getByRole("button",{name:/^Linearly driven harmonic oscillator driven_harmonic_oscillator/}).click();
  await page.getByTestId("open-atlas-binding").click();
  await page.getByRole("tab",{name:"Driven dynamics",exact:true}).and(page.locator('[aria-selected="true"]')).waitFor();
  assert.equal(await page.getByRole("tab",{name:"Driven dynamics",exact:true}).getAttribute("aria-selected"),"true");
  assert.equal(await page.getByLabel("Drive epsilonRe",{exact:true}).inputValue(),"0.2");
  const initialDriveRuns=await page.evaluate(()=>window.quantum.listRuns().then(r=>r.filter(v=>v.operation==="oscillator_drive").length));
  await page.getByRole("tab",{name:"Driven dynamics",exact:true}).click();
  await page.getByLabel("Drive epsilonRe",{exact:true}).fill(".5");
  await page.getByLabel("Drive epsilonIm",{exact:true}).fill(".5");
  assert.ok(await page.getByTestId("run-oscillator-drive").isDisabled());
  await page.getByLabel("Drive epsilonRe",{exact:true}).fill(".2");
  await page.getByLabel("Drive epsilonIm",{exact:true}).fill("0");
  await page.getByTestId("run-oscillator-drive").click();
  await page.getByTestId("oscillator-drive-state").filter({hasText:"COMPLETE"}).waitFor();
  preservedOscillatorRunIds.oscillator_drive=await page.getByTestId("workspace-run-id").innerText();
  assert.ok(await page.getByTestId("oscillator-drive-compare").isVisible());
  assert.ok(Number(await page.getByTestId("drive-compare-q").innerText())<1e-7);
  await page.getByRole("slider",{name:"Driven oscillator time cursor"}).fill("50");
  await page.getByTestId("oscillator-inspector-time").waitFor();
  assert.equal(await page.getByTestId("drive-number").innerText(),"0.098696");
  assert.equal(await page.getByTestId("drive-energy").innerText(),"0.598696");
  await page.getByRole("img",{name:"Driven oscillator occupation",exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:"artifacts/desktop-oscillator-drive.png",fullPage:true});
  await page.getByLabel("Drive engine",{exact:true}).selectOption("native");
  await page.getByLabel("Drive epsilonRe",{exact:true}).fill(".4");
  await page.getByLabel("Drive cutoff",{exact:true}).fill("8");
  await page.getByTestId("drive-result-state").filter({hasText:"OUT OF DATE"}).waitFor();
  await page.getByTestId("run-oscillator-drive").click();
  await page.getByTestId("oscillator-drive-state").filter({hasText:"COMPLETE"}).waitFor();
  assert.ok(await page.getByTestId("drive-truncation-warning").isVisible());
  assert.ok(Number(await page.getByTestId("drive-number-error").innerText())>.5);
  await page.getByLabel("Drive engine",{exact:true}).selectOption("qutip");
  await page.getByLabel("Drive cutoff",{exact:true}).fill("64");
  await page.getByLabel("Drive stop",{exact:true}).fill("10");
  await page.getByLabel("Drive samples",{exact:true}).fill("1001");
  await page.evaluate(async()=>{document.querySelector('[data-testid="run-oscillator-drive"]').click();await new Promise(resolve=>requestAnimationFrame(resolve));const cancel=document.querySelector('[data-testid="cancel-oscillator-drive"]');if(!cancel)throw new Error("Missing drive cancellation UI");cancel.click();});
  await page.getByTestId("oscillator-drive-state").filter({hasText:"CANCELLED"}).waitFor();
  assert.ok(await page.getByRole("img",{name:"Driven oscillator occupation",exact:true}).isVisible());
  assert.equal(await page.evaluate(()=>window.quantum.listRuns().then(r=>r.filter(v=>v.operation==="oscillator_drive").length)),initialDriveRuns+3,"cancelled drive is never saved");
  await page.getByTestId("save-workspace").click();
  await page.getByTestId("workspace-message").filter({hasText:"Workspace saved"}).waitFor();
  await page.getByLabel("Drive epsilonRe",{exact:true}).fill(".1");
  await page.getByRole("tab",{name:"Stationary spectrum",exact:true}).click();
  await page.getByTestId("restore-workspace").click();
  await page.waitForFunction(()=>document.querySelector('input[aria-label="Drive epsilonRe"]')?.value===".4");
  assert.equal(await page.getByRole("tab",{name:"Driven dynamics",exact:true}).getAttribute("aria-selected"),"true");
  assert.equal(await page.getByLabel("Drive samples",{exact:true}).inputValue(),"1001");
  assert.equal(await page.getByTestId("oscillator-drive-result").count(),0);
  await page.getByRole("tab",{name:"Gaussian pulse",exact:true}).click();
  await page.getByTestId("pulse-preset").click();
  assert.match(await page.getByTestId("oscillator-pulse-state").innerText(),/LAB PRESET/);
  const initialPulseRuns=await page.evaluate(()=>window.quantum.listRuns().then(r=>r.filter(v=>v.operation==="oscillator_pulse").length));
  await page.getByLabel("Pulse pulseWidth",{exact:true}).fill(".05");
  assert.ok(await page.getByTestId("run-oscillator-pulse").isDisabled(),"a narrow pulse requires a resolved internal step");
  await page.getByLabel("Pulse pulseWidth",{exact:true}).fill("1");
  await page.getByTestId("run-oscillator-pulse").click();
  await page.getByTestId("oscillator-pulse-state").filter({hasText:"COMPLETE"}).waitFor();
  preservedOscillatorRunIds.oscillator_pulse=await page.getByTestId("workspace-run-id").innerText();
  assert.ok(Number(await page.getByTestId("pulse-compare-q").innerText())<1e-7);
  await page.getByRole("slider",{name:"Pulsed oscillator time cursor"}).fill("100");
  assert.equal(await page.getByTestId("pulse-number").innerText(),"0.062832");
  assert.ok(await page.getByRole("img",{name:"Gaussian pulse drive",exact:true}).isVisible());
  assert.match(await page.getByTestId("pulse-endpoint-tails").innerText(),/3.727e-6/);
  await page.getByLabel("Pulse alphaRe",{exact:true}).fill("1.8");
  await page.getByLabel("Pulse epsilonRe",{exact:true}).fill(".5");
  await page.getByLabel("Pulse pulseWidth",{exact:true}).fill("1.5");
  await page.getByLabel("Pulse cutoff",{exact:true}).fill("8");
  await page.getByLabel("Pulse engine",{exact:true}).selectOption("native");
  await page.getByTestId("study-oscillator-pulse").click();
  await page.getByTestId("pulse-convergence").waitFor();
  assert.ok(Number(await page.getByTestId("pulse-cutoff-q").innerText())>1e-5);
  assert.ok(Number(await page.getByTestId("pulse-step-q").innerText())<1e-7);
  assert.ok(await page.getByTestId("pulse-truncation-warning").isVisible());
  await page.getByRole("img",{name:"Gaussian pulse drive",exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:"artifacts/desktop-oscillator-pulse.png",fullPage:true});
  await page.getByLabel("Pulse cutoff",{exact:true}).fill("64");
  await page.getByLabel("Pulse samples",{exact:true}).fill("1001");
  await page.evaluate(async()=>{document.querySelector('[data-testid="run-oscillator-pulse"]').click();await new Promise(resolve=>requestAnimationFrame(resolve));const cancel=document.querySelector('[data-testid="cancel-oscillator-pulse"]');if(!cancel)throw new Error("Missing pulse cancellation UI");cancel.click();});
  await page.getByTestId("oscillator-pulse-state").filter({hasText:"CANCELLED"}).waitFor();
  assert.ok(await page.getByTestId("pulse-convergence").isVisible(),"cancelled study/run retains the last verified comparison");
  assert.equal(await page.evaluate(()=>window.quantum.listRuns().then(r=>r.filter(v=>v.operation==="oscillator_pulse").length)),initialPulseRuns+5,"cancelled incomplete pulse is not saved");
  for(const [key,value] of Object.entries({epsilonRe:".3",epsilonIm:".1",alphaRe:"1.4",cutoff:"32",pulseWidth:"1.25",pulseCenter:"4",maxStep:".01",start:"-2",stop:"8",samples:"101"}))await page.getByLabel(`Pulse ${key}`,{exact:true}).fill(value);
  await page.getByLabel("Pulse engine",{exact:true}).selectOption("qutip");
  await page.getByTestId("save-workspace").click();
  await page.getByTestId("workspace-message").filter({hasText:"Workspace saved"}).waitFor();
  await page.getByLabel("Pulse pulseWidth",{exact:true}).fill("2");
  await page.getByRole("tab",{name:"Stationary spectrum",exact:true}).click();
  await page.getByTestId("restore-workspace").click();
  await page.waitForFunction(()=>document.querySelector('input[aria-label="Pulse pulseWidth"]')?.value==="1.25");
  await page.getByRole("tab",{name:"Gaussian pulse",exact:true}).and(page.locator('[aria-selected="true"]')).waitFor();
  assert.equal(await page.getByLabel("Pulse maxStep",{exact:true}).inputValue(),".01");
  assert.equal(await page.getByTestId("oscillator-pulse-result").count(),0,"pulse restore does not fabricate a plot or convergence study");
  assert.equal(await page.getByTestId("pulse-convergence").count(),0);
  await page.getByRole("tab",{name:"Damped / thermal",exact:true}).click();
  const initialDampedRuns=await page.evaluate(()=>window.quantum.listRuns().then(r=>r.filter(v=>v.operation==="oscillator_damped").length));
  await page.getByTestId("run-damped").click();
  await page.getByTestId("damped-result").waitFor();
  preservedOscillatorRunIds.oscillator_damped=await page.getByTestId("workspace-run-id").innerText();
  await page.getByRole("slider",{name:"Damped time cursor"}).fill("5");
  assert.match(await page.getByTestId("damped-selected-row").innerText(),/purity/);
  await page.getByTestId("oscillator-inspector-purity").waitFor();
  assert.ok(await page.getByRole("img",{name:"Damped oscillator number and purity curves",exact:true}).isVisible());
  await page.getByTestId("damped-cutoff").click();
  await page.getByTestId("damped-comparison").waitFor();
  assert.match(await page.getByTestId("damped-comparison").innerText(),/N 8 → 12/);
  await page.getByLabel("Damped initial state",{exact:true}).selectOption("coherent");
  await page.getByLabel("Damped alphaRe",{exact:true}).fill(".7");
  await page.getByLabel("Damped engine",{exact:true}).selectOption("compare");
  await page.getByTestId("run-damped").click();
  await page.getByTestId("damped-comparison").filter({hasText:"QuTiP ↔ native"}).waitFor();
  assert.equal(await page.evaluate(()=>window.quantum.listRuns().then(r=>r.filter(v=>v.operation==="oscillator_damped").length)),initialDampedRuns+5);
  await page.getByTestId("save-workspace").click();
  await page.getByTestId("workspace-message").filter({hasText:"Workspace saved"}).waitFor();
  await page.getByLabel("Damped loss",{exact:true}).fill(".5");
  await page.getByRole("tab",{name:"Stationary spectrum",exact:true}).click();
  await page.getByTestId("restore-workspace").click();
  await page.waitForFunction(()=>document.querySelector('input[aria-label="Damped loss"]')?.value==="0.25");
  assert.equal(await page.getByRole("tab",{name:"Damped / thermal",exact:true}).getAttribute("aria-selected"),"true");
  assert.equal(await page.getByTestId("damped-result").count(),0,"restore must not fabricate computed density matrices");
  await page.getByRole("tab",{name:"Parametric squeezing",exact:true}).click();
  const initialParametricRuns=await page.evaluate(()=>window.quantum.listRuns().then(r=>r.filter(v=>v.operation==="oscillator_parametric").length));
  await page.getByLabel("Parametric engine",{exact:true}).selectOption("native");
  await page.getByTestId("run-parametric").click();
  await page.getByTestId("parametric-result").waitFor();
  preservedOscillatorRunIds.oscillator_parametric=await page.getByTestId("workspace-run-id").innerText();
  await page.getByRole("slider",{name:"Parametric time cursor"}).fill("5");
  assert.match(await page.getByTestId("parametric-selected-row").innerText(),/Δq²/);
  await page.getByTestId("oscillator-inspector-q_variance").waitFor();
  assert.ok(await page.getByRole("img",{name:"Parametric oscillator squeezing curves",exact:true}).isVisible());
  await page.getByTestId("parametric-cutoff").click();
  await page.getByTestId("parametric-comparison").filter({hasText:"N 16 → 24"}).waitFor();
  await page.getByLabel("Parametric engine",{exact:true}).selectOption("compare");
  await page.getByTestId("run-parametric").click();
  await page.getByTestId("parametric-comparison").filter({hasText:"QuTiP ↔ native"}).waitFor();
  assert.equal(await page.evaluate(()=>window.quantum.listRuns().then(r=>r.filter(v=>v.operation==="oscillator_parametric").length)),initialParametricRuns+5);
  await page.getByTestId("save-workspace").click();
  await page.getByTestId("workspace-message").filter({hasText:"Workspace saved"}).waitFor();
  await page.getByLabel("Parametric lambdaRe",{exact:true}).fill(".2");
  await page.getByRole("tab",{name:"Stationary spectrum",exact:true}).click();
  await page.getByTestId("restore-workspace").click();
  await page.waitForFunction(()=>document.querySelector('input[aria-label="Parametric lambdaRe"]')?.value===".1");
  assert.equal(await page.getByRole("tab",{name:"Parametric squeezing",exact:true}).getAttribute("aria-selected"),"true");
  assert.equal(await page.getByTestId("parametric-result").count(),0,"restore must not fabricate squeezing data");
  await page.getByRole("tab",{name:"Quartic anharmonic",exact:true}).click();
  const initialQuarticRuns=await page.evaluate(()=>window.quantum.listRuns().then(r=>r.filter(v=>v.operation==="oscillator_anharmonic").length));
  await page.getByLabel("Anharmonic engine",{exact:true}).selectOption("native");
  await page.getByTestId("run-anharmonic").click();
  await page.getByTestId("anharmonic-result").waitFor();
  preservedOscillatorRunIds.oscillator_anharmonic=await page.getByTestId("workspace-run-id").innerText();
  await page.getByRole("button",{name:"Select quartic E1"}).click();
  await page.getByTestId("oscillator-inspector-value").waitFor();
  assert.match(await page.getByTestId("oscillator-inspector-selection").innerText(),/not a stored spatial wavefunction/);
  assert.ok(await page.getByRole("img",{name:"Quartic and harmonic energy ladder",exact:true}).isVisible());
  await page.getByTestId("anharmonic-cutoff").click();
  await page.getByTestId("anharmonic-comparison").filter({hasText:"N 20 → 28"}).waitFor();
  await page.getByLabel("Anharmonic engine",{exact:true}).selectOption("compare");
  await page.getByTestId("run-anharmonic").click();
  await page.getByTestId("anharmonic-comparison").filter({hasText:"QuTiP ↔ native"}).waitFor();
  assert.equal(await page.evaluate(()=>window.quantum.listRuns().then(r=>r.filter(v=>v.operation==="oscillator_anharmonic").length)),initialQuarticRuns+5);
  await page.getByTestId("save-workspace").click();
  await page.getByTestId("workspace-message").filter({hasText:"Workspace saved"}).waitFor();
  await page.getByLabel("Anharmonic lambda",{exact:true}).fill(".08");
  await page.getByRole("tab",{name:"Stationary spectrum",exact:true}).click();
  await page.getByTestId("restore-workspace").click();
  await page.waitForFunction(()=>document.querySelector('input[aria-label="Anharmonic lambda"]')?.value===".05");
  assert.equal(await page.getByRole("tab",{name:"Quartic anharmonic",exact:true}).getAttribute("aria-selected"),"true");
  assert.equal(await page.getByTestId("anharmonic-result").count(),0,"restore must not fabricate eigenpairs");
  await page.getByRole("tab",{name:"Free dynamics",exact:true}).click();
  await page.getByRole("button",{name:/Two-level system/}).click();
  await page.screenshot({
    path: "artifacts/desktop-spectrum.png",
    fullPage: true,
  });
  await page.locator("#delta").fill("3");
  await page.locator("#omega").fill("4");
  await page
    .getByTestId("result-state")
    .filter({ hasText: "OUT OF DATE" })
    .waitFor();
  assert.equal(
    await page.getByTestId("energy-low").textContent(),
    "-0.640312",
    "old result must remain labelled with its old parameters",
  );
  await page.getByRole("button", { name: "Run spectrum" }).click();
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="energy-high"]').textContent ===
      "2.500000",
  );
  await page.locator("#delta").fill("");
  assert.ok(
    await page.getByRole("button", { name: "Run spectrum" }).isDisabled(),
  );
  await page.locator("#delta").fill("0");
  await page.locator("#omega").fill("0");
  await page.getByRole("button", { name: "Run spectrum" }).click();
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="energy-high"]').textContent ===
      "0.000000",
  );
  await page.getByRole("tab", { name: "Analysis", exact: true }).click();
  assert.ok(await page.getByText("Every term, explicit.").isVisible());
  await page.getByRole("button", { name: "Roadmap", exact: true }).click();
  assert.ok(
    await page
      .getByText("Foundation & first spectrum", { exact: true })
      .isVisible(),
  );
  assert.ok(await page.getByText("Generic lattice cells & bounded supercell fixtures", {exact:true}).isVisible());
  assert.ok(await page.getByText("Reciprocal basis & Brillouin-zone inspection",{exact:true}).isVisible());
  assert.match(await page.getByTestId("qvis-release-status").innerText(), /QVIS-001–013 implemented/);
  assert.match(await page.getByTestId("reconciliation-R1").innerText(),/Implemented/);
  assert.match(await page.getByTestId("reconciliation-R2").innerText(),/Implemented/);
  for (const id of ["R3", "R4", "R5"]) assert.match(await page.getByTestId(`reconciliation-${id}`).innerText(),/Implemented/);
  assert.match(await page.getByTestId("reconciliation-freeze-status").innerText(),/All existing labs and features are retained/);
  assert.match(await page.getByTestId("linked-workspace-status").innerText(),/Done: QLAB-UI-1, QLAB-UI-2, QLAB-UI-3, QLAB-UI-4, QLAB-UI-5, QLAB-UI-6, QLAB-UI-7, QLAB-UI-8.*Partially done: none.*Current linked-workspace gates complete/s);
  for(const id of Array.from({length:8},(_,index)=>`QLAB-UI-${index+1}`))
    assert.match(await page.getByTestId(`planned-${id}`).innerText(),/Implemented/);
  for(let number=14;number<=23;number++){
    const id=`QVIS-${String(number).padStart(3,"0")}`;
    assert.match(await page.getByTestId(`qvis-workflow-${id}`).innerText(),number<=19?/Implemented/:/Planned/);
  }
  await page.getByTestId("source-plan-coverage").locator("summary").click();
  assert.match(await page.getByTestId("plan-coverage-QVIS-005").innerText(), /Partial/);
  assert.match(await page.getByTestId("plan-coverage-QVIS-006").innerText(), /Partial/);
  assert.match(await page.getByTestId("plan-coverage-QVIS-007").innerText(), /Implemented \(bounded\)/);
  await page.getByTestId("source-plan-coverage").locator("summary").click();
  await page.getByTestId("post-roadmap").scrollIntoViewIfNeeded();
  await page.screenshot({path:"artifacts/desktop-post-roadmap.png", fullPage:true});
  await page.getByRole("button", { name: "Backend", exact: true }).click();
  assert.ok(await page.getByTestId("backend-page").isVisible());
  assert.ok(
    await page.getByRole("heading", {name:"Native NumPy / SciPy", exact: true}).isVisible(),
  );
  assert.ok(
    await page.getByText("quantum-data/v1", { exact: true }).isVisible(),
  );
  await page.getByTestId("worker-resources").getByText("Logical CPU cores").waitFor();
  assert.match(await page.getByTestId("ssh-connection").innerText(), /Default\s+Local Python over stdio/);
  await page.screenshot({
    path: "artifacts/desktop-backend.png",
    fullPage: true,
  });
  await page.getByTestId("open-atlas").click();
  assert.ok(await page.getByTestId("atlas-panel").isVisible());
  assert.match(await page.getByTestId("atlas-panel").innerText(),/68 Hamiltonians/);
  assert.equal(await page.locator(".pill").innerText(),"68 SOURCE ENTRIES");
  for(const [id,kind] of [["surface_code_planar","reference_lab"],["dispersive_jc","direct"],["hofstadter","not declared"],["coulomb_one_body","not declared"]]) {
    await page.getByLabel("Search Atlas").fill(id);
    await page.getByRole("button",{name:new RegExp(id)}).click();
    assert.match(await page.getByTestId("atlas-capability-status").innerText(),new RegExp(`Theory example: ${kind}.*Lab executable binding: none`));
    assert.equal(await page.getByTestId("open-atlas-binding").count(),0);
    assert.match(await page.getByTestId("atlas-freeze-status").innerText(),/atlas-lab-reconciliation\/v1.*68 entries/);
    assert.ok(await page.getByTestId("atlas-executable-review").isVisible());
    assert.ok(await page.getByTestId("atlas-scene-review").isVisible());
    assert.ok(await page.getByTestId("atlas-gap-review").isVisible());
  }
  await page.getByTestId("atlas-executable-review").locator("summary").click();
  assert.match(await page.getByTestId("atlas-executable-review").innerText(),/Adapter candidate only.*reduced mass/);
  await page.getByTestId("atlas-gap-review").locator("summary").click();
  assert.match(await page.getByTestId("atlas-gap-review").innerText(),/G01.*Restricted Coulomb\/Zeeman/);
  await page.getByTestId("atlas-scene-review").locator("summary").click();
  assert.equal(await page.getByTestId("atlas-scene-review").locator("h4").count(),7);
  assert.equal(await page.getByTestId("open-atlas-binding").count(),0);
  await page.getByTestId("atlas-scene-review").locator("summary").click();
  await page.getByTestId("atlas-executable-review").scrollIntoViewIfNeeded();
  await page.screenshot({path:"artifacts/desktop-atlas-r2-r5.png",fullPage:true});
  await page.getByTestId("atlas-executable-review").locator("summary").click();
  await page.getByTestId("atlas-gap-review").locator("summary").click();
  await page.screenshot({ path: "artifacts/desktop-atlas.png", fullPage: true });
  await page.getByLabel("Search Atlas").fill("Su-Schrieffer-Heeger");
  await page.getByRole("button", { name: /Su-Schrieffer-Heeger model/ }).click();
  assert.match(await page.getByTestId("atlas-panel").innerText(), /Atlas t₁\/t₂/);
  await page.getByTestId("open-atlas-binding").click();
  assert.ok(await page.getByTestId("topology-lab").isVisible());
  await page.getByTestId("run-topology").click();
  await page.getByTestId("topology-result").waitFor();
  preservedTopologyRunIds.ssh=await page.getByTestId("workspace-run-id").innerText();
  assert.match(await page.getByTestId("topology-result").innerText(), /WINDING\s+1/);
  await page.getByRole("slider",{name:"SSH band sample"}).focus();
  await page.keyboard.press("End");
  await page.getByTestId("topology-selected-band").waitFor({state:"attached"});
  await page.getByTestId("topology-inspector-selection").filter({hasText:"Stored k"}).waitFor();
  await page.getByRole("button",{name:"Select SSH edge site 1",exact:true}).click();
  assert.equal(await page.getByRole("button",{name:"Select SSH edge site 1",exact:true}).getAttribute("aria-pressed"),"true");
  assert.ok(Number(await page.getByTestId("topology-selected-value").innerText())>=0);
  await page.screenshot({ path: "artifacts/desktop-ssh.png", fullPage: true });
  await page.getByRole("combobox", { name: "Topology model" }).selectOption("qwz");
  await page.getByTestId("run-topology").click();
  await page.getByTestId("qwz-chern").waitFor();
  preservedTopologyRunIds.qwz=await page.getByTestId("workspace-run-id").innerText();
  assert.equal(await page.getByTestId("qwz-chern").textContent(), "-1");
  await page.locator('rect[aria-label="Select QWZ cell kx 2, ky 1"]').click();
  await page.getByTestId("topology-selected-cell").waitFor();
  await page.getByTestId("topology-inspector-selection").filter({hasText:"Berry curvature"}).waitFor();
  assert.match(await page.getByTestId("scientific-reference-coordinate").innerText(),/Stored cell \(2, 1\)/);
  assert.equal(await page.getByTestId("scientific-reference-run").getAttribute("title"),preservedTopologyRunIds.qwz);
  assert.match(await page.getByTestId("topology-inspector-selection").innerText(),/Stored lower band/);
  const storedTopologyInputs=await page.getByTestId("topology-inspector-inputs").innerText();
  await page.getByRole("spinbutton",{name:"QWZ mass"}).fill("-0.5");
  await page.getByTestId("topology-inspector-state").filter({hasText:"Edited draft · showing stored run"}).waitFor();
  assert.equal(await page.getByTestId("topology-inspector-inputs").innerText(),storedTopologyInputs);
  await page.screenshot({ path: "artifacts/desktop-qwz.png", fullPage: true });
  await page.getByRole("spinbutton", { name: "QWZ mass" }).fill("0");
  await page.getByTestId("run-topology").click();
  await page.getByTestId("qwz-chern").filter({ hasText: "undefined" }).waitFor();
  preservedTopologyRunIds.closed=await page.getByTestId("workspace-run-id").innerText();
  assert.equal(await page.getByTestId("topology-selected-cell").count(),0);
  assert.equal(await page.getByTestId("topology-selected-value").count(),0);
  assert.match(await page.getByTestId("topology-inspector-diagnostics").innerText(),/undefined at gap closure/);
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  await page.getByRole("button",{name:`Open SSH topology ${preservedTopologyRunIds.ssh}`}).click();
  await page.getByTestId("workspace-run-id").filter({hasText:preservedTopologyRunIds.ssh}).waitFor();
  assert.equal(await page.getByRole("combobox",{name:"Topology model"}).inputValue(),"ssh");
  assert.equal(await page.getByTestId("topology-selected-value").count(),0,"reopening clears topology selection");
  await page.getByTestId("topology-inspector-state").filter({hasText:"Run inputs match the draft"}).waitFor();
  await page.getByRole("button",{name:/Two-level system/}).click();
  await page.getByRole("button", { name: "Restore smoke values" }).click();
  await page.getByRole("button", { name: "Run spectrum" }).click();
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="energy-high"]').textContent ===
      "0.640312",
  );
  await page
    .getByRole("button", { name: "Restart worker", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restart worker", exact: true })
    .waitFor();
  await page
    .getByTestId("worker-status")
    .filter({ hasText: "READY" })
    .waitFor();
  await page.getByRole("button", { name: "Run spectrum" }).click();
  await page
    .getByTestId("result-state")
    .filter({ hasText: "COMPUTED" })
    .waitFor();
  await page
    .getByRole("combobox", { name: "Spectrum engine" })
    .selectOption("compare");
  await page
    .getByTestId("result-state")
    .filter({ hasText: "OUT OF DATE" })
    .waitFor();
  await page.getByRole("button", { name: "Compare spectrum" }).click();
  await page.getByTestId("spectrum-comparison").waitFor();
  assert.ok(
    Number(await page.getByTestId("max-energy-difference").textContent()) <
      1e-10,
  );
  await page.screenshot({
    path: "artifacts/desktop-spectrum-compare.png",
    fullPage: true,
  });
  await page
    .getByRole("combobox", { name: "Spectrum engine" })
    .selectOption("native");
  await page.getByRole("button", { name: "Run spectrum" }).click();
  await page
    .getByTestId("result-state")
    .filter({ hasText: "COMPUTED" })
    .waitFor();
  assert.ok(await page.getByText(/Native · Δ = 1, Ω = 0.8/).isVisible());
  await page
    .getByRole("combobox", { name: "Spectrum engine" })
    .selectOption("qutip");
  await page.getByRole("button", { name: "Run spectrum" }).click();
  await page
    .getByTestId("result-state")
    .filter({ hasText: "COMPUTED" })
    .waitFor();
  await app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    window.unmaximize();
    window.setSize(1050, 700);
  });
  await page.waitForFunction(() => innerWidth < 1100);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  assert.equal(
    overflow,
    false,
    "minimum window width should not overflow horizontally",
  );
  const geometry = await page.evaluate(() => ({
    bottom: document.querySelector(".statusbar").getBoundingClientRect().bottom,
    height: innerHeight,
  }));
  assert.ok(
    geometry.bottom <= geometry.height + 1,
    `worker status stays visible at minimum window height: ${JSON.stringify(geometry)}`,
  );
  await page.screenshot({
    path: "artifacts/desktop-compact.png",
    fullPage: true,
  });
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setSize(1440, 900),
  );
  await page.getByRole("button",{name:/Rabi dynamics/}).click();
  assert.equal(await workspaceModes.getByRole("tab",{name:"Sweeps"}).isEnabled(),true);
  assert.equal(await page.getByRole("button",{name:/Rabi dynamics/}).getAttribute("aria-pressed"),"true");
  await page.getByTestId("run-evolution").click();
  await page
    .getByTestId("evolution-state")
    .filter({ hasText: "COMPLETE" })
    .waitFor({ timeout: 30000 });
  const rabiRunId=await page.getByTestId("workspace-run-id").innerText();
  preservedRabiRunId=rabiRunId;
  assert.match(rabiRunId,/^run-/);
  assert.equal(await page.getByTestId("rabi-inspector-inputs").locator("code").getAttribute("title"),rabiRunId);
  assert.equal(await page.getByTestId("rabi-inspector-time").innerText(),"0.0000");
  assert.ok(
    await page
      .getByRole("img", { name: /QuTiP population and Pauli/ })
      .isVisible(),
  );
  const cursor = page.getByRole("slider", { name: "Time cursor" });
  assert.equal(
    await page.getByTestId("selected-time").textContent(),
    "t = 0.0000",
  );
  assert.equal(await page.getByTestId("population-0").textContent(), "1.0000");
  assert.equal(await page.getByTestId("bloch-z").textContent(), "1.0000");
  assert.equal(
    await page.getByTestId("rho-00").textContent(),
    "1.0000 + 0.0000i",
  );
  assert.ok(
    (await page.locator('[data-testid="bloch-canvas"] canvas').count()) +
      (await page.locator(".bloch-fallback").count()) >
      0,
    "Bloch view should render WebGL or its accessible fallback",
  );
  await cursor.focus();
  await cursor.press("End");
  assert.equal(
    await page.getByTestId("selected-time").textContent(),
    "t = 20.0000",
  );
  await page.getByTestId("rabi-inspector-time").filter({hasText:"20.0000"}).waitFor();
  assert.equal((await page.getByTestId("rabi-inspector-populations").innerText()).split(" / ")[0],await page.getByTestId("population-0").innerText());
  assert.equal(
    await page.getByTestId("chart-time-cursor").getAttribute("x1"),
    "750",
  );
  const p0 = Number(await page.getByTestId("population-0").textContent());
  const p1 = Number(await page.getByTestId("population-1").textContent());
  const z = Number(await page.getByTestId("bloch-z").textContent());
  assert.ok(Math.abs(p0 + p1 - 1) < 0.001);
  assert.ok(Math.abs(p0 - p1 - z) < 0.001);
  const chart = page.getByRole("img", {
    name: /QuTiP population and Pauli/,
  });
  await chart.scrollIntoViewIfNeeded();
  const chartBox = await chart.boundingBox();
  await page.mouse.click(
    chartBox.x + chartBox.width / 2,
    chartBox.y + chartBox.height / 2,
  );
  assert.equal(
    await page.getByTestId("selected-time").textContent(),
    "t = 10.0000",
  );
  await page.getByTestId("rabi-inspector-time").filter({hasText:"10.0000"}).waitFor();
  assert.match(await page.getByTestId("scientific-reference-coordinate").innerText(),/Stored time row/);
  assert.equal(await page.getByTestId("scientific-reference-run").getAttribute("title"),rabiRunId);
  const linkedTimeIndex=await cursor.inputValue();
  const rabiSource=await page.evaluate(id=>window.quantum.inspectSavedRun(id),rabiRunId);
  await page.getByTestId("view-in-scenes").click();
  await page.getByTestId("scene-verification").filter({hasText:"SHA-256 VERIFIED"}).waitFor();
  await page.getByLabel("Scene saved run").locator(`option[value="${rabiRunId}"]`).waitFor({state:"attached"});
  assert.equal(await page.getByLabel("Scene saved run").inputValue(),rabiRunId,"lab launch keeps the exact run ID");
  assert.equal(await page.getByLabel("Saved scene view").inputValue(),"standard");
  assert.equal(await page.getByLabel("Scene sample").inputValue(),linkedTimeIndex,"saved time sample links to scene trajectory");
  assert.match(await page.getByTestId("scene-bridge-status").innerText(),/Linked saved evolution time sample/);
  assert.match(await page.getByTestId("scene-run-id").innerText(),new RegExp(rabiSource.hashes.result));
  await page.getByRole("tab",{name:"Dynamics",exact:true}).click();
  const storedFrequency=await page.getByTestId("rabi-inspector-inputs").innerText();
  await page.getByLabel("Drive frequency ω", { exact: true }).fill("1.1");
  await page.getByTestId("rabi-inspector-state").filter({hasText:"Edited draft · showing stored run"}).waitFor();
  assert.equal(await page.getByTestId("rabi-inspector-inputs").innerText(),storedFrequency);
  assert.equal(await page.getByTestId("workspace-run-id").innerText(),rabiRunId);
  await page.screenshot({
    path: "artifacts/desktop-dynamics.png",
    fullPage: true,
  });
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  await page.getByRole("button",{name:`Open Rabi evolution ${rabiRunId}`}).click();
  await page.getByTestId("workspace-run-id").filter({hasText:rabiRunId}).waitFor();
  await page.getByTestId("rabi-inspector-state").filter({hasText:"Run inputs match the draft"}).waitFor();
  assert.equal(await page.getByTestId("rabi-inspector-time").innerText(),"0.0000");
  const gpu = await page.evaluate(() => window.quantum.getCapabilities());
  if (gpu.engines.dynamiqs?.available) {
    await page.getByRole("combobox", { name: "Dynamics engine" }).selectOption("dynamiqs");
    await page.getByTestId("run-evolution").click();
    await page.getByTestId("evolution-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 90000 });
    assert.ok(await page.getByRole("img", { name: /Dynamiqs GPU population and Pauli/ }).isVisible());
    await page.getByRole("combobox", { name: "Dynamics engine" }).selectOption("qutip");
  }
  await page.getByLabel("Drive frequency ω", { exact: true }).fill("1.1");
  await page
    .getByTestId("dynamics-result-state")
    .filter({ hasText: "OUT OF DATE" })
    .waitFor();
  await page.getByLabel("Samples", { exact: true }).fill("50000");
  await page.getByLabel("End time T").fill("1000");
  await page.getByTestId("run-evolution").click();
  await page.getByRole("button", { name: "Cancel job" }).click();
  try {
    await page.getByTestId("evolution-state").filter({ hasText: "CANCELLED" }).waitFor({ timeout: 30000 });
  } catch (error) {
    console.error("Cancel diagnostic", await page.getByTestId("evolution-state").textContent(),
      await page.locator(".error-message").allTextContents(),
      await page.getByTestId("worker-status").textContent());
    throw error;
  }
  assert.match(await page.getByTestId("worker-status").textContent(), /READY/);
  await page.getByRole("button", { name: "Landau–Zener" }).click();
  await page.getByLabel("Sweep rate v").waitFor();
  await page.getByTestId("run-evolution").click();
  await page
    .getByTestId("evolution-state")
    .filter({ hasText: "COMPLETE" })
    .waitFor({ timeout: 30000 });
  assert.equal(
    await page.getByTestId("selected-time").textContent(),
    "t = -10.0000",
  );
  const landauRunId=await page.getByTestId("workspace-run-id").innerText();
  preservedPassageRunIds.landau=landauRunId;
  assert.equal(await page.getByTestId("evolution-inspector-inputs").locator("code").getAttribute("title"),landauRunId);
  assert.equal(await page.getByTestId("evolution-inspector-time").innerText(),"-10.0000");
  assert.ok(Math.abs(Number(await page.getByTestId("inspector-lz-reference").innerText())-Number(await page.getByTestId("landau-zener-reference").innerText()))<1e-4);
  await page.getByRole("slider", { name: "Time cursor" }).focus();
  await page.getByRole("slider", { name: "Time cursor" }).press("End");
  assert.equal(
    await page.getByTestId("selected-time").textContent(),
    "t = 10.0000",
  );
  await page.getByTestId("evolution-inspector-time").filter({hasText:"10.0000"}).waitFor();
  await page.getByTestId("evolution-inspector-populations").filter({hasText:await page.getByTestId("population-0").innerText()}).waitFor();
  assert.equal((await page.getByTestId("evolution-inspector-populations").innerText()).split(" / ")[0],await page.getByTestId("population-0").innerText());
  const landauStoredInputs=await page.getByTestId("evolution-inspector-inputs").innerText();
  await page.getByLabel("Bias ε₀",{exact:true}).fill("0.2");
  await page.getByTestId("evolution-inspector-state").filter({hasText:"Edited draft · showing stored run"}).waitFor();
  assert.equal(await page.getByTestId("evolution-inspector-inputs").innerText(),landauStoredInputs);
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  await page.getByRole("button",{name:`Open Landau–Zener evolution ${landauRunId}`}).click();
  await page.getByTestId("workspace-run-id").filter({hasText:landauRunId}).waitFor();
  await page.getByTestId("evolution-inspector-state").filter({hasText:"Run inputs match the draft"}).waitFor();
  assert.equal(await page.getByTestId("evolution-inspector-time").innerText(),"-10.0000");
  await page.screenshot({
    path: "artifacts/desktop-landau-zener.png",
    fullPage: true,
  });
  await page
    .getByRole("combobox", { name: "Dynamics engine" })
    .selectOption("compare");
  await page.getByTestId("run-evolution").click();
  await page
    .getByTestId("evolution-state")
    .filter({ hasText: "COMPLETE" })
    .waitFor({ timeout: 30000 });
  await page.getByTestId("evolution-comparison").waitFor();
  assert.ok(
    Number(await page.getByTestId("max-observable-difference").textContent()) <
      1e-3,
  );
  assert.ok(
    Number(await page.getByTestId("min-state-fidelity").textContent()) >
      0.99999,
  );
  assert.ok(
    Number(await page.getByTestId("max-norm-drift").textContent()) < 1e-5,
  );
  await page.screenshot({
    path: "artifacts/desktop-evolution-compare.png",
    fullPage: true,
  });
  await page
    .getByRole("combobox", { name: "Dynamics engine" })
    .selectOption("native");
  await page.getByTestId("run-evolution").click();
  await page
    .getByTestId("evolution-state")
    .filter({ hasText: "COMPLETE" })
    .waitFor({ timeout: 30000 });
  assert.ok(
    await page
      .getByRole("img", { name: /Native population and Pauli/ })
      .isVisible(),
  );
  await page.getByRole("button", { name: "Stückelberg" }).click();
  await page
    .getByRole("combobox", { name: "Dynamics engine" })
    .selectOption("qutip");
  await page.getByTestId("run-evolution").click();
  await page
    .getByTestId("evolution-state")
    .filter({ hasText: "COMPLETE" })
    .waitFor({ timeout: 30000 });
  assert.equal(
    await page.getByTestId("stuckelberg-crossings").textContent(),
    "±4.000",
  );
  const stuckelbergRunId=await page.getByTestId("workspace-run-id").innerText();
  preservedPassageRunIds.stuckelberg=stuckelbergRunId;
  assert.equal(await page.getByTestId("inspector-stuckelberg-crossings").innerText(),"±4.000");
  await page.getByRole("slider",{name:"Time cursor"}).focus();
  await page.getByRole("slider",{name:"Time cursor"}).press("End");
  await page.getByTestId("evolution-inspector-time").filter({hasText:"12.0000"}).waitFor();
  const stuckelbergStoredInputs=await page.getByTestId("evolution-inspector-inputs").innerText();
  await page.getByLabel("Crossing time τ",{exact:true}).fill("5");
  await page.getByTestId("evolution-inspector-state").filter({hasText:"Edited draft · showing stored run"}).waitFor();
  assert.equal(await page.getByTestId("evolution-inspector-inputs").innerText(),stuckelbergStoredInputs);
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  await page.getByRole("button",{name:`Open Stückelberg evolution ${stuckelbergRunId}`}).click();
  await page.getByTestId("workspace-run-id").filter({hasText:stuckelbergRunId}).waitFor();
  await page.getByTestId("evolution-inspector-state").filter({hasText:"Run inputs match the draft"}).waitFor();
  assert.ok(Number(await page.getByTestId("final-p0").textContent()) >= 0);
  await page.screenshot({
    path: "artifacts/desktop-stuckelberg.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Floquet / strong drive" }).click();
  await page.getByTestId("run-evolution").click();
  await page.getByTestId("evolution-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  await page.getByTestId("floquet-analysis").waitFor();
  const floquetRunId=await page.getByTestId("workspace-run-id").innerText();
  preservedPassageRunIds.floquet=floquetRunId;
  const inspectorQuasienergies=(await page.getByTestId("inspector-quasienergies").innerText()).split(" / ").map(Number);
  assert.ok(Math.abs(inspectorQuasienergies[0]-Number(await page.getByTestId("quasienergy-0").innerText()))<1e-4);
  assert.ok(Math.abs(inspectorQuasienergies[1]-Number(await page.getByTestId("quasienergy-1").innerText()))<1e-4);
  await page.getByRole("slider",{name:"Time cursor"}).focus();
  await page.getByRole("slider",{name:"Time cursor"}).press("End");
  await page.getByTestId("evolution-inspector-time").filter({hasText:"30.0000"}).waitFor();
  const floquetStoredInputs=await page.getByTestId("evolution-inspector-inputs").innerText();
  await page.getByLabel("Drive phase φ",{exact:true}).fill("0.2");
  await page.getByTestId("evolution-inspector-state").filter({hasText:"Edited draft · showing stored run"}).waitFor();
  assert.equal(await page.getByTestId("evolution-inspector-inputs").innerText(),floquetStoredInputs);
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  await page.getByRole("button",{name:`Open Floquet / strong drive evolution ${floquetRunId}`}).click();
  await page.getByTestId("workspace-run-id").filter({hasText:floquetRunId}).waitFor();
  await page.getByTestId("evolution-inspector-state").filter({hasText:"Run inputs match the draft"}).waitFor();
  assert.equal(await page.getByTestId("evolution-inspector-time").innerText(),"0.0000");
  assert.ok(Number(await page.getByTestId("quasienergy-0").textContent()) <= Number(await page.getByTestId("quasienergy-1").textContent()));
  assert.equal(await page.getByTestId("floquet-map").locator(".floquet-map-grid > div").count(), 117);
  await page.getByTestId("floquet-analysis").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/desktop-floquet.png", fullPage: true });
  await expandGroup(page,"light-matter");
  await page.getByRole("button", { name: "Jaynes–Cummings" }).click();
  await page.getByTestId("run-cavity").click();
  await page.getByTestId("cavity-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  await page.getByTestId("cavity-result").waitFor();
  await page.getByTestId("sector-summary").filter({hasText:"Excitation N = 1"}).waitFor();
  assert.match(await page.getByTestId("cavity-sector-panel").innerText(),/verified run/);
  assert.ok(await page.getByTestId("cavity-level-sector-0").isVisible());
  const jaynesRunId=await page.getByTestId("workspace-run-id").innerText();
  preservedCavityRunIds.jaynes=jaynesRunId;
  assert.equal(await page.getByTestId("cavity-inspector-inputs").locator("code").getAttribute("title"),jaynesRunId);
  assert.equal(await page.getByTestId("cavity-inspector-time").innerText(),"0.0000");
  assert.equal(await page.getByTestId("cavity-inspector-excited").innerText(),await page.getByTestId("cavity-excited").innerText());
  assert.equal(await page.getByTestId("cavity-inspector-max-boundary").innerText(),await page.getByTestId("cavity-boundary").innerText());
  assert.ok(await page.getByTestId("cavity-inspector-jc-reference").isVisible());
  assert.equal(await page.getByTestId("cavity-inspector-jc-error").innerText(),await page.getByTestId("jc-reference").innerText());
  const cavityCursorBefore=await page.getByTestId("cavity-chart-cursor").getAttribute("x1");
  await page.getByRole("slider",{name:"Cavity time cursor"}).focus();
  await page.getByRole("slider",{name:"Cavity time cursor"}).press("End");
  await page.getByTestId("cavity-inspector-time").filter({hasText:"25.0000"}).waitFor();
  assert.notEqual(await page.getByTestId("cavity-chart-cursor").getAttribute("x1"),cavityCursorBefore);
  assert.equal(await page.getByTestId("cavity-inspector-photons").innerText(),await page.getByTestId("cavity-photons").innerText());
  assert.equal(await page.getByTestId("cavity-inspector-boundary").innerText(),await page.getByTestId("cavity-selected-boundary").innerText());
  assert.equal((await page.getByTestId("cavity-inspector-norm-parity").innerText()).split(" / ")[1],await page.getByTestId("cavity-selected-parity").innerText());
  assert.ok(Number(await page.getByTestId("jc-reference").textContent()) < 1e-4);
  assert.ok(Number(await page.getByTestId("cavity-boundary").textContent()) < 1e-5);
  assert.equal(await page.getByTestId("dressed-spectrum").locator("span").count(), 12);
  await page.getByTestId("cavity-result").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/desktop-jaynes-cummings.png", fullPage: true });
  const jaynesStoredInputs=await page.getByTestId("cavity-inspector-inputs").innerText();
  await page.getByLabel("Coupling g", { exact: true }).fill("0.4");
  await page.getByTestId("cavity-result-state").filter({ hasText: "OUT OF DATE" }).waitFor();
  await page.getByTestId("cavity-inspector-state").filter({hasText:"Edited draft · showing stored run"}).waitFor();
  assert.equal(await page.getByTestId("cavity-inspector-inputs").innerText(),jaynesStoredInputs);
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  await page.getByRole("button",{name:`Open Jaynes–Cummings cavity ${jaynesRunId}`}).click();
  await page.getByTestId("workspace-run-id").filter({hasText:jaynesRunId}).waitFor();
  await page.getByTestId("cavity-inspector-state").filter({hasText:"Run inputs match the draft"}).waitFor();
  assert.equal(await page.getByTestId("cavity-inspector-time").innerText(),"0.0000");
  await page.getByRole("button", { name: "Quantum Rabi" }).click();
  await page.getByRole("combobox", { name: "Cavity engine" }).selectOption("native");
  await page.getByTestId("run-cavity").click();
  await page.getByTestId("cavity-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  await page.getByTestId("sector-summary").filter({hasText:"Parity −1"}).waitFor();
  assert.equal(await page.locator('[data-testid^="cavity-level-sector-"]').count(),0,"Rabi energies do not receive unsupported parity labels");
  const quantumRabiRunId=await page.getByTestId("workspace-run-id").innerText();
  preservedCavityRunIds.quantumRabi=quantumRabiRunId;
  assert.equal(await page.getByTestId("cavity-inspector-inputs").locator("code").getAttribute("title"),quantumRabiRunId);
  assert.equal(await page.getByTestId("cavity-inspector-jc-reference").count(),0);
  await page.getByRole("slider",{name:"Cavity time cursor"}).focus();
  await page.getByRole("slider",{name:"Cavity time cursor"}).press("End");
  await page.getByTestId("cavity-inspector-time").filter({hasText:"25.0000"}).waitFor();
  const quantumRabiStoredInputs=await page.getByTestId("cavity-inspector-inputs").innerText();
  await page.getByTestId("cavity-cutoff").fill("9");
  await page.getByTestId("cavity-inspector-state").filter({hasText:"Edited draft · showing stored run"}).waitFor();
  assert.equal(await page.getByTestId("cavity-inspector-inputs").innerText(),quantumRabiStoredInputs);
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  await page.getByRole("button",{name:`Open Quantum Rabi cavity ${quantumRabiRunId}`}).click();
  await page.getByTestId("workspace-run-id").filter({hasText:quantumRabiRunId}).waitFor();
  await page.getByTestId("cavity-inspector-state").filter({hasText:"Run inputs match the draft"}).waitFor();
  assert.equal(await page.getByTestId("cavity-inspector-time").innerText(),"0.0000");
  assert.equal(await page.getByTestId("cavity-inspector-jc-reference").count(),0);
  assert.ok(Number(await page.getByTestId("cavity-boundary").textContent()) < 0.02);
  await page.getByTestId("cavity-result").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/desktop-quantum-rabi.png", fullPage: true });
  await expandGroup(page,"open-systems");
  await page.getByRole("button", { name: "Lindblad dynamics" }).click();
  await page.getByTestId("run-lindblad").click();
  await page.getByTestId("lindblad-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  await page.getByTestId("lindblad-result").waitFor();
  preservedLindbladRunId=await page.getByTestId("workspace-run-id").innerText();
  assert.equal(await page.getByTestId("lindblad-inspector-inputs").locator("code").getAttribute("title"),preservedLindbladRunId);
  assert.equal(await page.getByTestId("lindblad-inspector-time").innerText(),"0.0000");
  assert.equal(await page.getByTestId("lindblad-inspector-excited").innerText(),await page.getByTestId("open-excited").innerText());
  assert.equal(await page.getByTestId("lindblad-inspector-min-purity").innerText(),await page.getByTestId("minimum-purity").innerText());
  assert.ok(await page.getByTestId("lindblad-inspector-steady").isVisible());
  assert.ok(Number(await page.getByTestId("open-excited").textContent()) > .99);
  const lindbladCursorBefore=await page.getByTestId("lindblad-chart-cursor").getAttribute("x1");
  await page.getByRole("slider",{name:"Open-system time cursor"}).focus();
  await page.getByRole("slider",{name:"Open-system time cursor"}).press("End");
  await page.getByTestId("lindblad-inspector-time").filter({hasText:"20.0000"}).waitFor();
  assert.notEqual(await page.getByTestId("lindblad-chart-cursor").getAttribute("x1"),lindbladCursorBefore);
  for(const [inspector,local] of [["excited","open-excited"],["photons","open-photons"],["purity","open-purity"],["coherence","open-coherence"],["boundary","open-boundary"],["trace","open-trace"]])
    assert.equal(await page.getByTestId(`lindblad-inspector-${inspector}`).innerText(),await page.getByTestId(local).innerText());
  assert.ok(Number(await page.getByTestId("minimum-purity").textContent()) < 1);
  assert.ok(await page.getByTestId("steady-state").getByText("Steady state").isVisible());
  await page.getByTestId("lindblad-result").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/desktop-lindblad.png", fullPage: true });
  const lindbladStoredInputs=await page.getByTestId("lindblad-inspector-inputs").innerText();
  await page.getByLabel("Relaxation γ₁",{exact:true}).fill("0.4");
  await page.getByTestId("lindblad-inspector-state").filter({hasText:"Edited draft · showing stored run"}).waitFor();
  assert.equal(await page.getByTestId("lindblad-inspector-inputs").innerText(),lindbladStoredInputs);
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  await page.getByRole("button",{name:`Open Lindblad dynamics ${preservedLindbladRunId}`}).click();
  await page.getByTestId("workspace-run-id").filter({hasText:preservedLindbladRunId}).waitFor();
  await page.getByTestId("lindblad-inspector-state").filter({hasText:"Run inputs match the draft"}).waitFor();
  assert.equal(await page.getByTestId("lindblad-inspector-time").innerText(),"0.0000");
  await page.getByRole("button", { name: /Rabi dynamics/ }).click();
  await page.getByRole("tab", { name: "Sweeps", exact: true }).click();
  await page.getByRole("combobox", { name: "Sweep engine" }).selectOption("native");
  await page.getByRole("spinbutton", { name: "X axis points" }).fill("5");
  await page.getByTestId("run-sweep").evaluate(element => element.scrollIntoView({ block: "center" }));
  await page.getByTestId("run-sweep").click();
  await page.getByTestId("sweep-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  await page.getByTestId("sweep-line").waitFor();
  preservedSweepRunIds.line=await page.getByTestId("workspace-run-id").innerText();
  await page.getByTestId("sweep-inspector-state").filter({hasText:"Run inputs match the draft"}).waitFor();
  assert.equal(await page.getByTestId("sweep-inspector-value").count(),0,"a new grid has no invented selection");
  await page.getByRole("slider",{name:"Sweep X point"}).focus();
  await page.keyboard.press("End");
  await page.getByTestId("sweep-selected-point").waitFor();
  assert.equal(await page.getByTestId("sweep-selected-value").innerText(),`Final P₁ = ${await page.getByTestId("sweep-inspector-value").innerText()}`);
  assert.match(await page.getByTestId("sweep-inspector-inputs").innerText(),/X axis.*points/s);
  assert.ok(["0", "5"].includes(await page.getByTestId("sweep-reused").textContent()));
  await page.screenshot({ path: "artifacts/desktop-sweep-line.png", fullPage: true });
  await page.getByTestId("run-sweep").evaluate(element => element.scrollIntoView({ block: "center" }));
  await page.getByTestId("run-sweep").click();
  await page.getByTestId("sweep-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  assert.equal(await page.getByTestId("sweep-reused").textContent(), "5");
  await page.getByRole("combobox", { name: "Sweep dimension" }).selectOption("2d");
  await page.getByRole("spinbutton", { name: "Y axis points" }).fill("4");
  await page.getByTestId("run-sweep").evaluate(element => element.scrollIntoView({ block: "center" }));
  await page.getByTestId("run-sweep").click();
  await page.getByTestId("sweep-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  await page.getByTestId("sweep-heatmap").waitFor();
  preservedSweepRunIds.heatmap=await page.getByTestId("workspace-run-id").innerText();
  assert.equal(await page.getByTestId("sweep-heatmap").locator(".sweep-heatmap button").count(), 20);
  const chosenCell=page.getByTestId("sweep-heatmap").locator('.sweep-heatmap button[aria-label^="x 2, y 1,"]');
  await chosenCell.click();
  assert.equal(await chosenCell.getAttribute("aria-pressed"),"true");
  assert.equal(await page.getByTestId("sweep-selected-value").innerText(),`Final P₁ = ${await page.getByTestId("sweep-inspector-value").innerText()}`);
  assert.match(await page.getByTestId("sweep-inspector-cache").innerText(),/Reused \/ computed/);
  assert.match(await page.getByTestId("sweep-inspector-cell").innerText(),/not a time trajectory/);
  const storedSweepInputs=await page.getByTestId("sweep-inspector-inputs").innerText();
  await page.getByRole("spinbutton",{name:"X axis from"}).fill("0.1");
  await page.getByTestId("sweep-inspector-state").filter({hasText:"Edited draft · showing stored run"}).waitFor();
  assert.equal(await page.getByTestId("sweep-inspector-inputs").innerText(),storedSweepInputs);
  await page.screenshot({ path: "artifacts/desktop-sweep-heatmap.png", fullPage: true });
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  await page.getByRole("button",{name:`Open Rabi dynamics final-population sweep ${preservedSweepRunIds.heatmap}`}).click();
  await page.getByTestId("workspace-run-id").filter({hasText:preservedSweepRunIds.heatmap}).waitFor();
  assert.equal(await page.getByRole("combobox",{name:"Sweep dimension"}).inputValue(),"2d");
  assert.equal(await page.getByTestId("sweep-inspector-value").count(),0,"verified reopening clears grid selection");
  await page.getByTestId("sweep-inspector-state").filter({hasText:"Run inputs match the draft"}).waitFor();
  if (gpu.engines.dynamiqs?.available) {
    await page.getByRole("combobox", { name: "Sweep engine" }).selectOption("dynamiqs");
    await page.getByTestId("run-sweep").evaluate(element => element.scrollIntoView({ block: "center" }));
    await page.getByTestId("run-sweep").click();
    await page.getByTestId("sweep-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 90000 });
    assert.equal(await page.getByTestId("sweep-heatmap").locator(".sweep-heatmap button").count(), 20);
  }
  await page.getByRole("combobox",{name:"Sweep model"}).selectOption("landau_zener");
  assert.equal(await page.getByRole("button",{name:/Landau–Zener/}).getAttribute("aria-pressed"),"true");
  await page.getByRole("tab",{name:"Dynamics",exact:true}).click();
  assert.match(await page.getByRole("tablist",{name:/Workspace modes for Landau–Zener/}).getAttribute("aria-label"),/Landau–Zener/);
  assert.match(await page.locator(".breadcrumb").innerText(),/LANDAU–ZENER/);
  assert.ok(await page.getByTestId("run-evolution").isVisible());
  await expandGroup(page,"many-body");
  await page.getByRole("button", { name: /Ising chain/ }).click();
  await page.getByTestId("run-many-body").click();
  await page.getByTestId("many-body-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  await page.getByTestId("many-body-result").waitFor();
  preservedManyBodyRunId=await page.getByTestId("workspace-run-id").innerText();
  assert.equal(await page.getByTestId("many-body-inspector-inputs").locator("code").getAttribute("title"),preservedManyBodyRunId);
  assert.equal(await page.getByTestId("many-body-inspector-energy").count(),0);
  await page.getByRole("button",{name:"Select Ising E1"}).click();
  await page.getByTestId("many-body-inspector-energy").waitFor();
  assert.equal(await page.getByRole("button",{name:"Select Ising E1"}).getAttribute("aria-pressed"),"true");
  assert.equal(await page.getByTestId("many-body-level-mark-1").locator("line").getAttribute("stroke"),"#f2b36f");
  await page.getByRole("button",{name:"Select Ising site 2"}).click();
  await page.getByTestId("scientific-reference-coordinate").filter({hasText:"Stored site 2"}).waitFor();
  await page.getByTestId("many-body-inspector-site").waitFor();
  assert.match(await page.getByTestId("scientific-reference-coordinate").innerText(),/Stored site 2/);
  assert.match(await page.getByTestId("observable-workspace").innerText(),/QVIS-016 \/ OBSERVABLE WORKSPACE/);
  assert.match(await page.getByTestId("observable-card-czz").innerText(),/Unavailable/);
  assert.match(await page.getByTestId("observable-card-correlation_length").innerText(),/Unavailable/);
  await page.getByTestId("inspect-ising-state").click();
  await page.getByTestId("ising-state-panel").waitFor({timeout:30000});
  assert.match(await page.getByTestId("ising-state-panel").innerText(),/CONNECTED Cᶻᶻᵢⱼ/);
  assert.equal(await page.getByTestId("observable-card-czz_1_0").count(),1,"loaded sidecar links the selected site's correlation row");
  assert.match(await page.getByTestId("ising-state-panel").innerText(),/omitted probability/);
  await page.getByRole("button",{name:"Focus correlation row 1"}).click();
  await page.getByTestId("scientific-reference-coordinate").filter({hasText:"Stored site 1"}).waitFor();
  await page.getByRole("button",{name:"Select Ising site 2"}).click();
  await page.getByTestId("scientific-reference-coordinate").filter({hasText:"Stored site 2"}).waitFor();
  assert.match(await page.getByTestId("scientific-reference-availability").innerText(),/full ground-state vector are unavailable/);
  assert.equal(await page.getByTestId("scientific-reference-run").getAttribute("title"),preservedManyBodyRunId);
  assert.equal(await page.getByTestId("many-body-inspector-site").innerText(),await page.getByTestId("many-body-site-value-1").innerText());
  assert.equal(await page.getByRole("button",{name:"Select Ising site 2"}).getAttribute("aria-pressed"),"true");
  assert.ok(Number(await page.getByTestId("many-body-gap").textContent()) >= 0);
  assert.ok(Number(await page.getByTestId("many-body-entropy").textContent()) >= 0);
  const manyBodyStoredInputs=await page.getByTestId("many-body-inspector-inputs").innerText();
  await page.getByRole("spinbutton", { name: "Many-body sites" }).fill("5");
  await page.getByTestId("many-body-result").getByText("OUT OF DATE").waitFor();
  await page.getByTestId("many-body-inspector-state").filter({hasText:"Edited draft · showing stored run"}).waitFor();
  assert.equal(await page.getByTestId("many-body-inspector-inputs").innerText(),manyBodyStoredInputs);
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  await page.getByRole("button",{name:`Open Ising chain ${preservedManyBodyRunId}`}).click();
  await page.getByTestId("workspace-run-id").filter({hasText:preservedManyBodyRunId}).waitFor();
  assert.equal(await page.getByTestId("scientific-reference").count(),0,"reopening does not invent an Ising selection");
  assert.equal(await page.getByTestId("observable-workspace").count(),0,"reopening does not invent an observable selection");
  await page.getByTestId("many-body-inspector-state").filter({hasText:"Run inputs match the draft"}).waitFor();
  assert.equal(await page.getByTestId("many-body-inspector-energy").count(),0);
  assert.equal(await page.getByTestId("many-body-inspector-site").count(),0);
  assert.equal(await page.getByTestId("ising-state-panel").count(),0,"reopening does not invent a state view");
  await page.getByTestId("inspect-ising-state").click();
  await page.getByTestId("ising-state-panel").waitFor({timeout:30000});
  await page.getByRole("spinbutton",{name:"Many-body sites"}).fill("5");
  if (gpu.engines.quspin?.available) {
    await page.getByRole("combobox", { name: "Many-body engine" }).selectOption("compare");
    await page.getByTestId("run-many-body").click();
    await page.getByTestId("many-body-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
    assert.match(await page.getByTestId("many-body-compare").textContent(), /QuSpin versus Native/);
  }
  await page.screenshot({ path: "artifacts/desktop-many-body.png", fullPage: true });
  await page.getByRole("tab",{name:"Sweeps",exact:true}).click();
  await page.getByTestId("ising-study-lab").waitFor();
  await page.getByRole("spinbutton",{name:"Ising sweep samples"}).fill("3");
  await page.getByTestId("run-ising-study").click();
  await page.getByTestId("ising-study-status").filter({hasText:"Study complete"}).waitFor({timeout:30000});
  assert.match(await page.getByTestId("ising-study-progress").innerText(),/3\/3 verified points/);
  assert.equal(await page.getByTestId("ising-study-charts").locator("svg").count(),5);
  preservedIsingStudyId=(await page.evaluate(()=>window.quantum.listIsingStudies()))[0].studyId;
  const selectedIsingRun=await page.getByTestId("ising-study-selection").locator("code").innerText();
  await page.getByTestId("open-ising-point").click();
  await page.getByTestId("workspace-run-id").filter({hasText:selectedIsingRun}).waitFor();
  await page.getByRole("tab",{name:"Sweeps",exact:true}).click();
  await page.getByTestId(`open-ising-study-${preservedIsingStudyId}`).click();
  await page.getByTestId("ising-study-status").filter({hasText:"Verified saved study reopened"}).waitFor();
  await page.getByRole("tab",{name:"Explore",exact:true}).click();
  await page.getByRole("spinbutton", { name: "Many-body sites" }).fill("5");
  await page.getByTestId("save-workspace").click();
  await page.getByTestId("workspace-message").filter({ hasText: "Workspace saved" }).waitFor();
  await page.getByRole("spinbutton", { name: "Many-body sites" }).fill("6");
  await page.getByTestId("restore-workspace").click();
  await page.waitForFunction(() => document.querySelector('input[aria-label="Many-body sites"]')?.value === "5");
  await expandGroup(page,"circuits");
  await page.getByRole("button", { name: /Transmon circuit/ }).click();
  await page.getByTestId("run-circuit").click();
  await page.getByTestId("circuit-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  await page.getByTestId("circuit-result").waitFor();
  preservedCircuitRunId=await page.getByTestId("workspace-run-id").innerText();
  assert.equal(await page.getByTestId("circuit-inspector-inputs").locator("code").getAttribute("title"),preservedCircuitRunId);
  assert.equal(await page.getByTestId("circuit-inspector-energy").count(),0);
  await page.getByRole("button",{name:"Select circuit E1"}).click();
  await page.getByTestId("circuit-inspector-energy").waitFor();
  assert.equal(await page.getByRole("button",{name:"Select circuit E1"}).getAttribute("aria-pressed"),"true");
  assert.equal(await page.getByTestId("circuit-level-mark-1").locator("line").getAttribute("stroke"),"#f2b36f");
  assert.match(await page.getByTestId("circuit-inspector-diagnostics").innerText(),/not a convergence proof/);
  assert.ok(Number(await page.getByTestId("circuit-e01").textContent()) > 0);
  assert.ok(Number(await page.getByTestId("circuit-cutoff").textContent()) >= 0);
  const circuitStoredInputs=await page.getByTestId("circuit-inspector-inputs").innerText();
  await page.getByRole("spinbutton", { name: "Circuit ncut" }).fill("13");
  await page.getByTestId("circuit-result").getByText("OUT OF DATE").waitFor();
  await page.getByTestId("circuit-inspector-state").filter({hasText:"Edited draft · showing stored run"}).waitFor();
  assert.equal(await page.getByTestId("circuit-inspector-inputs").innerText(),circuitStoredInputs);
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  await page.getByRole("button",{name:`Open Transmon circuit ${preservedCircuitRunId}`}).click();
  await page.getByTestId("workspace-run-id").filter({hasText:preservedCircuitRunId}).waitFor();
  await page.getByTestId("circuit-inspector-state").filter({hasText:"Run inputs match the draft"}).waitFor();
  assert.equal(await page.getByTestId("circuit-inspector-energy").count(),0,"reopening does not invent a level selection");
  await page.getByRole("spinbutton",{name:"Circuit ncut"}).fill("13");
  if (gpu.engines.scqubits?.available) {
    await page.getByRole("combobox", { name: "Circuit engine" }).selectOption("compare");
    await page.getByTestId("run-circuit").click();
    await page.getByTestId("circuit-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
    assert.match(await page.getByTestId("circuit-compare").textContent(), /scqubits versus Native/);
  }
  await page.screenshot({ path: "artifacts/desktop-circuit.png", fullPage: true });
  await page.getByTestId("save-workspace").click();
  await page.getByTestId("workspace-message").filter({ hasText: "Workspace saved" }).waitFor();
  await page.getByRole("spinbutton", { name: "Circuit ncut" }).fill("14");
  await page.getByTestId("restore-workspace").click();
  await page.waitForFunction(() => document.querySelector('input[aria-label="Circuit ncut"]')?.value === "13");
  await page.getByRole("button", { name: "Volume VIII presets", exact: true }).click();
  await page.getByTestId("preset-page").waitFor();
  assert.equal(await page.locator(".preset-card").count(), 6);
  await page.screenshot({ path: "artifacts/desktop-presets.png", fullPage: true });
  await page.getByRole("button", { name: "Open Resonant Rabi oscillation" }).click();
  await page.getByTestId("preset-loaded").getByText(/Resonant Rabi oscillation/).waitFor();
  await page.getByTestId("evolution-state").filter({ hasText: "PRESET LOADED" }).waitFor();
  await page.waitForFunction(() => document.querySelector('input[aria-label="Drive frequency ω"]')?.value === "0");
  await page.getByTestId("run-evolution").click();
  await page.getByTestId("evolution-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  assert.match(await page.getByTestId("preset-check").textContent(), /ANALYTIC CHECK PASSED/);
  await page.getByRole("button", { name: "Volume VIII presets", exact: true }).click();
  await page.getByRole("button", { name: "Open Landau–Zener crossing" }).click();
  await page.getByTestId("evolution-state").filter({ hasText: "PRESET LOADED" }).waitFor();
  await page.getByTestId("run-evolution").click();
  await page.getByTestId("evolution-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  assert.match(await page.getByTestId("preset-check").textContent(), /ASYMPTOTIC REFERENCE ONLY/);
  await page.getByRole("button", { name: "Volume VIII presets", exact: true }).click();
  await page.getByRole("button", { name: "Open Jaynes–Cummings vacuum Rabi" }).click();
  await page.getByTestId("cavity-state").filter({ hasText: "PRESET LOADED" }).waitFor();
  await page.getByTestId("run-cavity").click();
  await page.getByTestId("cavity-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  assert.match(await page.getByTestId("preset-check").textContent(), /ANALYTIC CHECK PASSED/);
  for (const title of ["T₁ relaxation", "Pure dephasing", "Damped cavity occupation"]) {
    await page.getByRole("button", { name: "Volume VIII presets", exact: true }).click();
    await page.getByRole("button", { name: `Open ${title}` }).click();
    await page.getByTestId("preset-loaded").getByText(new RegExp(title)).waitFor();
    await page.getByTestId("lindblad-state").filter({ hasText: "PRESET LOADED" }).waitFor();
    await page.getByTestId("run-lindblad").click();
    await page.getByTestId("lindblad-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
    assert.match(await page.getByTestId("preset-check").textContent(), /ANALYTIC CHECK PASSED/);
  }
  await page.getByTestId("lindblad-result").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/desktop-preset-cavity-loss.png", fullPage: true });
  await page.getByTestId("save-workspace").click();
  await page.getByTestId("workspace-message").filter({ hasText: "Workspace saved" }).waitFor();
  await page.getByLabel("Open initial photons").fill("1");
  await page.getByRole("button",{name:/Two-level system/}).click();
  await page.getByTestId("restore-workspace").click();
  await page.getByLabel("Open initial photons").waitFor();
  await page.waitForFunction(() => document.querySelector('input[aria-label="Open initial photons"]')?.value === "2");
  assert.ok(await page.getByTestId("preset-loaded").getByText(/Damped cavity occupation/).isVisible());
  await page.getByRole("tab", { name: "Runs" }).click();
  await page.getByTestId("saved-run").first().waitFor();
  const savedRuns = await page.evaluate(() => window.quantum.listRuns());
  assert.ok(savedRuns.length >= 6);
  const motionRun=savedRuns.find(r=>r.operation==="oscillator_evolve");
  assert.ok(motionRun,"free motion is listed in durable runs");
  preservedMotionRunId=motionRun.runId;
  const driveRun=savedRuns.find(r=>r.operation==="oscillator_drive");
  assert.ok(driveRun,"driven motion is listed in durable runs");
  preservedDriveRunId=driveRun.runId;
  const pulseRun=savedRuns.find(r=>r.operation==="oscillator_pulse");
  assert.ok(pulseRun,"Gaussian pulses are listed in durable runs");
  preservedPulseRunId=pulseRun.runId;
  const latest = savedRuns[0].runId;
  preservedRunId = latest;
  await mkdir("artifacts/exports", { recursive: true });
  for(const format of ["csv","svg","manifest"]){
    const destination=resolve(`artifacts/exports/oscillator-pulse.${format}`);
    await app.evaluate(({dialog},output)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:output});},destination);
    await page.getByRole("button",{name:`Export ${format.toUpperCase()} ${pulseRun.runId}`}).click();
    await page.getByRole("status").filter({hasText:`Exported ${format.toUpperCase()}`}).waitFor();
    const v=await readFile(destination,"utf8");
    if(format==="csv")assert.match(v,/number_exact,energy,power,c0_re,c0_im/);
    if(format==="svg"){assert.match(v,/q_mean/);assert.match(v,/p_mean/);assert.doesNotMatch(v,/q_variance/);}
    if(format==="manifest"){const m=JSON.parse(v);assert.equal(m.result.operation,"oscillator_pulse");assert.equal(m.job.model.parameters.envelope,"gaussian");assert.equal(m.job.model.parameters.pulseWidth,1.5);assert.equal(m.job.solver.maxStep,.01);assert.equal(m.result.analysis.energyOffset,.5);assert.equal(m.result.data.sha256,pulseRun.artifactSha256);}
  }
  for(const format of ["csv","svg","manifest"]){
    const destination=resolve(`artifacts/exports/oscillator-drive.${format}`);
    await app.evaluate(({dialog},output)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:output});},destination);
    await page.getByRole("button",{name:`Export ${format.toUpperCase()} ${driveRun.runId}`}).click();
    await page.getByRole("status").filter({hasText:`Exported ${format.toUpperCase()}`}).waitFor();
    const v=await readFile(destination,"utf8");
    if(format==="csv")assert.match(v,/number_exact,energy,power,c0_re,c0_im/);
    if(format==="svg"){assert.match(v,/q_mean/);assert.match(v,/p_mean/);}
    if(format==="manifest"){const m=JSON.parse(v);assert.equal(m.result.operation,"oscillator_drive");assert.equal(m.result.analysis.energyOffset,.5);assert.equal(m.result.data.sha256,driveRun.artifactSha256);}
  }
  for(const format of ["csv","svg","manifest"]) {
    const destination=resolve(`artifacts/exports/oscillator-motion.${format}`);
    await app.evaluate(({dialog},output)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:output});},destination);
    await page.getByRole("button",{name:`Export ${format.toUpperCase()} ${motionRun.runId}`}).click();
    await page.getByRole("status").filter({hasText:`Exported ${format.toUpperCase()}`}).waitFor();
    const exported=await readFile(destination,"utf8");
    if(format==="csv")assert.match(exported,/^time,q_mean,p_mean,q_variance,p_variance,/);
    if(format==="svg"){assert.match(exported,/q_mean/);assert.match(exported,/p_mean/);}
    if(format==="manifest"){const v=JSON.parse(exported);assert.equal(v.result.operation,"oscillator_evolve");assert.equal(v.result.data.sha256,motionRun.artifactSha256);}
  }
  for (const [format, extension] of [["csv", "csv"], ["svg", "svg"], ["manifest", "json"]]) {
    const destination = resolve(`artifacts/exports/smoke-${format}.${extension}`);
    await app.evaluate(({ dialog }, output) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: output }); }, destination);
    await page.getByRole("button", { name: `Export ${format.toUpperCase()} ${latest}` }).click();
    await page.getByRole("status").filter({ hasText: `Exported ${format.toUpperCase()}` }).waitFor();
    const exported = await readFile(destination, "utf8");
    assert.ok(exported.length > 50);
    if (format === "svg") assert.match(exported, /<svg xmlns=/);
    if (format === "manifest") assert.equal(JSON.parse(exported).result.runId, latest);
  }
  await page.screenshot({ path: "artifacts/desktop-runs.png", fullPage: true });
  const sceneRun = savedRuns.find(r => r.operation === "evolve");
  assert.ok(sceneRun, "a saved evolution run is available to QVIS");
  await page.getByRole("button",{name:`View scene ${sceneRun.runId}`}).click();
  await page.getByTestId("scenes-page").waitFor();
  assert.ok(await page.locator(".scene-workspace-layout .workspace").evaluate(element=>
    element.getBoundingClientRect().right>=window.innerWidth-2),
    "Scenes uses the full main area instead of retaining a narrow inspector gutter");
  await page.getByTestId("scene-verification").filter({ hasText: "SHA-256 VERIFIED" }).waitFor();
  await page.getByLabel("Scene saved run").locator(`option[value="${sceneRun.runId}"]`).waitFor({state:"attached"});
  assert.equal(await page.getByLabel("Scene saved run").inputValue(),sceneRun.runId,"Runs launches the exact selected run");
  assert.match(await page.getByTestId("scene-bridge-status").innerText(),/Full saved-run scene; no sample was selected/);
  const sceneSource=await page.evaluate(id=>window.quantum.inspectSavedRun(id),sceneRun.runId);
  assert.match(await page.getByTestId("scene-run-id").innerText(),new RegExp(sceneSource.hashes.result));
  assert.ok(await page.locator(".scene-canvas canvas").isVisible() || await page.locator(".scene-fallback").isVisible());
  await page.getByLabel("Inspect scene object").selectOption("bloch-trajectory");
  await page.getByRole("slider", { name: "Scene sample" }).focus();
  await page.getByRole("slider", { name: "Scene sample" }).press("End");
  assert.match(await page.getByTestId("scene-coordinate").innerText(), /sigma_z/);
  const parent = resolve("artifacts/exports");
  await app.evaluate(({ dialog }, folder) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [folder] }); }, parent);
  await page.getByTestId("export-scene").click();
  await page.getByRole("status").filter({ hasText: "Exported verified scene bundle" }).waitFor();
  const bundle = JSON.parse(await readFile(resolve(parent, `${sceneRun.runId}.qscene`, "scene.json"), "utf8"));
  assert.equal(bundle.schema, "quantum-scene/v1");
  assert.equal(bundle.provenance.runId, sceneRun.runId);
  assert.equal(bundle.provenance.resultSha256,sceneSource.hashes.result,"portable scene retains verified result source hash");
  assert.ok(bundle.datasets.some(d => d.id === "trajectory"));
  await page.getByTestId("scene-canvas").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/desktop-scenes.png", fullPage: true });
  const qwzRuns = savedRuns.filter(r => r.model === "qwz");
  await page.getByLabel("Scene saved run").selectOption(qwzRuns[0].runId);
  await page.getByRole("status").filter({ hasText: "undefined at gap closure" }).waitFor();
  assert.ok(await page.getByTestId("export-scene").isDisabled());
  for (const run of [savedRuns.find(r => r.model === "ssh"), qwzRuns[1]]) {
    assert.ok(run);
    await page.getByLabel("Scene saved run").selectOption(run.runId);
    await page.getByTestId("scene-run-id").filter({ hasText: run.runId }).waitFor();
    await page.getByTestId("scene-verification").filter({ hasText: "SHA-256 VERIFIED" }).waitFor();
    await page.getByTestId("scene-canvas").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `artifacts/desktop-scene-${run.model}.png`, fullPage: true });
    await page.getByTestId("topology-inspection").waitFor();
    assert.match(await page.getByTestId("topology-invariant").innerText(),/reported verified/);
    if (run.model === "ssh") assert.ok(await page.getByRole("checkbox", {name:/Intracell A–B/}).isChecked());
    else assert.ok(await page.getByRole("checkbox", {name:"Brillouin-zone boundary at curvature height 0 (not a mesh seam)",exact:true}).isChecked());
  }
  await page.getByLabel("Saved scene view").selectOption("bands");
  for(const run of [savedRuns.find(r=>r.model==="ssh"),qwzRuns[1],qwzRuns[0]]) {
    assert.ok(run);
    await page.getByLabel("Scene saved run").selectOption(run.runId);
    await page.getByTestId("scene-run-id").filter({hasText:run.runId}).waitFor();
    await page.getByTestId("band-inspection").waitFor();
    await page.getByLabel("Band",{exact:true}).selectOption("band-1");
    await page.getByLabel("Scene sample").focus();await page.getByLabel("Scene sample").press("End");
    assert.match(await page.getByTestId("band-sample").innerText(),/Upper band E=.*separation=/);
    if(run.model==="qwz") {
      await page.getByLabel("Band kx index").selectOption("0");
      await page.getByLabel("Band ky index").selectOption("0");
      assert.match(await page.getByTestId("band-sample").innerText(),/Sample 0/);
    } else {
      await page.getByTestId("band-plot").click();
      assert.match(await page.getByTestId("band-sample").innerText(),/Sample 50/);
    }
    await page.getByTestId("band-inspection").scrollIntoViewIfNeeded();
    await page.screenshot({path:`artifacts/desktop-bands-${run.model}-${run.runId.slice(-6)}.png`,fullPage:true});
  }
  await app.evaluate(({dialog},folder)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[folder]});},parent);
  await page.getByTestId("export-scene").click();
  await page.getByRole("status").filter({hasText:"Exported verified scene bundle"}).waitFor();
  const bandFolder=resolve(parent,`${qwzRuns[0].runId}-bands.qscene`);
  const bandBundle=JSON.parse(await readFile(resolve(bandFolder,"scene.json"),"utf8"));
  assert.equal(bandBundle.bands.kind,"surface");assert.equal(bandBundle.bands.bulkGap,0);
  await app.evaluate(({dialog},folder)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[folder]});},bandFolder);
  await page.getByTestId("import-scene").click();
  await page.getByTestId("scene-source").filter({hasText:"IMPORTED BUNDLE"}).waitFor();
  await page.getByTestId("band-inspection").waitFor();
  assert.ok(await page.getByTestId("export-scene").isDisabled());
  await page.getByRole("button",{name:"Return to saved run"}).click();
  await page.getByLabel("Saved scene view").selectOption("standard");
  const isingSceneRun = savedRuns.find(r => r.model === "ising_chain");
  assert.ok(isingSceneRun);
  await page.getByLabel("Scene saved run").selectOption(isingSceneRun.runId);
  await page.getByTestId("scene-verification").filter({hasText:"SHA-256 VERIFIED"}).waitFor();
  await page.getByLabel("Inspect scene object").selectOption("ising-sites");
  assert.match(await page.getByTestId("scene-coordinate").innerText(), /Scalar/);
  await page.getByTestId("scene-canvas").scrollIntoViewIfNeeded();
  await page.screenshot({path:"artifacts/desktop-scene-ising.png",fullPage:true});
  await app.evaluate(({ dialog }) => { dialog.showOpenDialog = async () => ({ canceled: true, filePaths: [] }); });
  await page.getByTestId("export-scene").click();
  await page.getByRole("status").filter({ hasText: "Scene export cancelled" }).waitFor();
  const rejectedScene = await page.evaluate(async () => {
    try { await window.quantum.getScene("../outside"); return false; } catch { return true; }
  });
  assert.ok(rejectedScene, "scene IPC rejects renderer path traversal");
  await page.getByTestId("open-orbitals").click();
  await page.getByRole("tab",{name:"Theory",exact:true}).click();
  assert.equal(await page.locator("[data-testid=model-theory] h2").innerText(),"Atomic orbitals");
  assert.match(await page.getByTestId("theory-visual").innerText(),/electron probability cloud/);
  await page.screenshot({path:"artifacts/desktop-theory-orbitals.png",fullPage:true});
  await page.getByRole("tab",{name:"Explore",exact:true}).click();
  await page.getByTestId("run-orbital").click();
  await page.getByTestId("orbital-result").waitFor();
  preservedOrbitalRunId=await page.getByTestId("workspace-run-id").innerText();
  await page.getByRole("slider",{name:"Orbital radial sample"}).focus();
  await page.keyboard.press("End");
  await page.getByTestId("orbital-inspector-selection").filter({hasText:"Radius / a₀"}).waitFor();
  await page.getByTestId("field-verification").filter({hasText:"SHA-256 VERIFIED"}).waitFor();
  await page.getByTestId("field-slice").click();
  await page.getByTestId("orbital-inspector-selection").filter({hasText:"Voxel index"}).waitFor();
  assert.match(await page.getByTestId("orbital-inspector-selection").innerText(),/Sampled complex amplitude/);
  assert.equal(await page.getByTestId("orbital-energy").innerText(), "-0.500000");
  await page.getByTestId("field-verification").filter({hasText:"SHA-256 VERIFIED"}).waitFor();
  await page.getByTestId("scene-verification").filter({hasText:"SHA-256 VERIFIED"}).waitFor();
  await page.getByTestId("scene-canvas").scrollIntoViewIfNeeded();
  await page.screenshot({path:"artifacts/desktop-orbital-1s.png",fullPage:true});
  await page.getByRole("button",{name:"2p",exact:true}).click();
  assert.ok(await page.getByTestId("orbital-result").getByText("OUT OF DATE").isVisible());
  await page.getByTestId("run-orbital").click();
  await page.getByTestId("orbital-result").waitFor();
  assert.equal(await page.getByTestId("orbital-energy").innerText(), "-0.125000");
  await page.getByTestId("field-verification").filter({hasText:"SHA-256 VERIFIED"}).waitFor();
  await page.getByLabel("Field quantity").selectOption("real");
  await page.getByRole("checkbox",{name:/^real = [^-]/}).waitFor();
  await page.getByRole("checkbox",{name:/^real = -/}).waitFor();
  assert.equal(await page.getByTestId("field-viewer").count(), 1, "changing orbitals must replace the field, not retain duplicate panels");
  await page.getByTestId("scene-canvas").scrollIntoViewIfNeeded();
  await page.screenshot({path:"artifacts/desktop-orbital-2p.png",fullPage:true});
  await page.getByLabel("Field quantity").selectOption("phase");
  await page.getByTestId("scene-verification").filter({hasText:"SHA-256 VERIFIED"}).waitFor();
  await page.getByTestId("field-slice").click();
  assert.match(await page.getByTestId("field-sample").innerText(),/undefined near a node/);
  await page.getByTestId("scene-canvas").scrollIntoViewIfNeeded();
  await page.screenshot({path:"artifacts/desktop-orbital-phase.png",fullPage:true});
  await app.evaluate(({dialog},folder)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[folder]});},parent);
  await page.getByTestId("export-orbital-scene").click();
  await page.getByRole("status").filter({hasText:"Exported verified scene bundle"}).waitFor();
  const orbitalRun=(await page.evaluate(()=>window.quantum.listRuns())).find(r=>r.operation==="orbital");
  assert.ok(orbitalRun);
  const orbitalBundle=JSON.parse(await readFile(resolve(parent,`${orbitalRun.runId}.qscene`,"scene.json"),"utf8"));
  assert.equal(orbitalBundle.fields[0].kind,"complex-field");
  await page.getByTestId("open-scenes").click();
  await page.getByLabel("Scene saved run").selectOption(orbitalRun.runId);
  await page.getByTestId("scenes-page").getByTestId("field-verification").filter({hasText:"SHA-256 VERIFIED"}).waitFor();
  const importedFolder = resolve(parent, `${orbitalRun.runId}.qscene`);
  const importedBefore = await readFile(resolve(importedFolder,"scene.json"),"utf8");
  const runCount = await page.evaluate(()=>window.quantum.listRuns().then(r=>r.length));
  await app.evaluate(({dialog},folder)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[folder]});},importedFolder);
  await page.getByTestId("import-scene").click();
  await page.getByTestId("scene-source").filter({hasText:"IMPORTED BUNDLE"}).waitFor();
  await page.getByTestId("scenes-page").getByTestId("field-verification").filter({hasText:"SHA-256 VERIFIED"}).waitFor();
  assert.ok(await page.getByTestId("export-scene").isDisabled());
  assert.equal(await readFile(resolve(importedFolder,"scene.json"),"utf8"),importedBefore);
  assert.equal(await page.evaluate(()=>window.quantum.listRuns().then(r=>r.length)),runCount);
  await page.getByTestId("scenes-page").getByTestId("field-slice").scrollIntoViewIfNeeded();
  await page.screenshot({path:"artifacts/desktop-imported-field.png",fullPage:true});
  await app.evaluate(({dialog})=>{dialog.showOpenDialog=async()=>({canceled:true,filePaths:[]});});
  await page.getByTestId("import-scene").click();
  await page.getByRole("status").filter({hasText:"Scene import cancelled"}).waitFor();
  assert.match(await page.getByTestId("scene-source").innerText(),/IMPORTED BUNDLE/);
  await page.getByRole("button",{name:"Return to saved run"}).click();
  await page.getByTestId("scene-source").filter({hasText:"SAVED NUMERICAL RUN"}).waitFor();
  await page.getByTestId("scenes-page").getByTestId("field-verification").filter({hasText:"SHA-256 VERIFIED"}).waitFor();
  const primitiveFolder = resolve(parent, `${sceneRun.runId}.qscene`);
  await app.evaluate(({dialog},folder)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[folder]});},primitiveFolder);
  await page.getByTestId("import-scene").click();
  await page.getByTestId("scene-source").filter({hasText:"IMPORTED BUNDLE"}).waitFor();
  await page.getByTestId("scenes-page").getByTestId("scene-verification").filter({hasText:"SHA-256 VERIFIED"}).waitFor();
  const {writeFile,unlink}=await import("node:fs/promises");
  const extraFile=resolve(primitiveFolder,"unexpected.txt");
  try {
    await writeFile(extraFile,"not part of the bundle",{flag:"wx"});
    await page.getByTestId("import-scene").click();
    await page.getByRole("status").filter({hasText:"unexpected"}).waitFor();
    assert.match(await page.getByTestId("scene-run-id").innerText(),new RegExp(sceneRun.runId));
  }finally{await unlink(extraFile);}
  await page.getByTestId("open-orbitals").click();
  await page.getByRole("button",{name:"1s",exact:true}).click();
  await page.getByTestId("run-orbital-study").click();
  await page.getByRole("status").filter({hasText:"Study complete · 4 verified saved runs"}).waitFor();
  const gridRows=page.getByTestId("orbital-study-row");
  assert.equal(await gridRows.count(),4);
  assert.equal(await gridRows.nth(0).locator("td").nth(1).innerText(),await gridRows.nth(3).locator("td").nth(1).innerText());
  await page.getByTestId("orbital-convergence").scrollIntoViewIfNeeded();
  await page.screenshot({path:"artifacts/desktop-orbital-grid-study.png",fullPage:true});
  await page.getByLabel("Orbital convergence mode").selectOption("box");
  await page.getByTestId("run-orbital-study").click();
  await page.getByRole("status").filter({hasText:"Study complete · 4 verified saved runs"}).waitFor();
  assert.equal(await gridRows.nth(0).locator("td").nth(2).innerText(),await gridRows.nth(3).locator("td").nth(2).innerText());
  await page.getByTestId("orbital-convergence").scrollIntoViewIfNeeded();
  await page.screenshot({path:"artifacts/desktop-orbital-box-study.png",fullPage:true});
  await page.getByRole("button",{name:"2s",exact:true}).click();
  assert.ok(await page.getByTestId("orbital-convergence").getByText("OUT OF DATE").isVisible());
  await page.getByTestId("run-orbital").click();
  await page.getByTestId("orbital-radial-nodes").filter({hasText:"2.000000 a₀"}).waitFor();
  assert.equal(await page.getByTestId("radial-node-marker").count(),1);
  await page.getByRole("img",{name:"Orbital radial probability"}).scrollIntoViewIfNeeded();
  await page.screenshot({path:"artifacts/desktop-orbital-nodes.png",fullPage:true});
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  await page.getByRole("button",{name:`Open hydrogenic orbital ${preservedOrbitalRunId}`}).click();
  await page.getByTestId("workspace-run-id").filter({hasText:preservedOrbitalRunId}).waitFor();
  await page.getByTestId("orbital-inspector-state").filter({hasText:"Run inputs match the draft"}).waitFor();
  assert.equal(await page.getByTestId("orbital-inspector-value").count(),0,"orbital reopen invents no sample");
  await page.getByTestId("field-verification").filter({hasText:"SHA-256 VERIFIED"}).waitFor();
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  const otherOrbitalRunId=await page.evaluate(id=>window.quantum.listRuns().then(r=>r.find(v=>v.operation==="orbital"&&v.runId!==id)?.runId),preservedOrbitalRunId);
  assert.ok(otherOrbitalRunId,"a second real orbital run exists for aligned comparison");
  await page.getByRole("button",{name:`Pin A ${preservedOrbitalRunId}`}).click();
  await page.getByRole("button",{name:`Pin B ${preservedOscillatorRunIds.oscillator}`}).click();
  await page.getByTestId("open-comparison").click();
  await page.getByTestId("comparison-status").filter({hasText:"Metadata only"}).waitFor();
  assert.match(await page.getByTestId("comparison-context").innerText(),/different operation or model/i);
  assert.match(await page.getByTestId("comparison-status").innerText(),/Different operation or model/);
  assert.equal(await page.getByTestId("comparison-delta").count(),0,"cross-model comparison invents no physical delta");
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  await page.getByRole("button",{name:`Pin B ${otherOrbitalRunId}`}).click();
  preservedComparisonPins={a:preservedOrbitalRunId,b:otherOrbitalRunId};
  await page.getByTestId("open-comparison").click();
  await page.getByTestId("comparison-status").filter({hasText:"Aligned"}).waitFor();
  assert.match(await page.getByTestId("comparison-context").innerText(),/Aligned recorded observables/);
  await page.getByLabel("Comparison observable").selectOption({label:"Energy · Hartree"});
  await page.getByTestId("comparison-delta").waitFor();
  assert.match(await page.getByTestId("comparison-diagnostics").innerText(),/analysis.energyHartree/);
  await page.screenshot({path:"artifacts/desktop-run-comparison.png",fullPage:true});
  assert.match(await page.getByTestId("comparison-provenance").innerText(),/Python/);
  await page.getByRole("tab",{name:"Scenes",exact:true}).click();
  const examplePage=page.getByTestId("scenes-page");
  const beforeExamples=await page.evaluate(()=>window.quantum.listRuns().then(r=>r.length));
  for(const family of ["square","honeycomb","simple_cubic"]) {
    await page.getByLabel("Geometry family").selectOption(family);
    await page.getByTestId("open-geometry-example").click();
    // A previous verified fixture remains visible while the new one loads.
    await examplePage.getByRole("heading",{name:new RegExp(`^${family.replaceAll("_"," ")} · .*open geometry fixture$`)}).waitFor();
    await examplePage.getByTestId("scene-source").filter({hasText:"GEOMETRY FIXTURE"}).waitFor();
    await examplePage.getByTestId("scene-verification").filter({hasText:"SHA-256 VERIFIED"}).waitFor();
    await examplePage.getByLabel("Inspect scene object").selectOption("lattice-sites-object");
    await examplePage.getByTestId("lattice-site-inspection").waitFor();
    await examplePage.getByTestId("scene-canvas").scrollIntoViewIfNeeded();
    await page.screenshot({path:`artifacts/desktop-lattice-${family}.png`,fullPage:true});
  }
  assert.equal(await page.evaluate(()=>window.quantum.listRuns().then(r=>r.length)),beforeExamples);
  await examplePage.getByLabel("Geometry view").selectOption("reciprocal");
  for(const family of ["square","honeycomb","simple_cubic"]) {
    await examplePage.getByLabel("Geometry family").selectOption(family);
    await examplePage.getByTestId("open-geometry-example").click();
    await examplePage.getByRole("heading",{name:`${family.replaceAll("_"," ")} · primitive reciprocal fixture`,exact:true}).waitFor();
    await examplePage.getByTestId("reciprocal-inspection").waitFor();
    await examplePage.getByLabel("Reciprocal point").selectOption(family==="honeycomb"?"K":family==="square"?"M":"R");
    await examplePage.getByTestId("reciprocal-point-value").filter({hasText:"rad / schematic"}).waitFor();
    await examplePage.getByLabel("Reciprocal path").selectOption("symmetry-path");
    await examplePage.getByLabel("Scene sample").focus();await examplePage.getByLabel("Scene sample").press("End");
    await examplePage.getByTestId("reciprocal-inspection").scrollIntoViewIfNeeded();
    await page.screenshot({path:`artifacts/desktop-reciprocal-${family}.png`,fullPage:true});
  }
  const exampleParent=resolve("artifacts",`lattice-export-${Date.now()}`);
  await mkdir(exampleParent);
  await app.evaluate(({dialog},parent)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[parent]});},exampleParent);
  await examplePage.getByTestId("export-scene").click();
  await examplePage.getByRole("status").filter({hasText:"Exported verified scene bundle"}).waitFor();
  const {readdir}=await import("node:fs/promises");
  const exampleBundle=resolve(exampleParent,(await readdir(exampleParent))[0]);
  await app.evaluate(({dialog},folder)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[folder]});},exampleBundle);
  await examplePage.getByTestId("import-scene").click();
  await examplePage.getByTestId("scene-source").filter({hasText:"IMPORTED BUNDLE"}).waitFor();
  assert.equal(await page.evaluate(()=>window.quantum.listRuns().then(r=>r.length)),beforeExamples);
  assert.ok(await page.evaluate(async()=>{try{await window.quantum.getSceneExample({family:"square",repeats:[99,1,1],path:"../outside"});return false;}catch{return true;}}));
  await examplePage.getByRole("button",{name:"Return to saved run"}).click();
  await examplePage.getByLabel("Scene saved run").selectOption(orbitalRun.runId);
  await examplePage.getByTestId("field-verification").filter({hasText:"SHA-256 VERIFIED"}).waitFor();
  await app.evaluate(({dialog},folder)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[folder]});},parent);
  await examplePage.getByTestId("export-scene-stream").click();
  await examplePage.getByRole("status").filter({hasText:"Exported verified scene bundle"}).waitFor();
  const lodFolder=resolve(parent,`${orbitalRun.runId}-lod.qscene`);
  await app.evaluate(({dialog},folder)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[folder]});},lodFolder);
  await examplePage.getByTestId("import-scene-stream").click();
  await examplePage.getByTestId("stream-status").filter({hasText:"displayed: Coarse display subset"}).waitFor();
  await examplePage.getByTestId("refine-scene").click();
  await examplePage.getByTestId("stream-status").filter({hasText:"displayed: Full supplied samples"}).waitFor();
  assert.ok(await examplePage.getByTestId("export-scene").isDisabled());
  assert.ok(await page.evaluate(async()=>{try{await window.quantum.readSceneChunk("unknown","../secret");return false;}catch{return true;}}));
  const rerunOperations=["diagonalize","evolve","cavity","lindblad","sweep","many_body","circuit","topology","orbital",
    "oscillator","oscillator_evolve","oscillator_drive","oscillator_pulse","oscillator_damped","oscillator_parametric","oscillator_anharmonic"];
  const rerunCases=rerunOperations.flatMap(operation=>operation==="evolve"?
    ["driven_two_level","landau_zener","stuckelberg","strong_drive"].map(model=>({operation,model})):
    operation==="cavity"?["jaynes_cummings","quantum_rabi"].map(model=>({operation,model})):
    operation==="topology"?["ssh","qwz"].map(model=>({operation,model})):[{operation,model:null}]);
  const rerunSources=await page.evaluate(()=>window.quantum.listRuns());
  for(const {operation,model} of rerunCases){
    const label=model?`${operation}/${model}`:operation;
    const candidates=rerunSources.filter(run=>run.operation===operation&&(!model||run.model===model)).sort((a,b)=>a.durationMs-b.durationMs);
    assert.ok(candidates.length,`UI-7 needs a real saved ${label} source`);
    let inspection=null;
    for(const candidate of candidates){
      const reviewed=await page.evaluate(id=>window.quantum.inspectSavedRun(id),candidate.runId);
      if(reviewed.preflight.ready){inspection=reviewed;break;}
    }
    assert.ok(inspection,`UI-7 requires a ready saved ${label} engine`);
    const sourceId=inspection.summary.runId;
    const newRun=await page.evaluate(({id,fingerprint})=>window.quantum.rerunSaved(id,fingerprint),
      {id:sourceId,fingerprint:inspection.preflight.fingerprint});
    assert.equal(newRun.parentRunId,sourceId,`${label} rerun retains parent identity`);
    assert.notEqual(newRun.runId,sourceId,`${label} rerun has a new run ID`);
    const [source,child,childInspection]=await page.evaluate(async ids=>{
      const [a,b,c]=await Promise.all([window.quantum.getVerifiedRun(ids[0]),window.quantum.getVerifiedRun(ids[1]),window.quantum.inspectSavedRun(ids[1])]);
      return [a,b,c];
    },[sourceId,newRun.runId]);
    assert.deepEqual({...child.job,jobId:source.job.jobId},source.job,`${label} retains exact stored inputs`);
    assert.equal(child.result.operation,operation);
    if(model)assert.equal(child.result.model.type,model);
    assert.equal(childInspection.lineageStatus,"verified-parent");
    assert.equal(childInspection.lineage.parentJobSha256,inspection.hashes.job);
    assert.equal(childInspection.lineage.parentResultSha256,inspection.hashes.result);
    if(source.data)assert.ok(child.data?.byteLength>0,`${label} child has a verified binary artifact`);
    if(operation==="evolve"&&!preservedBinaryRerunId)preservedBinaryRerunId=newRun.runId;
    console.log(`UI-7 verified rerun: ${label}`);
  }
  const portableParent=resolve("artifacts/exports");
  await mkdir(portableParent,{recursive:true});
  await app.evaluate(({dialog},folder)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[folder]});},portableParent);
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  await page.getByRole("button",{name:`Export portable run ${preservedRerunId}`}).click();
  await page.getByRole("status").filter({hasText:"Exported portable run"}).waitFor();
  portableInlineBundle=resolve(portableParent,`${preservedRerunId}.qrun`);
  portableBinaryBundle=await page.evaluate(id=>window.quantum.exportRunBundle(id),preservedBinaryRerunId);
  assert.ok(portableBinaryBundle);
  portableHashes=await page.evaluate(async ids=>Promise.all(ids.map(async id=>(await window.quantum.inspectSavedRun(id)).hashes)),
    [preservedRerunId,preservedBinaryRerunId]);
  await app.evaluate(({dialog},folder)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[folder]});},portableInlineBundle);
  await page.getByTestId("import-run-bundle").click();
  await page.getByRole("status").filter({hasText:"already exists"}).waitFor();
  assert.ok(await page.evaluate(async()=>{try{await window.quantum.importRunBundle("renderer-path");return false;}catch{return true;}}),
    "renderer cannot select arbitrary import paths");
  assert.deepEqual(errors, []);
  console.log(
    "PASS: Electron → QuTiP/Native labs, sweeps and presets; orbital studies; lattice/reciprocal fixtures, supplied SSH/QWZ bands including gap closure, shared sample selection, verified export/import; durable runs, workspace restore, integrity, cancellation, restart and sandbox.",
  );
} catch (error) {
  console.error("Renderer errors:", errors);
  const page = await app.firstWindow();
  console.error("Renderer alerts:", await page.getByRole("alert").allTextContents());
  console.error("Field state:", (await page.getByTestId("field-viewer").allTextContents()).slice(0, 2));
  await page.screenshot({path:"artifacts/desktop-smoke-failure.png",fullPage:true}).catch(() => {});
  throw error;
} finally {
  await app.close();
}
const reopened = await electron.launch({ args: ["."], env });
try {
  const page = await reopened.firstWindow();
  await page.getByTestId("worker-status").filter({ hasText: "READY" }).waitFor({ timeout: 45000 });
  await page.getByRole("tab", { name: "Runs" }).click();
  const runIds = await page.evaluate(() => window.quantum.listRuns().then(runs => runs.map(run => run.runId)));
  assert.deepEqual(await page.evaluate(()=>window.quantum.getRunComparisonPins()),preservedComparisonPins,"A/B pins survive full Electron restart by ID");
  await page.getByRole("tab",{name:"Analysis",exact:true}).click();
  await page.getByTestId("comparison-status").filter({hasText:"Aligned"}).waitFor();
  assert.match(await page.getByTestId("comparison-context").innerText(),/QVIS-018/);
  assert.equal(await page.getByTestId("comparison-pin-a").getAttribute("title"),preservedComparisonPins.a);
  assert.equal(await page.getByTestId("comparison-pin-b").getAttribute("title"),preservedComparisonPins.b);
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  assert.ok(runIds.includes(preservedRunId), "saved run must survive app restart");
  assert.ok(runIds.includes(preservedMotionRunId),"saved motion amplitudes survive full restart");
  assert.ok(runIds.includes(preservedDriveRunId),"saved driven amplitudes survive full restart");
  assert.ok(runIds.includes(preservedPulseRunId),"saved pulse envelope and coefficients survive full restart");
  assert.ok(runIds.includes(preservedSpectrumRunId),"saved spectrum survives full restart");
  assert.ok(runIds.includes(preservedRerunId),"linked rerun survives full restart");
  const persistedLineage=await page.evaluate(id=>window.quantum.inspectSavedRun(id),preservedRerunId);
  assert.equal(persistedLineage.lineage.parentRunId,preservedSpectrumRunId);
  assert.ok(runIds.includes(preservedRabiRunId),"saved Rabi evolution survives full restart");
  await page.getByRole("button",{name:`View scene ${preservedRabiRunId}`}).click();
  await page.getByTestId("scene-verification").filter({hasText:"SHA-256 VERIFIED"}).waitFor();
  await page.getByLabel("Scene saved run").locator(`option[value="${preservedRabiRunId}"]`).waitFor({state:"attached"});
  assert.equal(await page.getByLabel("Scene saved run").inputValue(),preservedRabiRunId);
  const restartedSceneSource=await page.evaluate(id=>window.quantum.inspectSavedRun(id),preservedRabiRunId);
  assert.match(await page.getByTestId("scene-run-id").innerText(),new RegExp(restartedSceneSource.hashes.result));
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  for(const runId of Object.values(preservedPassageRunIds))assert.ok(runIds.includes(runId),`saved evolution ${runId} survives full restart`);
  for(const runId of Object.values(preservedCavityRunIds))assert.ok(runIds.includes(runId),`saved cavity ${runId} survives full restart`);
  assert.ok(runIds.includes(preservedLindbladRunId),"saved Lindblad run survives full restart");
  assert.ok(runIds.includes(preservedCircuitRunId),"saved Transmon run survives full restart");
  assert.ok(runIds.includes(preservedManyBodyRunId),"saved Ising-chain run survives full restart");
  for(const runId of Object.values(preservedSweepRunIds))assert.ok(runIds.includes(runId),`saved sweep ${runId} survives full restart`);
  for(const runId of Object.values(preservedTopologyRunIds))assert.ok(runIds.includes(runId),`saved topology ${runId} survives full restart`);
  assert.ok(runIds.includes(preservedOrbitalRunId),"saved orbital grid survives full restart");
  for(const runId of Object.values(preservedOscillatorRunIds))assert.ok(runIds.includes(runId),`saved oscillator ${runId} survives full restart`);
  const reopenedStudy=await page.evaluate(id=>window.quantum.getSpectrumStudy(id),preservedStudyId);
  assert.equal(reopenedStudy.status,"completed","verified study manifest survives full Electron restart");
  assert.equal(reopenedStudy.points.length,3);
  await page.getByRole("button",{name:`Open spectrum ${preservedSpectrumRunId}`}).click();
  await page.getByTestId("workspace-run-id").filter({hasText:preservedSpectrumRunId}).waitFor();
  assert.equal(await page.getByTestId("scientific-selection").count(),0,"reopening after restart invents no selection");
  assert.equal(await page.getByTestId("scientific-reference").count(),0,"restart does not restore an unstored scientific cursor");
  assert.equal(await page.getByTestId("two-level-state-view").count(),1,"verified saved state view reopens after restart");
  assert.equal(await page.getByTestId("state-view-prompt").count(),1,"restart does not invent a selected eigenstate");
  await page.getByRole("button",{name:"Select upper energy E plus"}).click();
  assert.equal(await page.getByTestId("scientific-reference-run").getAttribute("title"),preservedSpectrumRunId,
    "a new post-restart selection references only the reopened verified run");
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  await page.getByRole("button",{name:`Open Rabi evolution ${preservedRabiRunId}`}).click();
  await page.getByTestId("workspace-run-id").filter({hasText:preservedRabiRunId}).waitFor();
  await page.getByTestId("rabi-inspector-time").filter({hasText:"0.0000"}).waitFor();
  assert.equal(await page.getByTestId("rabi-inspector-state").innerText(),"Run inputs match the draft");
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  for(const [operation,runId] of Object.entries(preservedOscillatorRunIds)){
    await page.getByRole("button",{name:`Open ${operation} ${runId}`}).click();
    await page.getByTestId("workspace-run-id").filter({hasText:runId}).waitFor();
    await page.getByTestId("oscillator-inspector-state").filter({hasText:"Run inputs match the draft"}).waitFor();
    assert.match(await page.getByTestId("oscillator-inspector-inputs").innerText(),new RegExp(operation));
    if(operation==="oscillator"||operation==="oscillator_anharmonic")assert.equal(await page.getByTestId("oscillator-inspector-value").count(),0,"inline reopening does not invent an energy selection");
    await page.getByRole("tab",{name:"Runs",exact:true}).click();
  }
  for(const [kind,dimension,view] of [["line","1d","sweep-line"],["heatmap","2d","sweep-heatmap"]]){
    const runId=preservedSweepRunIds[kind];
    await page.getByRole("button",{name:`Open Rabi dynamics final-population sweep ${runId}`}).click();
    await page.getByTestId("workspace-run-id").filter({hasText:runId}).waitFor();
    await page.getByTestId(view).waitFor();
    assert.equal(await page.getByRole("combobox",{name:"Sweep dimension"}).inputValue(),dimension);
    assert.equal(await page.getByTestId("sweep-inspector-value").count(),0,"restart reopening does not invent a sweep cell");
    await page.getByTestId("sweep-inspector-state").filter({hasText:"Run inputs match the draft"}).waitFor();
    await page.getByRole("tab",{name:"Runs",exact:true}).click();
  }
  for(const [kind,model] of [["ssh","SSH"],["qwz","QWZ"],["closed","QWZ"]]){
    const runId=preservedTopologyRunIds[kind];
    await page.getByRole("button",{name:`Open ${model} topology ${runId}`}).click();
    await page.getByTestId("workspace-run-id").filter({hasText:runId}).waitFor();
    assert.equal(await page.getByRole("combobox",{name:"Topology model"}).inputValue(),model.toLowerCase());
    assert.equal(await page.getByTestId("topology-selected-value").count(),0,"restart reopening does not invent a topology sample");
    await page.getByTestId("topology-inspector-state").filter({hasText:"Run inputs match the draft"}).waitFor();
    if(kind==="closed")assert.match(await page.getByTestId("topology-inspector-diagnostics").innerText(),/undefined at gap closure/);
    await page.getByRole("tab",{name:"Runs",exact:true}).click();
  }
  await page.getByRole("button",{name:`Open hydrogenic orbital ${preservedOrbitalRunId}`}).click();
  await page.getByTestId("workspace-run-id").filter({hasText:preservedOrbitalRunId}).waitFor();
  await page.getByTestId("field-verification").filter({hasText:"SHA-256 VERIFIED"}).waitFor();
  assert.equal(await page.getByTestId("orbital-inspector-value").count(),0,"restart reopening does not invent an orbital sample");
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  for(const [label,runId,diagnostic] of [
    ["Landau–Zener",preservedPassageRunIds.landau,"inspector-lz-reference"],
    ["Stückelberg",preservedPassageRunIds.stuckelberg,"inspector-stuckelberg-crossings"],
    ["Floquet / strong drive",preservedPassageRunIds.floquet,"inspector-quasienergies"],
  ]){
    await page.getByRole("button",{name:`Open ${label} evolution ${runId}`}).click();
    await page.getByTestId("workspace-run-id").filter({hasText:runId}).waitFor();
    await page.getByTestId("evolution-inspector-state").filter({hasText:"Run inputs match the draft"}).waitFor();
    assert.ok(await page.getByTestId(diagnostic).isVisible());
    await page.getByRole("tab",{name:"Runs",exact:true}).click();
  }
  for(const [label,runId] of [["Jaynes–Cummings",preservedCavityRunIds.jaynes],["Quantum Rabi",preservedCavityRunIds.quantumRabi]]){
    await page.getByRole("button",{name:`Open ${label} cavity ${runId}`}).click();
    await page.getByTestId("workspace-run-id").filter({hasText:runId}).waitFor();
    await page.getByTestId("cavity-inspector-state").filter({hasText:"Run inputs match the draft"}).waitFor();
    assert.equal(await page.getByTestId("cavity-inspector-time").innerText(),"0.0000");
    await page.getByRole("tab",{name:"Runs",exact:true}).click();
  }
  await page.getByRole("button",{name:`Open Lindblad dynamics ${preservedLindbladRunId}`}).click();
  await page.getByTestId("workspace-run-id").filter({hasText:preservedLindbladRunId}).waitFor();
  await page.getByTestId("lindblad-inspector-state").filter({hasText:"Run inputs match the draft"}).waitFor();
  assert.equal(await page.getByTestId("lindblad-inspector-time").innerText(),"0.0000");
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  await page.getByRole("button",{name:`Open Transmon circuit ${preservedCircuitRunId}`}).click();
  await page.getByTestId("workspace-run-id").filter({hasText:preservedCircuitRunId}).waitFor();
  await page.getByTestId("circuit-inspector-state").filter({hasText:"Run inputs match the draft"}).waitFor();
  assert.equal(await page.getByTestId("circuit-inspector-energy").count(),0);
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  await page.getByRole("button",{name:`Open Ising chain ${preservedManyBodyRunId}`}).click();
  await page.getByTestId("workspace-run-id").filter({hasText:preservedManyBodyRunId}).waitFor();
  await page.getByTestId("many-body-inspector-state").filter({hasText:"Run inputs match the draft"}).waitFor();
  assert.equal(await page.getByTestId("many-body-inspector-energy").count(),0);
  assert.equal(await page.getByTestId("many-body-inspector-site").count(),0);
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  const pulseExport=resolve("artifacts/exports/oscillator-pulse-restarted.csv");
  await reopened.evaluate(({dialog},output)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:output});},pulseExport);
  await page.getByRole("button",{name:`Export CSV ${preservedPulseRunId}`}).click();
  await page.getByRole("status").filter({hasText:"Exported CSV"}).waitFor();
  assert.match(await readFile(pulseExport,"utf8"),/number_exact,energy,power,c0_re,c0_im/);
  const driveExport=resolve("artifacts/exports/oscillator-drive-restarted.csv");
  await reopened.evaluate(({dialog},output)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:output});},driveExport);
  await page.getByRole("button",{name:`Export CSV ${preservedDriveRunId}`}).click();
  await page.getByRole("status").filter({hasText:"Exported CSV"}).waitFor();
  assert.match(await readFile(driveExport,"utf8"),/number_exact,energy,power,c0_re,c0_im/);
  const motionExport=resolve("artifacts/exports/oscillator-motion-restarted.csv");
  await reopened.evaluate(({dialog},output)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:output});},motionExport);
  await page.getByRole("button",{name:`Export CSV ${preservedMotionRunId}`}).click();
  await page.getByRole("status").filter({hasText:"Exported CSV"}).waitFor();
  assert.match(await readFile(motionExport,"utf8"),/^time,q_mean,p_mean,/);
  await page.getByTestId("restore-workspace").click();
  await page.waitForFunction(() => document.querySelector('input[aria-label="Open initial photons"]')?.value === "2");
  await page.waitForFunction(() => document.querySelector('input[aria-label="Oscillator state"]')?.value === "2");
  assert.ok(await page.getByTestId("preset-loaded").getByText(/Damped cavity occupation/).isVisible());
  await expandGroup(page,"atomic-continuous");
  await page.getByTestId("open-oscillator").click();
  assert.equal(await page.getByRole("tab",{name:"Free dynamics",exact:true}).getAttribute("aria-selected"),"true");
  assert.equal(await page.getByLabel("Motion alphaRe",{exact:true}).inputValue(),"2");
  assert.equal(await page.getByLabel("Motion cutoff",{exact:true}).inputValue(),"64");
  assert.equal(await page.getByLabel("Motion stop",{exact:true}).inputValue(),"100");
  assert.equal(await page.getByLabel("Motion samples",{exact:true}).inputValue(),"1001");
  assert.equal(await page.getByTestId("oscillator-motion-result").count(),0);
  await page.getByRole("tab",{name:"Driven dynamics",exact:true}).click();
  assert.equal(await page.getByLabel("Drive epsilonRe",{exact:true}).inputValue(),".4");
  assert.equal(await page.getByLabel("Drive cutoff",{exact:true}).inputValue(),"64");
  assert.equal(await page.getByLabel("Drive stop",{exact:true}).inputValue(),"10");
  assert.equal(await page.getByLabel("Drive samples",{exact:true}).inputValue(),"1001");
  assert.equal(await page.getByTestId("oscillator-drive-result").count(),0);
  await page.getByRole("tab",{name:"Gaussian pulse",exact:true}).click();
  for(const [key,value] of Object.entries({epsilonRe:".3",epsilonIm:".1",alphaRe:"1.4",cutoff:"32",pulseWidth:"1.25",pulseCenter:"4",maxStep:".01",start:"-2",stop:"8",samples:"101"}))assert.equal(await page.getByLabel(`Pulse ${key}`,{exact:true}).inputValue(),value);
  assert.equal(await page.getByLabel("Pulse engine",{exact:true}).inputValue(),"qutip");
  assert.equal(await page.getByTestId("oscillator-pulse-result").count(),0);
  assert.equal(await page.getByTestId("pulse-convergence").count(),0);
  await page.getByRole("button",{name:"Roadmap",exact:true}).click();
  for(const id of Array.from({length:13},(_,i)=>`D1-${String(i+1).padStart(3,"0")}`)) assert.match(await page.getByTestId(`oscillator-${id}`).innerText(),/Implemented/);
  const profileRoot=await reopened.evaluate(({app})=>app.getPath("userData"));
  const pinnedResultPath=resolve(profileRoot,"runs",preservedComparisonPins.a,"result.json");
  await writeFile(pinnedResultPath,(await readFile(pinnedResultPath,"utf8"))+" ");
  await page.getByRole("tab",{name:"Analysis",exact:true}).click();
  await page.getByRole("alert").filter({hasText:"Pinned run unavailable or altered"}).waitFor();
  assert.equal(await page.getByTestId("comparison-delta").count(),0,"tampered pin has no numerical comparison");
  assert.equal(await page.getByTestId("comparison-context").count(),0,"tampered pin has no contextual deltas");
  assert.deepEqual(await page.evaluate(()=>window.quantum.getRunComparisonPins()),preservedComparisonPins,"tamper does not replace either pin");
  const tamperedScenePath=resolve(profileRoot,"runs",preservedRabiRunId,"result.json");
  await writeFile(tamperedScenePath,(await readFile(tamperedScenePath,"utf8"))+" ");
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  await page.getByRole("button",{name:`View scene ${preservedRabiRunId}`}).click();
  await page.getByRole("status").filter({hasText:/hash|integrity|altered|mismatch/i}).waitFor();
  assert.equal(await page.getByLabel("Scene saved run").inputValue(),preservedRabiRunId,"tampered launch cannot substitute another run");
  assert.equal(await page.getByTestId("scene-verification").count(),0,"tampered source yields no verified scene");
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  await page.getByRole("button",{name:`Open Rabi evolution ${preservedRabiRunId}`}).click();
  await page.getByRole("status").filter({hasText:/hash|integrity|altered|mismatch/i}).waitFor();
  assert.equal(await page.getByTestId("scientific-reference").count(),0,"tampered run cannot create a scientific selection");
  console.log("PASS: saved run and all-lab workspace restore survive full Electron restart.");
} finally {
  await reopened.close();
}
const importEnv={...env,QLAB_TEST_PROFILE:await mkdtemp(join(tmpdir(),"qlab-run-import-"))};
const importedApp=await electron.launch({args:["."],env:importEnv});
try{
  const page=await importedApp.firstWindow();
  await page.getByTestId("worker-status").filter({hasText:"READY"}).waitFor({timeout:45000});
  await page.getByRole("tab",{name:"Runs",exact:true}).click();
  for(const [folder,id,hashes] of [
    [portableInlineBundle,preservedRerunId,portableHashes[0]],
    [portableBinaryBundle,preservedBinaryRerunId,portableHashes[1]],
  ]){
    await importedApp.evaluate(({dialog},path)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[path]});},folder);
    await page.getByTestId("import-run-bundle").click();
    await page.getByRole("status").filter({hasText:`Imported verified run ${id}`}).waitFor();
    const imported=await page.evaluate(runId=>window.quantum.inspectSavedRun(runId),id);
    assert.deepEqual(imported.hashes,hashes,"portable import preserves exact metadata and artifact hashes");
    assert.equal(imported.lineageStatus,"detached-parent","source identity remains explicit without fabricating an imported parent");
    const verified=await page.evaluate(runId=>window.quantum.getVerifiedRun(runId),id);
    if(id===preservedBinaryRerunId)assert.ok(verified.data?.byteLength>0,"portable binary run reopens without source worker files");
  }
  await page.getByRole("button",{name:`Inspect provenance ${preservedRerunId}`}).click();
  assert.match(await page.getByTestId("run-provenance").innerText(),/not present locally/);
  console.log("PASS: portable inline and binary .qrun imports preserve source identity in a fresh Electron profile.");
}finally{await importedApp.close();}
const importedRestart=await electron.launch({args:["."],env:importEnv});
try{
  const page=await importedRestart.firstWindow();
  await page.getByTestId("worker-status").filter({hasText:"READY"}).waitFor({timeout:45000});
  for(const [id,hashes] of [[preservedRerunId,portableHashes[0]],[preservedBinaryRerunId,portableHashes[1]]]){
    const stored=await page.evaluate(runId=>window.quantum.inspectSavedRun(runId),id);
    assert.deepEqual(stored.hashes,hashes,"imported source hashes survive full Electron restart");
    assert.equal(stored.lineageStatus,"detached-parent");
  }
  console.log("PASS: imported .qrun identity and artifacts survive full Electron restart.");
}finally{await importedRestart.close();}
