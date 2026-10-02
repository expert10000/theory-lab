import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { assertJob, isQuantumResult, type QuantumJob, type QuantumResult, type SpectrumResult, type EvolutionResult, type CavityResult, type LindbladResult,
  type RunExportFormat, type RunSummary } from "../../../packages/contracts";
import { consistentTopologyResult } from "../../../packages/models/topology";
import { consistentTwoLevelSpectrum } from "../../../packages/models/two-level-spectrum";
import { consistentOrbitalResult, checkOrbitalData } from "../../../packages/models/orbital";
import { consistentOscillatorResult } from "../../../packages/models/oscillator";
import { consistentOscillatorEvolutionResult, checkOscillatorEvolutionData } from "../../../packages/models/oscillator-dynamics";
import { consistentDrivenOscillatorResult, checkDrivenOscillatorData } from "../../../packages/models/oscillator-drive";
import { consistentPulsedOscillatorResult, checkPulsedOscillatorData } from "../../../packages/models/oscillator-pulse";
import { consistentDampedOscillatorResult, checkDampedOscillatorData } from "../../../packages/models/oscillator-damped";
import { consistentAnharmonicResult } from "../../../packages/models/oscillator-anharmonic";
import { consistentParametricResult, checkParametricData } from "../../../packages/models/oscillator-parametric";
import { sceneFromResult } from "../../../packages/quantum-scene/from-result";
import { bandSceneFromResult } from "../../../packages/quantum-scene/bands";
import { writeSceneBundle } from "../../../packages/quantum-scene/bundle";
import {makeSceneStream} from "../../../packages/quantum-scene/stream";
import {scenePreview} from "../../../packages/quantum-scene/lod";
import {writeStreamBundle} from "../../../packages/quantum-scene/stream-bundle";

const identifier = /^[A-Za-z0-9_-]{1,100}$/;
const sha = (data: Uint8Array | string) => createHash("sha256").update(data).digest("hex");
function verifyId(id: string) {
  if (!identifier.test(id)) throw new Error("Invalid run ID");
}
function artifactName(result: QuantumResult): string | null {
  return "data" in result ? result.data.path : null;
}
function summary(result: QuantumResult): RunSummary {
  return { schema: "quantum-run-manifest/v1", runId: result.runId, jobId: result.jobId,
    operation: result.operation, model: result.model.type, engine: result.engine.name,
    engineVersion: result.engine.version, computedAt: result.provenance.computedAt,
    durationMs: result.provenance.durationMs,
    artifactSha256: "data" in result ? result.data.sha256 : null };
}
export class RunStore {
  constructor(private readonly root: string, private readonly artifactDir: string) {}
  async record(job: QuantumJob, result: QuantumResult): Promise<RunSummary> {
    assertJob(job);
    if (!isQuantumResult(result) || job.jobId !== result.jobId || job.operation !== result.operation ||
        job.engine !== result.engine.name || JSON.stringify(job.model) !== JSON.stringify(result.model))
      throw new Error("Cannot persist a mismatched quantum run");
    if (job.operation === "topology" && (result.operation !== "topology" || !consistentTopologyResult(job, result)))
      throw new Error("Cannot persist inconsistent topology data");
    if (job.operation === "diagonalize" && (result.operation !== "diagonalize" || !consistentTwoLevelSpectrum(job, result)))
      throw new Error("Cannot persist inconsistent two-level spectrum");
    if (job.operation === "orbital" && (result.operation !== "orbital" || !consistentOrbitalResult(job, result)))
      throw new Error("Cannot persist inconsistent orbital data");
    verifyId(result.runId);
    if (job.operation === "oscillator" && (result.operation !== "oscillator" || !consistentOscillatorResult(job, result)))
      throw new Error("Cannot persist inconsistent oscillator data");
    if (job.operation === "oscillator_evolve" && (result.operation !== "oscillator_evolve" || !consistentOscillatorEvolutionResult(job, result)))
      throw new Error("Cannot persist inconsistent oscillator motion");
    if (job.operation === "oscillator_drive" && (result.operation !== "oscillator_drive" || !consistentDrivenOscillatorResult(job, result)))
      throw new Error("Cannot persist inconsistent driven oscillator data");
    if (job.operation === "oscillator_pulse" && (result.operation !== "oscillator_pulse" || !consistentPulsedOscillatorResult(job, result)))
      throw new Error("Cannot persist inconsistent pulsed oscillator data");
    if (job.operation === "oscillator_damped" && (result.operation !== "oscillator_damped" || !consistentDampedOscillatorResult(job, result)))
      throw new Error("Cannot persist inconsistent damped oscillator data");
    if (job.operation === "oscillator_parametric" && (result.operation !== "oscillator_parametric" || !consistentParametricResult(job, result)))
      throw new Error("Cannot persist inconsistent parametric oscillator data");
    if (job.operation === "oscillator_anharmonic" && (result.operation !== "oscillator_anharmonic" || !consistentAnharmonicResult(job, result)))
      throw new Error("Cannot persist inconsistent anharmonic oscillator data");
    // Verify the new binary path before creating a durable run, and persist the
    // exact checked bytes rather than reopening a mutable source artifact.
    let motionData: Buffer | null = null;
    if (result.operation === "oscillator_evolve" || result.operation === "oscillator_drive" || result.operation === "oscillator_pulse" || result.operation === "oscillator_damped" || result.operation === "oscillator_parametric") {
      motionData = await readFile(join(this.artifactDir, result.data.path));
      if (motionData.byteLength !== result.data.bytes || sha(motionData) !== result.data.sha256)
        throw new Error("Run artifact failed integrity check");
      if(result.operation === "oscillator_evolve") checkOscillatorEvolutionData(result, motionData);
      else if(result.operation === "oscillator_drive") checkDrivenOscillatorData(result, motionData);
      else if(result.operation === "oscillator_pulse") checkPulsedOscillatorData(result, motionData);
      else if(result.operation === "oscillator_damped") checkDampedOscillatorData(result, motionData);
      else checkParametricData(result, motionData);
    }
    const dir = join(this.root, result.runId);
    await this.ensureRoot();
    await mkdir(dir, { recursive: false });
    const jobText = JSON.stringify(job, null, 2) + "\n";
    const resultText = JSON.stringify(result, null, 2) + "\n";
    await writeFile(join(dir, "job.json"), jobText, { flag: "wx" });
    await writeFile(join(dir, "result.json"), resultText, { flag: "wx" });
    const name = artifactName(result);
    if (name) {
      if (name !== `${result.jobId}.f64` || basename(name) !== name) throw new Error("Invalid run artifact path");
      const data = motionData ?? await readFile(join(this.artifactDir, name));
      if (!("data" in result) || data.byteLength !== result.data.bytes || sha(data) !== result.data.sha256)
        throw new Error("Run artifact failed integrity check");
      if (result.operation === "orbital") checkOrbitalData(result, data);
      if (result.operation === "oscillator_evolve") checkOscillatorEvolutionData(result, data);
      if (result.operation === "oscillator_drive") checkDrivenOscillatorData(result, data);
      if (result.operation === "oscillator_pulse") checkPulsedOscillatorData(result, data);
      if (result.operation === "oscillator_damped") checkDampedOscillatorData(result, data);
      if (result.operation === "oscillator_parametric") checkParametricData(result, data);
      if (motionData) await writeFile(join(dir, "data.f64"), motionData, { flag: "wx" });
      else await copyFile(join(this.artifactDir, name), join(dir, "data.f64"));
    }
    const manifest = { ...summary(result), files: { job: "job.json", result: "result.json", data: name ? "data.f64" : null },
      hashes: { job: sha(jobText), result: sha(resultText) } };
    await writeFile(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
    return summary(result);
  }
  async ensureRoot() { await mkdir(this.root, { recursive: true }); }
  async list(): Promise<RunSummary[]> {
    await this.ensureRoot();
    const entries = await readdir(this.root, { withFileTypes: true });
    const runs: RunSummary[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || !identifier.test(entry.name)) continue;
      try {
        const value = JSON.parse(await readFile(join(this.root, entry.name, "manifest.json"), "utf8"));
        if (value.schema === "quantum-run-manifest/v1" && value.runId === entry.name &&
            typeof value.jobId === "string" && typeof value.computedAt === "string" &&
            typeof value.model === "string" && typeof value.engineVersion === "string" &&
            typeof value.durationMs === "number" && Number.isFinite(value.durationMs) &&
            (value.artifactSha256 === null || (typeof value.artifactSha256 === "string" && /^[a-f0-9]{64}$/.test(value.artifactSha256))) &&
            ["qutip", "native", "dynamiqs", "quspin", "scqubits"].includes(value.engine) &&
            ["diagonalize", "evolve", "cavity", "lindblad", "sweep", "many_body", "circuit", "topology", "orbital", "oscillator", "oscillator_evolve", "oscillator_drive", "oscillator_pulse", "oscillator_damped", "oscillator_parametric", "oscillator_anharmonic"].includes(value.operation))
          runs.push({ schema: value.schema, runId: value.runId, jobId: value.jobId,
            operation: value.operation, model: value.model, engine: value.engine,
            engineVersion: value.engineVersion, computedAt: value.computedAt,
            durationMs: value.durationMs, artifactSha256: value.artifactSha256 });
      } catch { /* Incomplete or corrupt directories are never listed as saved runs. */ }
    }
    return runs.sort((a, b) => b.computedAt.localeCompare(a.computedAt));
  }
  private async load(runId: string) {
    verifyId(runId);
    const dir = join(this.root, runId);
    const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
    if (manifest.schema !== "quantum-run-manifest/v1" || manifest.runId !== runId ||
        manifest.files?.job !== "job.json" || manifest.files?.result !== "result.json" ||
        !/^[a-f0-9]{64}$/.test(manifest.hashes?.job) || !/^[a-f0-9]{64}$/.test(manifest.hashes?.result))
      throw new Error("Invalid run manifest");
    const jobText = await readFile(join(dir, "job.json"), "utf8");
    const resultText = await readFile(join(dir, "result.json"), "utf8");
    if (sha(jobText) !== manifest.hashes.job || sha(resultText) !== manifest.hashes.result)
      throw new Error("Run metadata failed integrity check");
    const job: unknown = JSON.parse(jobText);
    const result: unknown = JSON.parse(resultText);
    assertJob(job);
    if (!isQuantumResult(result) || result.runId !== runId || result.jobId !== job.jobId ||
        result.operation !== job.operation || result.engine.name !== job.engine || JSON.stringify(result.model) !== JSON.stringify(job.model))
      throw new Error("Stored run has invalid contracts");
    if (job.operation === "topology" && (result.operation !== "topology" || !consistentTopologyResult(job, result)))
      throw new Error("Stored topology data failed consistency check");
    if (job.operation === "diagonalize" && (result.operation !== "diagonalize" || !consistentTwoLevelSpectrum(job, result)))
      throw new Error("Stored two-level spectrum failed consistency check");
    if (job.operation === "orbital" && (result.operation !== "orbital" || !consistentOrbitalResult(job, result)))
      throw new Error("Stored orbital data failed consistency check");
    let data: Buffer | null = null;
    if (job.operation === "oscillator" && (result.operation !== "oscillator" || !consistentOscillatorResult(job, result)))
      throw new Error("Stored oscillator data failed consistency check");
    if (job.operation === "oscillator_evolve" && (result.operation !== "oscillator_evolve" || !consistentOscillatorEvolutionResult(job, result)))
      throw new Error("Stored oscillator motion failed consistency check");
    if (job.operation === "oscillator_drive" && (result.operation !== "oscillator_drive" || !consistentDrivenOscillatorResult(job, result)))
      throw new Error("Stored driven oscillator failed consistency check");
    if (job.operation === "oscillator_pulse" && (result.operation !== "oscillator_pulse" || !consistentPulsedOscillatorResult(job, result)))
      throw new Error("Stored pulsed oscillator failed consistency check");
    if (job.operation === "oscillator_damped" && (result.operation !== "oscillator_damped" || !consistentDampedOscillatorResult(job, result)))
      throw new Error("Stored damped oscillator failed consistency check");
    if (job.operation === "oscillator_parametric" && (result.operation !== "oscillator_parametric" || !consistentParametricResult(job, result)))
      throw new Error("Stored parametric oscillator failed consistency check");
    if (job.operation === "oscillator_anharmonic" && (result.operation !== "oscillator_anharmonic" || !consistentAnharmonicResult(job, result)))
      throw new Error("Stored anharmonic oscillator failed consistency check");
    if ("data" in result) {
      if (manifest.files.data !== "data.f64") throw new Error("Missing run data file");
      data = await readFile(join(dir, "data.f64"));
      if (data.byteLength !== result.data.bytes || sha(data) !== result.data.sha256 ||
          result.data.sha256 !== manifest.artifactSha256)
        throw new Error("Stored numerical data failed integrity check");
      if (result.operation === "orbital") checkOrbitalData(result, data);
      if (result.operation === "oscillator_evolve") checkOscillatorEvolutionData(result, data);
      if (result.operation === "oscillator_drive") checkDrivenOscillatorData(result, data);
      if (result.operation === "oscillator_pulse") checkPulsedOscillatorData(result, data);
      if (result.operation === "oscillator_damped") checkDampedOscillatorData(result, data);
      if (result.operation === "oscillator_parametric") checkParametricData(result, data);
    }
    return { manifest, job, result, data };
  }
  async spectrum(runId:string):Promise<SpectrumResult>{
    const {manifest,job,result,data}=await this.load(runId);
    if(job.operation!=="diagonalize"||result.operation!=="diagonalize"||data!==null||
      manifest.operation!=="diagonalize"||manifest.model!=="two_level"||
      manifest.jobId!==result.jobId||manifest.engine!==result.engine.name||
      manifest.files.data!==null||manifest.artifactSha256!==null)
      throw new Error("Saved run is not a verified two-level spectrum");
    return result;
  }
  async evolution(runId:string):Promise<{result:EvolutionResult;data:Uint8Array}>{
    const {manifest,job,result,data}=await this.load(runId);
    if(job.operation!=="evolve"||result.operation!=="evolve"||
      !["driven_two_level","landau_zener","stuckelberg","strong_drive"].includes(job.model.type)||
      manifest.operation!=="evolve"||manifest.model!==result.model.type||
      manifest.jobId!==result.jobId||manifest.engine!==result.engine.name||
      manifest.files.data!=="data.f64"||!data||
      result.data.columns.length!==10||result.data.rows<2||data.byteLength!==result.data.rows*10*8)
      throw new Error("Saved run is not a verified two-level evolution");
    return {result,data:Uint8Array.from(data)};
  }
  async rabi(runId:string):Promise<{result:EvolutionResult;data:Uint8Array}>{
    let saved:{result:EvolutionResult;data:Uint8Array};
    try { saved=await this.evolution(runId); }
    catch(error) {
      if(error instanceof Error&&error.message==="Saved run is not a verified two-level evolution")
        throw new Error("Saved run is not a verified Rabi evolution");
      throw error;
    }
    if(saved.result.model.type!=="driven_two_level")throw new Error("Saved run is not a verified Rabi evolution");
    return saved;
  }
  async cavity(runId:string):Promise<{result:CavityResult;data:Uint8Array}>{
    const {manifest,job,result,data}=await this.load(runId);
    if(job.operation!=="cavity"||result.operation!=="cavity"||
      !["jaynes_cummings","quantum_rabi"].includes(result.model.type)||
      manifest.operation!=="cavity"||manifest.model!==result.model.type||
      manifest.jobId!==result.jobId||manifest.engine!==result.engine.name||
      manifest.files.data!=="data.f64"||!data||
      result.data.columns.length!==6||result.data.rows<2||data.byteLength!==result.data.rows*6*8)
      throw new Error("Saved run is not a verified cavity evolution");
    return {result,data:Uint8Array.from(data)};
  }
  async lindblad(runId:string):Promise<{result:LindbladResult;data:Uint8Array}>{
    const {manifest,job,result,data}=await this.load(runId);
    if(job.operation!=="lindblad"||result.operation!=="lindblad"||
      result.model.type!=="open_jaynes_cummings"||manifest.operation!=="lindblad"||
      manifest.model!==result.model.type||manifest.jobId!==result.jobId||
      manifest.engine!==result.engine.name||manifest.files.data!=="data.f64"||!data||
      result.data.columns.length!==7||result.data.rows<2||data.byteLength!==result.data.rows*7*8)
      throw new Error("Saved run is not a verified Lindblad evolution");
    return {result,data:Uint8Array.from(data)};
  }
  async export(runId: string, format: RunExportFormat, target: string): Promise<void> {
    const { manifest, job, result, data } = await this.load(runId);
    let output: string;
    if (format === "manifest") output = JSON.stringify({ schema: "quantum-run-export/v1", manifest, job, result }, null, 2) + "\n";
    else if (format === "csv") output = numericalCsv(result, data);
    else if (format === "svg") output = numericalSvg(result, data);
    else throw new Error("Unsupported run export format");
    await writeFile(target, output, "utf8");
  }
  async scene(runId: string, view: "standard"|"bands" = "standard") {
    if(view!=="standard"&&view!=="bands") throw new Error("Unsupported scene view");
    const { manifest, result, data } = await this.load(runId);
    if(view==="bands") return bandSceneFromResult(result,manifest.hashes.result,async bytes=>sha(bytes));
    return sceneFromResult(result, data, manifest.hashes.result, async bytes => sha(bytes));
  }
  async exportScene(runId: string, parent: string, view?: "standard"|"bands",format:"regular"|"stream"="regular") {
    if(format!=="regular"&&format!=="stream")throw new Error("Unsupported scene bundle format");
    const payload=await this.scene(runId,view);
    if(format==="stream"){const digest=async(bytes:Uint8Array)=>sha(bytes),preview=await scenePreview(payload,digest);return writeStreamBundle(await makeSceneStream([{label:"Coarse display subset",payload:preview},{label:"Full supplied samples",payload}],digest),parent);}
    return writeSceneBundle(payload, parent);
  }
}

function rowsOf(result: Extract<QuantumResult, { data: unknown }>, data: Buffer): number[][] {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const stride = result.operation === "sweep" ? 1 : result.data.columns.length;
  const count = result.operation === "sweep" ? result.data.shape.x * result.data.shape.y : result.data.rows;
  return Array.from({ length: count }, (_, row) => Array.from({ length: stride }, (_, col) => view.getFloat64((row * stride + col) * 8, true)));
}
export function numericalCsv(result: QuantumResult, data: Buffer | null): string {
  if(result.operation==="oscillator_anharmonic")
    return ["level,energy,harmonic_energy,shift,units",...result.spectrum.energies.map((energy,index)=>
      `${index},${energy},${result.model.parameters.omega*(index+.5)},${energy-result.model.parameters.omega*(index+.5)},normalized`),
      "",`ground_x2,${result.analysis.groundX2}`,`ground_x4,${result.analysis.groundX4}`,`ground_parity,${result.analysis.groundParity}`].join("\n")+"\n";
  if (result.operation === "oscillator")
    return ["level,energy,units", ...result.spectrum.energies.map((e,n) => `${n},${e},normalized`), "", "q,real_amplitude,density",
      ...result.state.q.map((q,i)=>`${q},${result.state.amplitude[i]},${result.state.density[i]}`)].join("\n")+"\n";
  if (result.operation === "diagonalize")
    return `level,energy,units\nE-,${result.spectrum.eigenvalues[0]},normalized\nE+,${result.spectrum.eigenvalues[1]},normalized\n`;
  if (result.operation === "many_body")
    return ["kind,index,value", ...result.spectrum.lowEnergies.map((energy, index) => `energy,${index},${energy}`),
      ...result.groundState.siteMagnetization.map((value, index) => `site_magnetization,${index},${value}`),
      `gap,0,${result.spectrum.gap}`, `half_chain_entropy,0,${result.groundState.halfChainEntropy}`].join("\n") + "\n";
  if (result.operation === "circuit")
    return ["kind,index,value,units", ...result.spectrum.energies.map((energy, index) => `energy,${index},${energy},GHz`),
      `e01,0,${result.spectrum.e01},GHz`, `e12,0,${result.spectrum.e12},GHz`,
      `anharmonicity,0,${result.spectrum.anharmonicity},GHz`,
      `charge_matrix_element_01,0,${result.spectrum.chargeMatrixElement01},Cooper_pairs`,
      `cutoff_drift_e01,0,${result.spectrum.cutoffDriftE01},GHz`].join("\n") + "\n";
  if (result.operation === "topology") {
    const a = result.analysis;
    if (a.kind === "ssh") return ["k,lower_band,upper_band", ...a.kValues.map((k, i) => `${k},${a.lowerBand[i]},${a.upperBand[i]}`),
      "", "site,midgap_pair_density", ...a.edgeDensity.map((v, i) => `${i},${v}`)].join("\n") + "\n";
    const grid = result.model.type === "qwz" ? result.model.parameters.grid : 1;
    return ["kx_index,ky_index,berry_curvature", ...a.berryCurvature.map((v, i) => `${Math.floor(i / grid)},${i % grid},${v}`)].join("\n") + "\n";
  }
  if (!data) throw new Error("Missing run numerical data");
  const rows = rowsOf(result, data);
  if (result.operation === "orbital") {
    const p = result.model.parameters, step = 2 * p.radius / (p.grid - 1);
    return ["x_a0,y_a0,z_a0,psi_re_a0^-3/2,psi_im_a0^-3/2,density_a0^-3", ...rows.map(([re, im], i) => {
      const x = Math.floor(i / p.grid ** 2), y = Math.floor(i / p.grid) % p.grid, z = i % p.grid;
      return `${-p.radius + step * x},${-p.radius + step * y},${-p.radius + step * z},${re},${im},${re * re + im * im}`;
    })].join("\n") + "\n";
  }
  if (result.operation === "sweep") {
    const x = result.sweep.x, y = result.sweep.y;
    return [`${x.parameter},${y?.parameter ?? "y_index"},final_p1`, ...rows.map(([value], index) => {
      const col = index % result.data.shape.x, row = Math.floor(index / result.data.shape.x);
      const xv = x.start + (x.stop - x.start) * col / (x.points - 1);
      const yv = y ? y.start + (y.stop - y.start) * row / (y.points - 1) : 0;
      return `${xv},${yv},${value}`;
    })].join("\n") + "\n";
  }
  return [result.data.columns.join(","), ...rows.map(row => row.join(","))].join("\n") + "\n";
}
function lineSeries(rows: number[][], col: number, ymin: number, ymax: number) {
  const step = Math.max(1, Math.ceil(rows.length / 1000));
  const indices = Array.from({ length: Math.ceil(rows.length / step) }, (_, i) => i * step);
  if (indices[indices.length - 1] !== rows.length - 1) indices.push(rows.length - 1);
  return indices.map(i => `${70 + i * 760 / Math.max(1, rows.length - 1)},${440 - (rows[i][col] - ymin) * 350 / (ymax - ymin || 1)}`).join(" ");
}
export function numericalSvg(result: QuantumResult, data: Buffer | null): string {
  const title = `${result.model.type} · ${result.engine.name} · ${result.runId}`;
  const head = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 520" role="img"><rect width="900" height="520" fill="#111b24"/><text x="70" y="42" fill="#eef7f5" font-family="sans-serif" font-size="20">${title}</text><path d="M70 90 V440 H830" fill="none" stroke="#7d929e"/>`;
  if (result.operation === "orbital") {
    const a = result.analysis, max = Math.max(...a.radialProbability);
    const points = a.radialProbability.map((v, i) => `${70 + 760 * a.radialRadii[i] / a.radialRadii[400]},${440 - v * 350 / max}`).join(" ");
    const nodes = (a.radialNodes ?? []).map((r,i)=>{const x=70+760*r/a.radialRadii[400];return `<path d="M${x} 90 V440" stroke="#f2b36f" stroke-dasharray="4 4"/><text x="${x+3}" y="${105+i*14}" fill="#f2b36f" font-family="sans-serif" font-size="11">N${i+1}</text>`;}).join("");
    return head + `<polyline points="${points}" stroke="#79d9c1" fill="none" stroke-width="2"/>${nodes}<text x="70" y="480" fill="white" font-family="sans-serif">Radial probability r²|R(r)|² · r in a0 · E = ${a.energyHartree} Hartree</text></svg>\n`;
  }
  if (result.operation === "diagonalize") {
    const [low, high] = result.spectrum.eigenvalues;
    return head + `<path d="M250 360 H650 M250 170 H650" stroke="#79d9c1" stroke-width="4"/><text x="670" y="365" fill="white" font-family="sans-serif">E− ${low.toFixed(6)}</text><text x="670" y="175" fill="white" font-family="sans-serif">E+ ${high.toFixed(6)}</text></svg>\n`;
  }
  if (result.operation === "many_body") {
    const energies = result.spectrum.lowEnergies;
    const low = energies[0], span = Math.max(1e-9, energies[energies.length - 1] - low);
    return head + energies.map((energy, index) => {
      const y = 410 - (energy - low) * 290 / span;
      return `<path d="M${120 + index * 86} ${y} h58" stroke="#79d9c1" stroke-width="4"/><text x="${120 + index * 86}" y="${y - 10}" fill="white" font-family="sans-serif" font-size="11">E${index} ${energy.toFixed(3)}</text>`;
    }).join("") + `</svg>\n`;
  }
  if (result.operation === "circuit" || result.operation === "oscillator" || result.operation === "oscillator_anharmonic") {
    const energies = result.spectrum.energies;
    const low = energies[0], span = Math.max(1e-9, energies[energies.length - 1] - low);
    return head + energies.map((energy, index) => {
      const y = 410 - (energy - low) * 290 / span;
      const x = result.operation === "oscillator" || result.operation === "oscillator_anharmonic" ? 80 + index * 700 / (energies.length - 1) : 120 + index * 86;
      return `<path d="M${x} ${y} h58" stroke="#79d9c1" stroke-width="4"/><text x="${x}" y="${y - 10}" fill="white" font-family="sans-serif" font-size="11">E${index} ${energy.toFixed(3)}</text>`;
    }).join("") + `</svg>\n`;
  }
  if (result.operation === "topology") {
    if (result.analysis.kind === "ssh") {
      const a = result.analysis, scale = Math.max(1e-9, ...a.upperBand);
      const line = (values: number[]) => values.map((v, i) => `${70 + i * 760 / (values.length - 1)},${265 - v * 150 / scale}`).join(" ");
      return head + `<polyline points="${line(a.lowerBand)}" fill="none" stroke="#f2b36f" stroke-width="2"/><polyline points="${line(a.upperBand)}" fill="none" stroke="#79d9c1" stroke-width="2"/><text x="70" y="480" fill="white" font-family="sans-serif">SSH winding ${a.winding ?? "undefined"} · gap ${a.bulkGap.toFixed(6)}</text></svg>\n`;
    }
    const a = result.analysis, grid = result.model.type === "qwz" ? result.model.parameters.grid : 0;
    const max = Math.max(1e-9, ...a.berryCurvature.map(Math.abs));
    const cells = a.berryCurvature.map((v, i) => { const x = Math.floor(i / grid), y = i % grid;
      const intensity = Math.floor(50 + 205 * Math.min(1, Math.abs(v) / max));
      return `<rect x="${70 + x * 350 / grid}" y="${90 + y * 350 / grid}" width="${351 / grid}" height="${351 / grid}" fill="${v >= 0 ? `rgb(${intensity},80,90)` : `rgb(80,${intensity},170)`}"/>`; }).join("");
    return head + cells + `<text x="450" y="480" fill="white" font-family="sans-serif">QWZ Chern ${a.chern ?? (a.gapClosed ? "undefined" : "unresolved")} · gap ${a.bulkGap.toFixed(6)}</text></svg>\n`;
  }
  if (!data) throw new Error("Missing run numerical data");
  const rows = rowsOf(result, data);
  if (result.operation === "sweep" && result.data.shape.y > 1) {
    const xCount = result.data.shape.x, yCount = result.data.shape.y;
    const cells = rows.map(([value], i) => {
      const col = i % xCount, row = Math.floor(i / xCount);
      const alpha = Math.round(35 + Math.max(0, Math.min(1, value)) * 220);
      return `<rect x="${70 + col * 760 / xCount}" y="${90 + (yCount - 1 - row) * 350 / yCount}" width="${760 / xCount + .2}" height="${350 / yCount + .2}" fill="rgb(${255 - alpha},${alpha},180)"/>`;
    }).join("");
    return head + cells + `<text x="450" y="485" text-anchor="middle" fill="#b8c8cf" font-family="sans-serif">${result.sweep.x.parameter}</text><text x="30" y="275" fill="#b8c8cf" font-family="sans-serif">${result.sweep.y?.parameter ?? ""}</text></svg>\n`;
  }
  const cols = result.operation === "sweep" ? [0] : result.operation === "oscillator_parametric" ? [3, 4] : result.operation === "evolve" || result.operation === "oscillator_evolve" || result.operation === "oscillator_drive" || result.operation === "oscillator_pulse" || result.operation === "oscillator_damped" ? [1, 2] : result.operation === "cavity" ? [1, 2] : [1, 3];
  let ymin = 0, ymax = 1;
  for (const row of rows) for (const col of cols) { ymin = Math.min(ymin, row[col]); ymax = Math.max(ymax, row[col]); }
  const lines = cols.map((col, i) => `<polyline points="${lineSeries(rows, col, ymin, ymax)}" fill="none" stroke="${i ? "#f2b36f" : "#79d9c1"}" stroke-width="2.5"/>`).join("");
  const names = result.operation === "sweep" ? ["final P₁"] : cols.map(col => result.data.columns[col]);
  const legend = names.map((name, i) => `<text x="${90 + i * 240}" y="80" fill="${i ? "#f2b36f" : "#79d9c1"}" font-family="sans-serif" font-size="13">${name}</text>`).join("");
  const xLabel = result.operation === "sweep" ? result.sweep.x.parameter : "time";
  return head + lines + legend + `<text x="450" y="485" text-anchor="middle" fill="#b8c8cf" font-family="sans-serif">${xLabel}</text><text x="22" y="270" fill="#b8c8cf" font-family="sans-serif">value</text></svg>\n`;
}
