import { _electron as electron } from "playwright";
import assert from "node:assert/strict";
import { mkdir, mkdtemp } from "node:fs/promises";
import { readFile } from "node:fs/promises";
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
let preservedMotionRunId = null;
let preservedDriveRunId = null;
let preservedPulseRunId = null;
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
  assert.deepEqual(await workspaceModes.getByRole("tab").allTextContents(),
    ["Explore","Dynamics","Sweeps","Analysis","Scenes","Runs"]);
  assert.equal(await workspaceModes.getByRole("tab",{name:"Sweeps"}).isDisabled(),true);
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
      "exportScene",
      "exportSceneExample",
      "getCapabilities",
      "getResources",
      "getScene",
      "getSceneExample",
      "getStatus",
      "importScene",
      "importSceneStream",
      "lindblad",
      "listRuns",
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
      "restart",
      "run",
      "saveWorkspace",
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
  await page.getByRole("button",{name:"Select upper energy E plus"}).click();
  assert.equal(await page.getByRole("button",{name:"Select upper energy E plus"}).getAttribute("aria-pressed"),"true");
  assert.match(await page.getByTestId("scientific-selection").innerText(),/E₊ = 0\.640312/);
  assert.match(await page.getByTestId("scientific-selection").innerText(),/not eigenvectors/);
  await page.screenshot({path:"artifacts/desktop-linked-energy.png",fullPage:true});
  await page.getByRole("tab",{name:"Analysis",exact:true}).click();
  assert.match(await page.getByTestId("scientific-selection").innerText(),/E₊ = 0\.640312/);
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
  await page.getByRole("button",{name:"Restore smoke values"}).click();
  await page.getByRole("button",{name:/Run spectrum/}).click();
  await page.waitForFunction(oldRunId=>document.querySelector('[data-testid="workspace-run-id"]')?.textContent!==oldRunId,selectedRunId);
  assert.equal(await page.getByTestId("scientific-selection").count(),0,"new verified run clears old run-scoped selection");
  await page.getByRole("button",{name:"Select upper energy E plus"}).click();
  await page.getByRole("button",{name:/Rabi dynamics/}).click();
  await page.getByRole("button",{name:/Two-level system/}).click();
  assert.equal(await page.getByTestId("scientific-selection").count(),0,"model change invalidates selection");
  const circuit = await page.evaluate(() => window.quantum.circuit({
    schema: "quantum-job/v1", jobId: `circuit-${crypto.randomUUID()}`, operation: "circuit", engine: "native",
    model: { type: "transmon", parameters: { EJ: 20, EC: 0.25, ng: 0.2, ncut: 12, levels: 5 } },
  }));
  assert.equal(circuit.operation, "circuit");
  assert.ok(circuit.spectrum.e01 > 0 && circuit.spectrum.cutoffDriftE01 < 1e-4);
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
  assert.equal(await page.getByTestId("motion-q").innerText(),"1.414214");
  assert.ok(await page.getByTestId("oscillator-motion-compare").isVisible());
  assert.ok(Number(await page.getByTestId("motion-compare-q").innerText())<1e-7);
  await page.getByLabel("Oscillator motion time cursor",{exact:true}).fill("50");
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
  assert.ok(await page.getByTestId("oscillator-drive-compare").isVisible());
  assert.ok(Number(await page.getByTestId("drive-compare-q").innerText())<1e-7);
  await page.getByRole("slider",{name:"Driven oscillator time cursor"}).fill("50");
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
  assert.match(await page.getByTestId("linked-workspace-status").innerText(),/navigation slice implemented/);
  for(const id of Array.from({length:8},(_,index)=>`QLAB-UI-${index+1}`))
    assert.match(await page.getByTestId(`planned-${id}`).innerText(),id==="QLAB-UI-1"||id==="QLAB-UI-2"?/Partial/:/Planned/);
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
  assert.match(await page.getByTestId("topology-result").innerText(), /WINDING\s+1/);
  await page.screenshot({ path: "artifacts/desktop-ssh.png", fullPage: true });
  await page.getByRole("combobox", { name: "Topology model" }).selectOption("qwz");
  await page.getByTestId("run-topology").click();
  await page.getByTestId("qwz-chern").waitFor();
  assert.equal(await page.getByTestId("qwz-chern").textContent(), "-1");
  await page.screenshot({ path: "artifacts/desktop-qwz.png", fullPage: true });
  await page.getByRole("spinbutton", { name: "QWZ mass" }).fill("0");
  await page.getByTestId("run-topology").click();
  await page.getByTestId("qwz-chern").filter({ hasText: "undefined" }).waitFor();
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
  await page.screenshot({
    path: "artifacts/desktop-dynamics.png",
    fullPage: true,
  });
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
  await page.getByRole("slider", { name: "Time cursor" }).focus();
  await page.getByRole("slider", { name: "Time cursor" }).press("End");
  assert.equal(
    await page.getByTestId("selected-time").textContent(),
    "t = 10.0000",
  );
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
  assert.ok(Number(await page.getByTestId("final-p0").textContent()) >= 0);
  await page.screenshot({
    path: "artifacts/desktop-stuckelberg.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Floquet / strong drive" }).click();
  await page.getByTestId("run-evolution").click();
  await page.getByTestId("evolution-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  await page.getByTestId("floquet-analysis").waitFor();
  assert.ok(Number(await page.getByTestId("quasienergy-0").textContent()) <= Number(await page.getByTestId("quasienergy-1").textContent()));
  assert.equal(await page.getByTestId("floquet-map").locator(".floquet-map-grid > div").count(), 117);
  await page.getByTestId("floquet-analysis").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/desktop-floquet.png", fullPage: true });
  await expandGroup(page,"light-matter");
  await page.getByRole("button", { name: "Jaynes–Cummings" }).click();
  await page.getByTestId("run-cavity").click();
  await page.getByTestId("cavity-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  await page.getByTestId("cavity-result").waitFor();
  assert.ok(Number(await page.getByTestId("jc-reference").textContent()) < 1e-4);
  assert.ok(Number(await page.getByTestId("cavity-boundary").textContent()) < 1e-5);
  assert.equal(await page.getByTestId("dressed-spectrum").locator("span").count(), 12);
  await page.getByTestId("cavity-result").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/desktop-jaynes-cummings.png", fullPage: true });
  await page.getByLabel("Coupling g", { exact: true }).fill("0.4");
  await page.getByTestId("cavity-result-state").filter({ hasText: "OUT OF DATE" }).waitFor();
  await page.getByRole("button", { name: "Quantum Rabi" }).click();
  await page.getByRole("combobox", { name: "Cavity engine" }).selectOption("native");
  await page.getByTestId("run-cavity").click();
  await page.getByTestId("cavity-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  assert.ok(Number(await page.getByTestId("cavity-boundary").textContent()) < 0.02);
  await page.getByTestId("cavity-result").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/desktop-quantum-rabi.png", fullPage: true });
  await expandGroup(page,"open-systems");
  await page.getByRole("button", { name: "Lindblad dynamics" }).click();
  await page.getByTestId("run-lindblad").click();
  await page.getByTestId("lindblad-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  await page.getByTestId("lindblad-result").waitFor();
  assert.ok(Number(await page.getByTestId("minimum-purity").textContent()) < 1);
  assert.ok(Number(await page.getByTestId("open-excited").textContent()) > .99);
  assert.ok(await page.getByTestId("steady-state").getByText("Steady state").isVisible());
  await page.getByTestId("lindblad-result").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/desktop-lindblad.png", fullPage: true });
  await page.getByRole("button", { name: /Rabi dynamics/ }).click();
  await page.getByRole("tab", { name: "Sweeps", exact: true }).click();
  await page.getByRole("combobox", { name: "Sweep engine" }).selectOption("native");
  await page.getByRole("spinbutton", { name: "X axis points" }).fill("5");
  await page.getByTestId("run-sweep").evaluate(element => element.scrollIntoView({ block: "center" }));
  await page.getByTestId("run-sweep").click();
  await page.getByTestId("sweep-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  await page.getByTestId("sweep-line").waitFor();
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
  assert.equal(await page.getByTestId("sweep-heatmap").locator(".sweep-heatmap button").count(), 20);
  await page.screenshot({ path: "artifacts/desktop-sweep-heatmap.png", fullPage: true });
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
  assert.ok(Number(await page.getByTestId("many-body-gap").textContent()) >= 0);
  assert.ok(Number(await page.getByTestId("many-body-entropy").textContent()) >= 0);
  await page.getByRole("spinbutton", { name: "Many-body sites" }).fill("5");
  await page.getByTestId("many-body-result").getByText("OUT OF DATE").waitFor();
  if (gpu.engines.quspin?.available) {
    await page.getByRole("combobox", { name: "Many-body engine" }).selectOption("compare");
    await page.getByTestId("run-many-body").click();
    await page.getByTestId("many-body-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
    assert.match(await page.getByTestId("many-body-compare").textContent(), /QuSpin versus Native/);
  }
  await page.screenshot({ path: "artifacts/desktop-many-body.png", fullPage: true });
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
  assert.ok(Number(await page.getByTestId("circuit-e01").textContent()) > 0);
  assert.ok(Number(await page.getByTestId("circuit-cutoff").textContent()) >= 0);
  await page.getByRole("spinbutton", { name: "Circuit ncut" }).fill("13");
  await page.getByTestId("circuit-result").getByText("OUT OF DATE").waitFor();
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
  await page.getByTestId("open-scenes").click();
  await page.getByTestId("scenes-page").waitFor();
  const sceneRun = savedRuns.find(r => r.operation === "evolve");
  assert.ok(sceneRun, "a saved evolution run is available to QVIS");
  await page.getByLabel("Scene saved run").selectOption(sceneRun.runId);
  await page.getByTestId("scene-verification").filter({ hasText: "SHA-256 VERIFIED" }).waitFor();
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
  await page.getByTestId("run-orbital").click();
  await page.getByTestId("orbital-result").waitFor();
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
  assert.ok(runIds.includes(preservedRunId), "saved run must survive app restart");
  assert.ok(runIds.includes(preservedMotionRunId),"saved motion amplitudes survive full restart");
  assert.ok(runIds.includes(preservedDriveRunId),"saved driven amplitudes survive full restart");
  assert.ok(runIds.includes(preservedPulseRunId),"saved pulse envelope and coefficients survive full restart");
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
  console.log("PASS: saved run and all-lab workspace restore survive full Electron restart.");
} finally {
  await reopened.close();
}
