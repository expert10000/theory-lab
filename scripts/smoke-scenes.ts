import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { build } from "esbuild";
import { chromium } from "playwright";
import fixture from "../packages/quantum-scene/fixtures/bloch-vector.json";
import fieldFixture from "../packages/quantum-scene/fixtures/complex-field.json";
import latticeFixture from "../packages/quantum-scene/fixtures/lattice-honeycomb.json";
import reciprocalFixture from "../packages/quantum-scene/fixtures/reciprocal-honeycomb.json";
import { assertScene } from "../packages/quantum-scene";

const scene = structuredClone(fixture.scene);
scene.objects[0].label = "Fixture vector";
const values: Record<string, number[]> = { ...fixture.values, "vertices.f64": [0, 0, 0, 1, 0, 0, 0, 1, 0], "triangles.f64": [0, 1, 2], "scalars.f64": [-1, 0, 1] };
scene.datasets = Object.entries(values).map(([path, array]) => {
  const bytes = Buffer.alloc(array.length * 8); array.forEach((v, i) => bytes.writeDoubleLE(v, i * 8));
  const components = path === "scalars.f64" ? 1 : 3;
  return { id: path.slice(0, -4), path, format: "f64le", components, count: array.length / components, unit: "dimensionless", bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
});
// JSON fixture inference is intentionally loose here; assertScene is the boundary.
const extra = [
  { id: "points", label: "Fixture points", kind: "point-cloud", positions: "vertices", scalars: "scalars" },
  { id: "line", label: "Fixture line", kind: "polyline", positions: "vertices" },
  { id: "mesh", label: "Fixture mesh", kind: "mesh", positions: "vertices", indices: "triangles", scalars: "scalars" },
].map(o => ({ ...o, visible: o.id !== "mesh", style: { color: "#79d9c1", opacity: 1, size: .1 } }));
const complete = { ...scene, objects: [...scene.objects, ...extra] }; assertScene(complete);
const source = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {SceneViewer} from './packages/quantum-3d/SceneViewer';
import {FieldViewer} from './packages/quantum-3d/FieldViewer';
import {OrbitalConvergence} from './apps/desktop/renderer/OrbitalConvergence';
import {orbitalJob, ORBITAL_DEFAULTS} from './packages/models/orbital';
import './packages/quantum-3d/scene.css';
import './packages/ui/theme.css';
const fields = location.search.includes('fields');
const lattice = location.search.includes('lattice');
const reciprocal = location.search.includes('reciprocal');
const scene = reciprocal ? ${JSON.stringify(reciprocalFixture.scene)} : lattice ? ${JSON.stringify(latticeFixture.scene)} : fields ? ${JSON.stringify(fieldFixture.scene)} : ${JSON.stringify(complete)};
const values = reciprocal ? ${JSON.stringify(reciprocalFixture.values)} : lattice ? ${JSON.stringify(latticeFixture.values)} : fields ? ${JSON.stringify(fieldFixture.values)} : ${JSON.stringify(values)};
const artifacts = Object.fromEntries(Object.entries(values).map(([path, values]) => {
  const bytes = new Uint8Array(values.length * 8), view = new DataView(bytes.buffer);
  values.forEach((v, i) => view.setFloat64(i*8, v, true)); return [path, bytes];
}));
if (location.search.includes('corrupt')) artifacts['vertices.f64'][0] ^= 1;
// Synthetic bridge exercises renderer scheduling only; worker physics and
// persistence are checked separately by desktop and worker integration tests.
let calls = 0, rejectActive;
globalThis.studyCalls = () => calls;
const bridge = {
  onProgress: () => () => {},
  cancel: async () => { rejectActive?.(new Error('Cancelled')); },
  orbital: async job => {
    calls++;
    if (calls === 2) await new Promise((resolve, reject) => { rejectActive = reject; });
    const p = job.model.parameters;
    return {jobId:job.jobId, runId:job.jobId, model:job.model,
      engine:{name:'native',version:'test'},
      data:{rows:p.grid**3,bytes:p.grid**3*16},
      analysis:{energyHartree:-(p.Z**2)/(2*p.n**2),radialNormalization:1,
        meanRadius:(3*p.n**2-p.l*(p.l+1))/(2*p.Z),gridProbability:0.99,
        radialRadii:Array.from({length:401},(_,i)=>i/10),
        radialProbability:Array(401).fill(0)}};
  }
};
function StudyHarness() {
  const [busy,setBusy] = React.useState(false);
  return <OrbitalConvergence bridge={bridge} preview={orbitalJob('test',ORBITAL_DEFAULTS)} ready={true} busy={busy} onBusy={setBusy}/>;
}
createRoot(document.getElementById('root')).render(location.search.includes('convergence') ? <StudyHarness/> : fields ? <FieldViewer payload={{scene,artifacts}}/> : <SceneViewer payload={{scene, artifacts}} />);
`;
const output = await build({ stdin: { contents: source, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, platform: "browser", format: "esm", write: false, outdir: "memory" });
const js = output.outputFiles.find(f => f.path.endsWith(".js"))!.text;
const css = output.outputFiles.find(f => f.path.endsWith(".css"))!.text;
const server = createServer((req, res) => {
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'");
  res.setHeader("Content-Type", req.url === "/viewer.js" ? "text/javascript" : req.url === "/viewer.css" ? "text/css" : "text/html");
  res.end(req.url === "/viewer.js" ? js : req.url === "/viewer.css" ? css : '<!doctype html><link rel="stylesheet" href="/viewer.css"><div id="root"></div><script type="module" src="/viewer.js"></script>');
});
await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto(origin);
  await page.getByTestId("scene-verification").filter({ hasText: "SHA-256 VERIFIED" }).waitFor();
  await page.locator(".scene-canvas canvas").waitFor();
  assert.equal(await page.getByRole("checkbox", { name: "Fixture mesh" }).isChecked(), false);
  await page.getByRole("checkbox", { name: "Fixture mesh" }).check();
  await page.getByLabel("Inspect scene object").selectOption("mesh");
  await page.getByRole("slider", { name: "Scene sample" }).focus();
  await page.getByRole("slider", { name: "Scene sample" }).press("End");
  assert.match(await page.getByTestId("scene-coordinate").innerText(), /sigma_y = 1\.000000/);
  await page.getByRole("checkbox", { name: "Fixture mesh" }).uncheck();
  assert.equal(await page.getByRole("checkbox", { name: "Fixture mesh" }).isChecked(), false);
  await page.getByRole("button", { name: "Reset camera" }).click();
  await mkdir("artifacts", { recursive: true });
  await page.screenshot({ path: "artifacts/scene-browser.png", fullPage: true });
  await page.goto(`${origin}/?fields`);
  await page.getByTestId("field-verification").filter({hasText:"SHA-256 VERIFIED"}).waitFor();
  await page.getByTestId("scene-verification").filter({hasText:"SHA-256 VERIFIED"}).waitFor();
  await page.getByLabel("Field quantity").selectOption("phase");
  await page.getByTestId("scene-verification").filter({hasText:"SHA-256 VERIFIED"}).waitFor();
  await page.getByTestId("field-slice").click();
  assert.match(await page.getByTestId("field-sample").innerText(),/undefined near a node/);
  await page.getByLabel("Slice normal").selectOption("0");
  await page.getByLabel("Field quantity").selectOption("imaginary");
  await page.getByTestId("scene-verification").filter({hasText:"SHA-256 VERIFIED"}).waitFor();
  await page.screenshot({path:"artifacts/field-browser.png",fullPage:true});
  await page.goto(`${origin}/?reciprocal`);
  await page.getByTestId("reciprocal-inspection").waitFor();
  await page.getByLabel("Reciprocal point").selectOption("K");
  assert.match(await page.getByTestId("reciprocal-point-value").innerText(),/K · k =/);
  await page.getByLabel("Reciprocal path").selectOption("symmetry-path");
  await page.getByLabel("Scene sample").focus();await page.getByLabel("Scene sample").press("End");
  assert.match(await page.getByTestId("reciprocal-point-value").innerText(),/Γ · k =/);
  await page.goto(`${origin}/?lattice`);
  await page.getByTestId("scene-verification").filter({hasText:"SHA-256 VERIFIED"}).waitFor();
  await page.getByLabel("Inspect scene object").selectOption("lattice-sites-object");
  await page.getByRole("slider",{name:"Scene sample"}).focus();
  await page.getByRole("slider",{name:"Scene sample"}).press("End");
  assert.match(await page.getByTestId("lattice-site-inspection").innerText(),/c\(1,1,0\)\/b1 · basis B/);
  await page.getByRole("checkbox",{name:"Primitive cell wireframes"}).uncheck();
  await page.goto(`${origin}/?convergence`);
  await page.getByTestId("run-orbital-study").click();
  await page.getByTestId("orbital-study-row").waitFor();
  await page.getByTestId("cancel-orbital-study").click();
  await page.getByRole("status").filter({hasText:"Study cancelled · 1 completed runs retained"}).waitFor();
  assert.equal(await page.getByTestId("orbital-study-row").count(), 1);
  assert.equal(await page.evaluate(() => (globalThis as any).studyCalls()), 2);
  await page.getByTestId("run-orbital-study").click();
  await page.getByRole("status").filter({hasText:"Study complete · 4 verified saved runs"}).waitFor();
  assert.equal(await page.getByTestId("orbital-study-row").count(), 4);
  assert.equal(await page.evaluate(() => (globalThis as any).studyCalls()), 6);
  await page.getByLabel("Orbital convergence mode").selectOption("box");
  await page.getByText("OUT OF DATE", {exact:true}).waitFor();
  await page.goto(`${origin}/?corrupt`);
  await page.getByRole("alert").filter({ hasText: "integrity failed" }).waitFor();
  assert.equal(await page.locator(".scene-canvas canvas").count(), 0);
  const fallback = await browser.newPage();
  fallback.on("pageerror", e => errors.push(e.message));
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(kind: string, ...args: unknown[]) {
      if (kind.includes("webgl")) return null;
      return original.call(this, kind as "2d", ...args as []);
    } as typeof original;
  });
  await fallback.goto(origin);
  await fallback.getByText(/WebGL unavailable/).waitFor();
  await fallback.getByLabel("Inspect scene object").selectOption("mesh");
  await fallback.getByRole("slider", { name: "Scene sample" }).focus();
  await fallback.getByRole("slider", { name: "Scene sample" }).press("End");
  assert.match(await fallback.getByTestId("scene-coordinate").innerText(), /sigma_y = 1\.000000/);
  assert.deepEqual(errors, []);
  console.log("PASS: independent web renderer, four primitives, strict CSP, convergence cancellation/retained cases, verification, inspection, visibility, camera, corruption rejection and WebGL fallback.");
} finally {
  await browser.close(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
