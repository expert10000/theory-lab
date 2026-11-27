import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, rmdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { assertBdGSectorJob, isBdGSectorResult,
  type BdGSectorJob, type BdGSectorResult, type BdGSectorRunSummary } from "../../../packages/contracts/bdg-sector";
import { consistentBdGSectorResult } from "../../../packages/models/bdg-sector";

const idPattern = /^[A-Za-z0-9_-]{1,100}$/;
const digest = (text: string) => createHash("sha256").update(text).digest("hex");
const checkId = (id: string) => { if (!idPattern.test(id)) throw new Error("Invalid BdGSector run ID"); };

/** Separate records preserve the frozen quantum-run/v1 contract. */
export class BdGSectorRunStore {
  constructor(private readonly root: string) {}

  async record(job: BdGSectorJob, result: BdGSectorResult): Promise<BdGSectorRunSummary> {
    assertBdGSectorJob(job);
    if (!isBdGSectorResult(result) || !consistentBdGSectorResult(job, result))
      throw new Error("Invalid or inconsistent BdGSector result");
    checkId(result.runId);
    await mkdir(this.root, { recursive: true });
    const target = join(this.root, result.runId);
    const claim = join(this.root, `.claim-${result.runId}`);
    await mkdir(claim);
    try {
      const stage = await mkdtemp(join(this.root, ".stage-"));
      try {
        const jobText = JSON.stringify(job, null, 2) + "\n";
        const resultText = JSON.stringify(result, null, 2) + "\n";
        const manifest = { schema: "quantum-bdg-sector-run/v1", runId: result.runId,
          jobSha256: digest(jobText), resultSha256: digest(resultText) };
        await writeFile(join(stage, "job.json"), jobText, { flag: "wx" });
        await writeFile(join(stage, "result.json"), resultText, { flag: "wx" });
        await writeFile(join(stage, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
        try { await lstat(target); throw new Error("BdGSector run already exists"); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
        await rename(stage, target);
        return { runId: result.runId, computedAt: result.provenance.computedAt,
          parameters: job.model.parameters, minimumPositiveEnergy: result.minimumPositiveEnergy,
          resultSha256: manifest.resultSha256 };
      } catch (error) { await rm(stage, { recursive: true, force: true }); throw error; }
    } finally { await rmdir(claim); }
  }

  private async load(runId: string): Promise<{result: BdGSectorResult; resultSha256: string}> {
    checkId(runId);
    const directory = join(this.root, runId);
    const info = await lstat(directory);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Invalid BdGSector run directory");
    for (const name of ["manifest.json", "job.json", "result.json"]) {
      const file = await lstat(join(directory, name));
      if (!file.isFile() || file.isSymbolicLink() || file.size > 64*1024)
        throw new Error("Invalid BdGSector run file");
    }
    const [manifestText, jobText, resultText] = await Promise.all([
      readFile(join(directory, "manifest.json"), "utf8"),
      readFile(join(directory, "job.json"), "utf8"),
      readFile(join(directory, "result.json"), "utf8"),
    ]);
    const manifest = JSON.parse(manifestText);
    if (manifest.schema !== "quantum-bdg-sector-run/v1" || manifest.runId !== runId ||
        !/^[a-f0-9]{64}$/.test(manifest.jobSha256) ||
        !/^[a-f0-9]{64}$/.test(manifest.resultSha256) ||
        manifest.jobSha256 !== digest(jobText) || manifest.resultSha256 !== digest(resultText))
      throw new Error("BdGSector run failed integrity check");
    const job: unknown = JSON.parse(jobText), result: unknown = JSON.parse(resultText);
    assertBdGSectorJob(job);
    if (!isBdGSectorResult(result) || result.runId !== runId || !consistentBdGSectorResult(job, result))
      throw new Error("BdGSector run failed scientific consistency check");
    return { result, resultSha256: manifest.resultSha256 };
  }

  async get(runId: string): Promise<BdGSectorResult> { return (await this.load(runId)).result; }

  async list(): Promise<BdGSectorRunSummary[]> {
    await mkdir(this.root, { recursive: true });
    const rows: BdGSectorRunSummary[] = [];
    for (const entry of await readdir(this.root, { withFileTypes: true })) {
      if (!entry.isDirectory() || !idPattern.test(entry.name)) continue;
      try {
        const { result, resultSha256 } = await this.load(entry.name);
        rows.push({ runId: result.runId, computedAt: result.provenance.computedAt,
          parameters: result.model.parameters, minimumPositiveEnergy: result.minimumPositiveEnergy, resultSha256 });
      } catch { /* Changed or incomplete source is withheld. */ }
    }
    return rows.sort((a,b) => b.computedAt.localeCompare(a.computedAt));
  }
}
