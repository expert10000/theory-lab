/** Export a verified finite-speed filled-band cycle for a read-only scene consumer.
 * Usage: npx tsx scripts/export-rice-mele-finite-fixture.ts <existing-output-directory>
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
const root = await mkdtemp(join(tmpdir(), "qlab-rice-finite-fixture-"));
const worker = new WorkerSupervisor(process.cwd());
try {
  const job = topologyJob("fixture-rice-mele-finite", {
    ...TOPOLOGY_DEFAULTS, modelId: "rice_mele_pump", pumpDuration: "80", pumpSteps: "16",
  });
  await worker.start();
  const result = await worker.request("quantum.run", job);
  if (!isQuantumResult(result) || result.operation !== "topology" ||
      result.analysis.kind !== "rice_mele_pump" || !isTopologyResponse(result, job) ||
      result.analysis.dynamics?.status !== "resolved")
    throw new Error("Unverified finite-speed Rice–Mele result");
  const store = new RunStore(join(root, "runs"), join(root, "artifacts"));
  await store.record(job, result);
  await store.topology(result.runId);
  const scene = await store.exportScene(result.runId, resolve(destination), "standard");
  await writeFile(join(resolve(destination), "rice-mele-finite-producer-result.json"),
    await readFile(join(root, "runs", result.runId, "result.json")), { flag: "wx" });
  console.log(JSON.stringify({ scene, runId: result.runId,
    charge: result.analysis.dynamics.transportedCharge }));
} finally {
  await worker.stop();
  await rm(root, { recursive: true, force: true });
}
