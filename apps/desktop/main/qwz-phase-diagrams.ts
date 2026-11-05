import { randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { assertQwzPhaseDiagram, type QwzPhaseDiagram, type QwzPhasePoint } from "../../../packages/contracts/qwz-phase-diagram";
import type { RunStore } from "./runs";

export class QwzPhaseDiagramStore {
  constructor(private readonly root: string, private readonly runs: RunStore) {}
  async build(): Promise<QwzPhaseDiagram> {
    const saved = (await this.runs.list()).filter(run => run.operation === "topology" && run.model === "qwz");
    const points: QwzPhasePoint[] = [], cells = new Set<string>();
    for (const item of saved) {
      if (points.length >= 64) break;
      try {
        const source = await this.runs.inspect(item.runId);
        const result = (await this.runs.verified(item.runId)).result;
        if (result.operation !== "topology" || result.model.type !== "qwz" || result.analysis.kind !== "qwz") continue;
        const mass = result.model.parameters.mass, grid = result.model.parameters.grid, cell = `${mass}:${grid}`;
        if (cells.has(cell)) continue;
        const curvature = await this.runs.scene(item.runId, "standard"), bands = await this.runs.scene(item.runId, "bands");
        if (curvature.scene.provenance.resultSha256 !== source.hashes.result ||
            bands.scene.provenance.resultSha256 !== source.hashes.result) continue;
        points.push({ mass, grid, runId: item.runId, resultSha256: source.hashes.result,
          chern: result.analysis.meshResolved && !result.analysis.gapClosed ? result.analysis.chern : null,
          bulkGap: result.analysis.bulkGap, meshResolved: result.analysis.meshResolved,
          gapClosed: result.analysis.gapClosed,
          scenes: { curvature: curvature.scene.id, bands: bands.scene.id } });
        cells.add(cell);
      } catch { /* A changed run cannot contribute to a verified map. */ }
    }
    if (points.length < 2) throw new Error("At least two distinct verified QWZ parameter runs are required");
    points.sort((a, b) => a.grid - b.grid || a.mass - b.mass);
    const diagram: QwzPhaseDiagram = { schema: "quantum-phase-diagram/v1",
      studyId: `phase-${randomUUID()}`, model: "qwz", computedAt: new Date().toISOString(),
      axes: { mass: [...new Set(points.map(p => p.mass))].sort((a, b) => a - b),
        grid: [...new Set(points.map(p => p.grid))].sort((a, b) => a - b) }, points };
    assertQwzPhaseDiagram(diagram);
    await mkdir(this.root, { recursive: true });
    const path = join(this.root, `${diagram.studyId}.json`), temp = join(this.root, `.${diagram.studyId}.tmp`);
    try { await writeFile(temp, JSON.stringify(diagram, null, 2) + "\n", { flag: "wx" }); await rename(temp, path); }
    finally { await unlink(temp).catch(() => {}); }
    return diagram;
  }
  async get(studyId: string): Promise<QwzPhaseDiagram> {
    if (!/^phase-[a-f0-9-]{36}$/.test(studyId)) throw new Error("Invalid phase study ID");
    const path = join(this.root, `${studyId}.json`), info = await lstat(path);
    if (!info.isFile() || info.isSymbolicLink() || info.size > 128 * 1024) throw new Error("Invalid phase study file");
    const value: unknown = JSON.parse(await readFile(path, "utf8")); assertQwzPhaseDiagram(value);
    if (value.studyId !== studyId) throw new Error("Phase study identity changed");
    for (const point of value.points) {
      const source = await this.runs.verifiedSource(point.runId, point.resultSha256), result = source.result;
      if (result.operation !== "topology" || result.model.type !== "qwz" || result.analysis.kind !== "qwz" ||
          result.model.parameters.mass !== point.mass || result.model.parameters.grid !== point.grid ||
          result.analysis.bulkGap !== point.bulkGap || result.analysis.gapClosed !== point.gapClosed ||
          result.analysis.meshResolved !== point.meshResolved ||
          (result.analysis.meshResolved && !result.analysis.gapClosed ? result.analysis.chern : null) !== point.chern ||
          (await this.runs.scene(point.runId, "standard")).scene.id !== point.scenes.curvature ||
          (await this.runs.scene(point.runId, "bands")).scene.id !== point.scenes.bands)
        throw new Error("Phase point differs from its verified source run");
    }
    return value;
  }
  async list(): Promise<{ studyId: string; computedAt: string; points: number }[]> {
    await mkdir(this.root, { recursive: true });
    const result: { studyId: string; computedAt: string; points: number }[] = [];
    for (const entry of await readdir(this.root)) if (/^phase-[a-f0-9-]{36}\.json$/.test(entry)) {
      try { const map = await this.get(entry.slice(0, -5)); result.push({ studyId: map.studyId,
        computedAt: map.computedAt, points: map.points.length }); } catch { /* Omit changed sources. */ }
    }
    return result.sort((a, b) => b.computedAt.localeCompare(a.computedAt));
  }
}
