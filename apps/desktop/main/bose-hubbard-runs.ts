import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, rmdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { assertBoseHubbardJob, isBoseHubbardResult,
  type BoseHubbardJob, type BoseHubbardResult, type BoseHubbardRunSummary } from "../../../packages/contracts/bose-hubbard";
import { consistentBoseHubbardResult } from "../../../packages/models/bose-hubbard";
import { boseHubbardScene } from "../../../packages/quantum-scene/bose-hubbard";

const identifier = /^[A-Za-z0-9_-]{1,100}$/;
const hash = (content: string) => createHash("sha256").update(content).digest("hex");
const validateId = (id: string) => { if (!identifier.test(id)) throw new Error("Invalid dimer run ID"); };

/** Separate storage leaves the frozen quantum-run/v1 schema and its consumers untouched. */
export class BoseHubbardRunStore {
  constructor(private readonly root: string) {}

  async record(job: BoseHubbardJob, result: BoseHubbardResult): Promise<BoseHubbardRunSummary> {
    assertBoseHubbardJob(job);
    if (!isBoseHubbardResult(result) || !consistentBoseHubbardResult(job, result))
      throw new Error("Invalid or inconsistent dimer result");
    validateId(result.runId);
    await mkdir(this.root, { recursive: true });
    const target = join(this.root, result.runId);
    const claim = join(this.root, `.claim-${result.runId}`);
    await mkdir(claim); // Exclusive claim prevents two publishers using one run ID.
    try {
      const stage = await mkdtemp(join(this.root, ".stage-"));
      try {
        const jobText = JSON.stringify(job, null, 2) + "\n";
        const resultText = JSON.stringify(result, null, 2) + "\n";
        const manifest = { schema: "quantum-bose-hubbard-run/v1", runId: result.runId,
          jobSha256: hash(jobText), resultSha256: hash(resultText) };
        await writeFile(join(stage, "job.json"), jobText, { flag: "wx" });
        await writeFile(join(stage, "result.json"), resultText, { flag: "wx" });
        await writeFile(join(stage, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
        try { await lstat(target); throw new Error("Dimer run already exists"); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
        await rename(stage, target);
        return { runId: result.runId, computedAt: result.provenance.computedAt,
          particles: job.model.parameters.particles,
          interactionRatio: job.model.parameters.interactionRatio,
          resultSha256: manifest.resultSha256 };
      } catch (error) { await rm(stage, { recursive: true, force: true }); throw error; }
    } finally { await rmdir(claim); }
  }

  private async load(runId: string): Promise<{result: BoseHubbardResult; resultSha256: string}> {
    validateId(runId);
    const directory = join(this.root, runId);
    const info = await lstat(directory);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Invalid dimer run directory");
    for (const name of ["manifest.json", "job.json", "result.json"]) {
      const item = await lstat(join(directory, name));
      if (!item.isFile() || item.isSymbolicLink() || item.size > 256 * 1024)
        throw new Error("Invalid dimer run file");
    }
    const [manifestText, jobText, resultText] = await Promise.all([
      readFile(join(directory, "manifest.json"), "utf8"),
      readFile(join(directory, "job.json"), "utf8"),
      readFile(join(directory, "result.json"), "utf8"),
    ]);
    const manifest = JSON.parse(manifestText);
    if (manifest.schema !== "quantum-bose-hubbard-run/v1" || manifest.runId !== runId ||
        !/^[a-f0-9]{64}$/.test(manifest.jobSha256) ||
        !/^[a-f0-9]{64}$/.test(manifest.resultSha256) ||
        manifest.jobSha256 !== hash(jobText) || manifest.resultSha256 !== hash(resultText))
      throw new Error("Dimer run failed integrity check");
    const job: unknown = JSON.parse(jobText), result: unknown = JSON.parse(resultText);
    assertBoseHubbardJob(job);
    if (!isBoseHubbardResult(result) || result.runId !== runId ||
        !consistentBoseHubbardResult(job, result))
      throw new Error("Dimer run failed scientific consistency check");
    return { result, resultSha256: manifest.resultSha256 };
  }

  async get(runId: string): Promise<BoseHubbardResult> {
    return (await this.load(runId)).result;
  }

  async scene(runId: string, stateIndex: number) {
    const { result, resultSha256 } = await this.load(runId);
    return boseHubbardScene(result, resultSha256, stateIndex,
      async bytes => createHash("sha256").update(bytes).digest("hex"));
  }

  async list(): Promise<BoseHubbardRunSummary[]> {
    await mkdir(this.root, { recursive: true });
    const entries = await readdir(this.root, { withFileTypes: true });
    const summaries: BoseHubbardRunSummary[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || !identifier.test(entry.name)) continue;
      try {
        const { result, resultSha256 } = await this.load(entry.name);
        summaries.push({ runId: result.runId, computedAt: result.provenance.computedAt,
          particles: result.model.parameters.particles,
          interactionRatio: result.model.parameters.interactionRatio,
          resultSha256 });
      } catch { /* Never show an incomplete or changed result as a saved run. */ }
    }
    return summaries.sort((a, b) => b.computedAt.localeCompare(a.computedAt));
  }
}
