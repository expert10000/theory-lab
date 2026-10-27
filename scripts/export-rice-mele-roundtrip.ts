/** Build five real saved runs in a disposable Lab profile for the two-app acceptance. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve, sep } from "node:path";
import { WorkerSupervisor } from "../apps/desktop/main/worker";
import { RunStore } from "../apps/desktop/main/runs";
import { RiceMeleConvergenceStudyStore } from "../apps/desktop/main/rice-mele-convergence-studies";
import { isQuantumResult } from "../packages/contracts";
import { deriveRiceMeleConvergenceStudy } from "../packages/models/rice-mele-convergence";
import { TOPOLOGY_DEFAULTS, topologyJob } from "../packages/models/topology";
import { writeSceneBundle } from "../packages/quantum-scene/bundle";

const [profileArg, exportArg, reportArg] = process.argv.slice(2);
function checkedDirectory(value: string | undefined, label: string): string {
  if (!value || !isAbsolute(value)) throw new Error(`${label} must be an absolute path`);
  const path = resolve(value), temporary = resolve(tmpdir());
  if (!path.startsWith(temporary + sep) || !path.includes("rice-roundtrip-"))
    throw new Error(`${label} must be inside a rice-roundtrip- temporary directory`);
  return path;
}
const profile = checkedDirectory(profileArg, "Profile");
const exportParent = checkedDirectory(exportArg, "Export parent");
const report = checkedDirectory(reportArg, "Report");
if (!(await stat(profile)).isDirectory() || !(await stat(exportParent)).isDirectory())
  throw new Error("Create the empty profile and export parent before running this fixture producer");
const worker = new WorkerSupervisor(process.cwd());
try {
  await worker.start();
  const runs = new RunStore(join(profile, "runs"), join(profile, "artifacts"));
  const studies = new RiceMeleConvergenceStudyStore(join(profile, "studies"), runs);
  const results = [];
  for (const [duration, width] of [[20, 6], [30, 6], [40, 6], [30, 4], [30, 8]] as const) {
    const job = topologyJob(`roundtrip-${duration}-${width}-${randomUUID()}`, {
      ...TOPOLOGY_DEFAULTS, modelId: "rice_mele_pump", pumpK: "16", pumpPhases: "16",
      pumpSteps: "4", pumpDuration: String(duration), pumpChainCells: String(width),
    });
    const value = await worker.request("quantum.run", job);
    assert.ok(isQuantumResult(value) && value.operation === "topology" && value.analysis.kind === "rice_mele_pump");
    await runs.record(job, value);
    results.push(value);
  }
  const [short, anchor, long, narrow, wide] = results;
  const plan = { schema: "quantum-rice-mele-convergence-plan/v1" as const,
    studyId: `rice-roundtrip-${randomUUID()}`, anchorRunId: anchor.runId,
    durationRuns: [short.runId, anchor.runId, long.runId],
    widthRuns: [narrow.runId, anchor.runId, wide.runId] };
  const study = await deriveRiceMeleConvergenceStudy(plan, results);
  await studies.save(study);
  const bundle = await writeSceneBundle(await studies.scene(study.studyId), exportParent);
  const periodic = study.sources.find(source => source.runId === anchor.runId)!;
  const chain = study.sources.find(source => source.runId === wide.runId)!;
  const evidence = { schema: "rice-mele-two-app-fixture/v1", profile, bundle, studyId: study.studyId,
    sources: study.sources.map(({ runId, resultSha256 }) => ({ runId, resultSha256 })),
    selected: { periodic: { runId: periodic.runId, resultSha256: periodic.resultSha256, duration: 30 },
      chain: { runId: chain.runId, resultSha256: chain.resultSha256, width: 8 } } };
  await mkdir(resolve(report, ".."), { recursive: true });
  await writeFile(report, JSON.stringify(evidence, null, 2) + "\n", { flag: "wx" });
  process.stdout.write(JSON.stringify(evidence) + "\n");
} finally { await worker.stop(); }
