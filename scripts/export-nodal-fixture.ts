/** Export a source-linked Atlas nodal ring scene for Math3D.
 * Usage: npx tsx scripts/export-nodal-fixture.ts <existing-output-directory>
 */
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { WorkerSupervisor } from "../apps/desktop/main/worker";
import { RunStore } from "../apps/desktop/main/runs";
import { isQuantumResult } from "../packages/contracts";
import { TOPOLOGY_DEFAULTS, isTopologyResponse, topologyJob } from "../packages/models/topology";

const destination = process.argv[2];
if (!destination) throw new Error("Pass an existing output directory");
const root = await mkdtemp(join(tmpdir(), "qlab-nodal-fixture-")), worker = new WorkerSupervisor(process.cwd());
try {
  const job = topologyJob("fixture-nodal-ring", { ...TOPOLOGY_DEFAULTS, modelId: "nodal_line_two_band",
    mass: "1", curvature: "1", velocity: "1", loopCenter: "1", loopRadius: "0.25", loopSamples: "64" });
  await worker.start();
  const result = await worker.request("quantum.run", job);
  if (!isQuantumResult(result) || result.operation !== "topology" || result.analysis.kind !== "nodal_line_two_band" ||
      !isTopologyResponse(result, job) || result.analysis.status !== "defined") throw new Error("Unverified nodal result");
  const store = new RunStore(join(root, "runs"), join(root, "artifacts"));
  await store.record(job, result);
  await store.topology(result.runId);
  const scene = await store.exportScene(result.runId, resolve(destination), "standard");
  await writeFile(join(resolve(destination), "nodal-ring-producer-result.json"),
    await readFile(join(root, "runs", result.runId, "result.json")), { flag: "wx" });
  console.log(JSON.stringify({ scene, runId: result.runId, ringRadius: result.analysis.ringRadius,
    berryPhase: result.analysis.berryPhase, samples: result.analysis.loopPositions.length }));
} finally { await worker.stop(); await rm(root, { recursive: true, force: true }); }
