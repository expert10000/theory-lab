import { createHash, randomUUID } from "node:crypto";
import { link, mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { verifyQecRepetitionStudy, type QecRepetitionRun, type QecRepetitionRunSummary,
  type QecRepetitionStudy } from "../../../packages/contracts/qec-repetition";
import { SceneBuilder } from "../../../packages/quantum-scene/builder";
import type { QuantumScene } from "../../../packages/quantum-scene";
import { boundedRead } from "../../../packages/quantum-scene/bundle";

const sha = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
const canonical = (value: unknown): string => Array.isArray(value) ? `[${value.map(canonical).join(",")}]` :
  value && typeof value === "object" ? `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}` : JSON.stringify(value);
const runIdPattern = /^run-[a-f0-9]{32}$/;
const versionPattern = /^[A-Za-z0-9._+-]{1,64}$/;

function assertRun(value: unknown): asserts value is QecRepetitionRun {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid QEC saved-run record");
  const run = value as QecRepetitionRun;
  if (Object.keys(run).sort().join(",") !== "computedAt,flips,jobId,result,resultSha256,runId,schema,workerVersion" ||
      run.schema !== "qec-repetition-run/v1" || !runIdPattern.test(run.runId) ||
      !/^job-[a-f0-9]{32}$/.test(run.jobId) || !versionPattern.test(run.workerVersion) ||
      typeof run.computedAt !== "string" || !Number.isFinite(Date.parse(run.computedAt)) ||
      new Date(run.computedAt).toISOString() !== run.computedAt ||
      !Array.isArray(run.flips) || run.flips.length < 1 || run.flips.length > 32 ||
      run.flips.some(bit => !Number.isInteger(bit) || bit < -1 || bit > 2) ||
      !run.result || typeof run.result !== "object" || !/^[a-f0-9]{64}$/.test(run.resultSha256))
    throw new Error("Invalid QEC saved-run record");
  const { sha256, ...body } = run.result;
  if (!verifyQecRepetitionStudy(run.flips, run.result) || sha(canonical(body)) !== sha256 ||
      sha(canonical(run.result)) !== run.resultSha256)
    throw new Error("QEC saved-run trace or source hash changed");
}

/** An immutable, bounded result record. This is not a surface-code or quantum-result/v2 run. */
export class QecRepetitionRunStore {
  constructor(private readonly root: string) {}
  private path(runId: string) {
    if (!runIdPattern.test(runId)) throw new Error("Invalid QEC run ID");
    return join(this.root, `${runId}.json`);
  }
  async save(flips: number[], result: QecRepetitionStudy, workerVersion: string): Promise<QecRepetitionRun> {
    const run: QecRepetitionRun = { schema: "qec-repetition-run/v1",
      runId: `run-${randomUUID().replaceAll("-", "")}`, jobId: `job-${randomUUID().replaceAll("-", "")}`,
      computedAt: new Date().toISOString(), workerVersion, flips: [...flips], result,
      resultSha256: sha(canonical(result)) };
    assertRun(run);
    await mkdir(this.root, { recursive: true });
    const payload = JSON.stringify(run), manifest = JSON.stringify({ schema: "qec-repetition-run-manifest/v1",
      payload, sha256: sha(payload) }) + "\n";
    const temporary = join(this.root, `${run.runId}.${randomUUID()}.tmp`);
    await writeFile(temporary, manifest, { flag: "wx" });
    try { await link(temporary, this.path(run.runId)); }
    finally { await unlink(temporary); }
    return run;
  }
  async get(runId: string): Promise<QecRepetitionRun> {
    const bytes = await boundedRead(this.path(runId));
    const manifest: unknown = JSON.parse(Buffer.from(bytes).toString("utf8"));
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) throw new Error("Invalid QEC run manifest");
    const row = manifest as Record<string, unknown>;
    if (Object.keys(row).sort().join(",") !== "payload,schema,sha256" ||
        row.schema !== "qec-repetition-run-manifest/v1" || typeof row.payload !== "string" ||
        typeof row.sha256 !== "string" || sha(row.payload) !== row.sha256)
      throw new Error("QEC run manifest integrity failed");
    const run: unknown = JSON.parse(row.payload); assertRun(run);
    if (run.runId !== runId) throw new Error("QEC run identity changed");
    return run;
  }
  async list(): Promise<QecRepetitionRunSummary[]> {
    await mkdir(this.root, { recursive: true });
    const rows: QecRepetitionRunSummary[] = [];
    for (const name of await readdir(this.root)) if (name.endsWith(".json") && runIdPattern.test(name.slice(0, -5))) {
      try { const run = await this.get(name.slice(0, -5));
        rows.push({ runId: run.runId, computedAt: run.computedAt, resultSha256: run.resultSha256,
          rounds: run.result.rounds.length }); }
      catch { /* Damaged runs are never offered for reopening. */ }
    }
    return rows.sort((a, b) => b.computedAt.localeCompare(a.computedAt));
  }
  async scene(runId: string) {
    const run = await this.get(runId), result = run.result, count = result.rounds.length;
    const scene: QuantumScene = { schema: "quantum-scene/v1", id: `${runId}-qec`,
      title: "Three-bit repetition code · ideal recorded syndromes",
      provenance: { kind: "numerical-result", runId, jobId: run.jobId, model: "qec_repetition_ideal",
        engine: "native", engineVersion: run.workerVersion, computedAt: run.computedAt,
        resultSha256: run.resultSha256, adapter: "qvis/1", parameters: { rounds: count } },
      coordinates: { handedness: "right", axes: ["round", "record lane", "recorded bit"],
        units: ["round", "lane", "bit"] },
      camera: { position: [count / 2 + 8, -15, 9], target: [(count - 1) / 2, 0, 0], up: [0, 0, 1] },
      datasets: [], objects: [], annotations: [
        { id: "scope", text: "Ideal parity checks and prescribed X flips only. Discrete rounds are not physical time; no surface-code or fault-tolerance claim.", position: [0, 5, 0] },
        { id: "decoder", text: `Final minimum-weight correction bit ${result.decoder.correctionBit}; logical result ${result.decoder.logicalResult}; multiple-error ambiguity ${result.decoder.ambiguousMultipleErrors}.`, position: [count - 1, 5, 1] },
      ] };
    const builder = new SceneBuilder(scene, async bytes => sha(bytes));
    const syndromePositions = result.rounds.flatMap(row => row.syndrome.flatMap((bit, check) => [row.round, check, bit]));
    const defectPositions = result.rounds.flatMap(row => row.defects.flatMap((bit, check) => [row.round, check + 2, bit]));
    const bitPositions = result.rounds.flatMap(row => row.dataBits.flatMap((bit, index) => [row.round, -index - 1, bit]));
    const syndrome = await builder.data("qec-syndrome", result.rounds.flatMap(row => row.syndrome), 1, "bit");
    const defects = await builder.data("qec-defects", result.rounds.flatMap(row => row.defects), 1, "bit");
    const bits = await builder.data("qec-data-bits", result.rounds.flatMap(row => row.dataBits), 1, "bit");
    builder.object("syndrome", "Recorded Z parity checks by round", "point-cloud",
      await builder.data("qec-syndrome-position", syndromePositions, 3, "display position"), "#397ec6",
      { scalars: syndrome, style: { color: "#397ec6", opacity: 1, size: .32 } });
    builder.object("defects", "Changes in measured parity by round", "point-cloud",
      await builder.data("qec-defect-position", defectPositions, 3, "display position"), "#e7824d",
      { scalars: defects, style: { color: "#e7824d", opacity: 1, size: .32 } });
    builder.object("data-bits", "Recorded data-bit state by round", "point-cloud",
      await builder.data("qec-bit-position", bitPositions, 3, "display position"), "#79d9c1",
      { scalars: bits, style: { color: "#79d9c1", opacity: 1, size: .32 } });
    if (result.decoder.correctionBit >= 0) builder.object("correction", "Final decoder correction", "point-cloud",
      await builder.data("qec-correction-position", [count, -result.decoder.correctionBit - 1, 1], 3, "display position"), "#f2b36f",
      { style: { color: "#f2b36f", opacity: 1, size: .4 } });
    return builder.finish();
  }
}
