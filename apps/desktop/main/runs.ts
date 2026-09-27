import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { assertJob, isQuantumResult, type QuantumJob, type QuantumResult,
  type RunExportFormat, type RunSummary } from "../../../packages/contracts";

const identifier = /^[A-Za-z0-9_-]{1,100}$/;
const sha = (data: Uint8Array | string) => createHash("sha256").update(data).digest("hex");
function verifyId(id: string) {
  if (!identifier.test(id)) throw new Error("Invalid run ID");
}
function artifactName(result: QuantumResult): string | null {
  return result.operation === "diagonalize" || result.operation === "many_body" ? null : result.data.path;
}
function summary(result: QuantumResult): RunSummary {
  return { schema: "quantum-run-manifest/v1", runId: result.runId, jobId: result.jobId,
    operation: result.operation, model: result.model.type, engine: result.engine.name,
    engineVersion: result.engine.version, computedAt: result.provenance.computedAt,
    durationMs: result.provenance.durationMs,
    artifactSha256: result.operation === "diagonalize" || result.operation === "many_body" ? null : result.data.sha256 };
}
export class RunStore {
  constructor(private readonly root: string, private readonly artifactDir: string) {}
  async record(job: QuantumJob, result: QuantumResult): Promise<RunSummary> {
    assertJob(job);
    if (!isQuantumResult(result) || job.jobId !== result.jobId || job.operation !== result.operation ||
        job.engine !== result.engine.name || JSON.stringify(job.model) !== JSON.stringify(result.model))
      throw new Error("Cannot persist a mismatched quantum run");
    verifyId(result.runId);
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
      const data = await readFile(join(this.artifactDir, name));
      if (result.operation === "diagonalize" || result.operation === "many_body" || data.byteLength !== result.data.bytes || sha(data) !== result.data.sha256)
        throw new Error("Run artifact failed integrity check");
      await copyFile(join(this.artifactDir, name), join(dir, "data.f64"));
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
            ["qutip", "native", "dynamiqs", "quspin"].includes(value.engine) &&
            ["diagonalize", "evolve", "cavity", "lindblad", "sweep", "many_body"].includes(value.operation))
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
        result.operation !== job.operation || result.engine.name !== job.engine)
      throw new Error("Stored run has invalid contracts");
    let data: Buffer | null = null;
    if (result.operation !== "diagonalize" && result.operation !== "many_body") {
      if (manifest.files.data !== "data.f64") throw new Error("Missing run data file");
      data = await readFile(join(dir, "data.f64"));
      if (data.byteLength !== result.data.bytes || sha(data) !== result.data.sha256 ||
          result.data.sha256 !== manifest.artifactSha256)
        throw new Error("Stored numerical data failed integrity check");
    }
    return { manifest, job, result, data };
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
}

function rowsOf(result: Exclude<QuantumResult, { operation: "diagonalize" | "many_body" }>, data: Buffer): number[][] {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const stride = result.operation === "sweep" ? 1 : result.data.columns.length;
  const count = result.operation === "sweep" ? result.data.shape.x * result.data.shape.y : result.data.rows;
  return Array.from({ length: count }, (_, row) => Array.from({ length: stride }, (_, col) => view.getFloat64((row * stride + col) * 8, true)));
}
export function numericalCsv(result: QuantumResult, data: Buffer | null): string {
  if (result.operation === "diagonalize")
    return `level,energy,units\nE-,${result.spectrum.eigenvalues[0]},normalized\nE+,${result.spectrum.eigenvalues[1]},normalized\n`;
  if (result.operation === "many_body")
    return ["kind,index,value", ...result.spectrum.lowEnergies.map((energy, index) => `energy,${index},${energy}`),
      ...result.groundState.siteMagnetization.map((value, index) => `site_magnetization,${index},${value}`),
      `gap,0,${result.spectrum.gap}`, `half_chain_entropy,0,${result.groundState.halfChainEntropy}`].join("\n") + "\n";
  if (!data) throw new Error("Missing run numerical data");
  const rows = rowsOf(result, data);
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
  const cols = result.operation === "sweep" ? [0] : result.operation === "evolve" ? [1, 2] : result.operation === "cavity" ? [1, 2] : [1, 3];
  let ymin = 0, ymax = 1;
  for (const row of rows) for (const col of cols) { ymin = Math.min(ymin, row[col]); ymax = Math.max(ymax, row[col]); }
  const lines = cols.map((col, i) => `<polyline points="${lineSeries(rows, col, ymin, ymax)}" fill="none" stroke="${i ? "#f2b36f" : "#79d9c1"}" stroke-width="2.5"/>`).join("");
  const names = result.operation === "sweep" ? ["final P₁"] : cols.map(col => result.data.columns[col]);
  const legend = names.map((name, i) => `<text x="${90 + i * 240}" y="80" fill="${i ? "#f2b36f" : "#79d9c1"}" font-family="sans-serif" font-size="13">${name}</text>`).join("");
  const xLabel = result.operation === "sweep" ? result.sweep.x.parameter : "time";
  return head + lines + legend + `<text x="450" y="485" text-anchor="middle" fill="#b8c8cf" font-family="sans-serif">${xLabel}</text><text x="22" y="270" fill="#b8c8cf" font-family="sans-serif">value</text></svg>\n`;
}
