/** Qualify the installed Lab payload, Companion reader, saved dimer, and a real Math3D handoff.
 * Usage: node scripts/accept-rb87-installed.mjs <installed Lab.exe> <Math3D checkout or installed exe>
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { _electron as electron } from "playwright";

const [labArgument, math3dArgument] = process.argv.slice(2);
if (!labArgument || !math3dArgument) throw new Error("Pass installed Lab executable and Math3D target");
const lab = resolve(labArgument), math3d = resolve(math3dArgument);
const installedMath3D = math3d.toLowerCase().endsWith(".exe");
const math3dExecutable = installedMath3D?math3d:join(math3d,"node_modules","electron","dist","electron.exe");
if (!(await stat(lab)).isFile() || !(await stat(join(dirname(lab),"resources","app.asar"))).isFile())
  throw new Error("Lab target is not a packaged executable");
if (installedMath3D) {
  assert.match(basename(math3d),/^Math3D(?: Dev)?\.exe$/i,"Math3D target must be an installed Math3D executable");
  if (!(await stat(math3d)).isFile() || !(await stat(join(dirname(math3d),"resources","app.asar"))).isFile())
    throw new Error("Math3D target is not a complete installed application");
} else {
  const packageInfo=JSON.parse(await readFile(join(math3d,"package.json"),"utf8"));
  assert.equal(packageInfo.name,"math3d","Math3D checkout package name changed");
  for(const file of [math3dExecutable,join(math3d,"dist","main.js"),join(math3d,"renderer","dist","index.html")])
    assert.ok((await stat(file)).isFile(),`Math3D checkout is not built: ${file}`);
}
const processName = basename(math3dExecutable);
function targetProcesses(){
  const raw = execFileSync("powershell.exe",["-NoProfile","-Command",
    `@(Get-CimInstance Win32_Process -Filter \"Name = '${processName}'\" | Select-Object ProcessId,ParentProcessId,ExecutablePath,CommandLine) | ConvertTo-Json -Compress`],
  {encoding:"utf8",timeout:15000});
  const parsed=JSON.parse(raw||"[]");
  return Array.isArray(parsed)?parsed:parsed?[parsed]:[];
}
const before = targetProcesses();
let launchedProcess;
let rendererProcess;
const root = await mkdtemp(join(tmpdir(), "rb87-installed-"));
const profile = join(root, "profile");
const env = { ...process.env, QLAB_TEST_PROFILE: profile, QLAB_MATH3D_HOME: math3d,
  MATH3D_E2E: "1", MATH3D_DEV_USER_DATA_DIR: join(root,"math3d"), MATH3D_SKIP_AUTOSAVE_RECOVERY: "1" };
delete env.ELECTRON_RUN_AS_NODE;
let desktop;
let runId;
let resultHash;
async function launch() {
  desktop = await electron.launch({ executablePath: lab, args: [], env });
  const page = await desktop.firstWindow();
  await page.getByTestId("worker-status").filter({ hasText: "READY" }).waitFor({ timeout: 90000 });
  return page;
}
try {
  let page = await launch();
  await page.getByTestId("open-rb87-companion").click();
  await page.getByTestId("rb87-companion-page").waitFor();
  assert.match(page.url(),/#view\/companion\//);
  assert.equal(await page.getByTestId("atlas-formula").locator("math").count(),1);
  const chapters = await page.evaluate(() => window.quantum.listCompanionChapters());
  assert.equal(chapters.length, 7);
  assert.ok(chapters.every(chapter => chapter.available));
  const readerOpened = desktop.waitForEvent("window");
  await page.getByTestId("open-companion-rb87-iii").click();
  const reader = await readerOpened;
  await reader.waitForLoadState();
  assert.equal(await reader.evaluate(() => document.contentType), "application/pdf");
  assert.match(reader.url(), /Chapter_3_Expanded\.pdf$/);
  await reader.close();
  await page.getByTestId("companion-open-dimer").click();
  await page.getByTestId("bose-hubbard-lab").waitFor();
  await page.getByLabel("Dimer particles N").fill("3");
  await page.getByLabel("Dimer interaction U over J").fill("2");
  await page.getByTestId("run-bose-hubbard").click();
  await page.getByTestId("bose-hubbard-result").waitFor({ timeout: 90000 });
  const [summary] = await page.evaluate(() => window.quantum.listBoseHubbardRuns());
  assert.ok(summary);
  runId = summary.runId; resultHash = summary.resultSha256;
  await desktop.close(); desktop = undefined;

  page = await launch();
  await page.getByTestId("open-rb87-companion").click();
  await page.getByTestId("rb87-companion-page").waitFor();
  assert.ok((await page.evaluate(() => window.quantum.listCompanionChapters())).every(chapter => chapter.available));
  const chapterFile=join(dirname(lab),"resources","rb87-companion","Chapters","Chapter_3_Expanded.pdf");
  const chapterBytes=await readFile(chapterFile);
  try{
    await writeFile(chapterFile,Buffer.concat([chapterBytes,Buffer.from("changed")]));
    const changed=await page.evaluate(() => window.quantum.listCompanionChapters());
    assert.equal(changed.find(chapter=>chapter.id==="rb87-iii")?.available,false);
    await assert.rejects(page.evaluate(() => window.quantum.openCompanionChapter("rb87-iii")),/hash changed/i);
  }finally{await writeFile(chapterFile,chapterBytes);}
  assert.equal((await page.evaluate(() => window.quantum.listCompanionChapters())).find(chapter=>chapter.id==="rb87-iii")?.available,true);
  await page.getByRole("tab", { name: "Runs" }).click();
  await page.getByTestId("saved-dimer-run").waitFor();
  await page.getByTestId("saved-dimer-run").getByRole("button", { name: "Inspect saved dimer" }).click();
  assert.match(await page.getByTestId("dimer-run-inspection").textContent(), /bosons per site/);
  await assert.rejects(page.evaluate(id => window.quantum.openBoseHubbardInMath3D(id,0,"0".repeat(64)),runId), /hash|changed/i);
  const directory = await page.evaluate(({id,hash}) => window.quantum.openBoseHubbardInMath3D(id,0,hash), {id:runId,hash:resultHash});
  assert.ok(directory?.endsWith(".qscene"));
  const sceneBytes = await readFile(join(directory,"scene.json"));
  const bundle = JSON.parse(await readFile(join(directory,"bundle.json"),"utf8"));
  const scene = JSON.parse(sceneBytes.toString("utf8"));
  assert.equal(createHash("sha256").update(sceneBytes).digest("hex"),bundle.scene.sha256);
  assert.equal(scene.provenance.runId,runId);
  assert.equal(scene.provenance.resultSha256,resultHash);
  assert.equal(scene.coordinates.units[2],"bosons per site");
  for(let attempt=0;attempt<40;attempt++){
    launchedProcess=targetProcesses().find(item=>!before.some(old=>old.ProcessId===item.ProcessId)&&
      item.ExecutablePath?.toLowerCase()===math3dExecutable.toLowerCase()&&
      item.CommandLine?.includes("--quantum-scene")&&item.CommandLine?.includes(directory)&&
      !item.CommandLine?.includes(" --type="));
    if(launchedProcess)rendererProcess=targetProcesses().find(item=>item.ParentProcessId===launchedProcess.ProcessId&&item.CommandLine?.includes("--type=renderer"));
    if(launchedProcess&&rendererProcess)break;
    await new Promise(done=>setTimeout(done,250));
  }
  assert.ok(launchedProcess&&rendererProcess,"Math3D did not keep a renderer for the exact saved dimer scene");
  const parentRaw=execFileSync("powershell.exe",["-NoProfile","-Command",
    `Get-CimInstance Win32_Process -Filter 'ProcessId = ${Number(launchedProcess.ParentProcessId)}' | Select-Object ExecutablePath | ConvertTo-Json -Compress`],
  {encoding:"utf8",timeout:15000});
  const parent=JSON.parse(parentRaw);
  assert.equal(parent?.ExecutablePath?.toLowerCase(),lab.toLowerCase(),"Math3D was not launched by the packaged Lab");
  console.log(JSON.stringify({ installedLab:lab, math3dTarget:math3d, math3dTargetKind:installedMath3D?"installed":"checkout", library:"open-after-restart", pdfReader:"open-after-restart", dimerRun:runId, sceneDirectory:directory, sceneHash:bundle.scene.sha256, math3dPid:launchedProcess.ProcessId, math3dParentPid:launchedProcess.ParentProcessId, rendererPid:rendererProcess.ProcessId },null,2));
} finally {
  if(launchedProcess){
    try{execFileSync("taskkill",["/PID",String(launchedProcess.ProcessId),"/T","/F"],{stdio:"ignore"});}
    catch{ /* Math3D may already have closed. */ }
  }
  if (desktop) await desktop.close();
  const safe = resolve(root);
  if (!safe.startsWith(resolve(tmpdir())+sep) || !safe.includes("rb87-installed-")) throw new Error("Unsafe test cleanup path");
  await rm(safe,{recursive:true,force:true,maxRetries:20,retryDelay:250});
}
