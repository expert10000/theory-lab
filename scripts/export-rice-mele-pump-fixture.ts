/** Export one verified filled-band pump cycle for a read-only scene consumer.
 * Usage: npx tsx scripts/export-rice-mele-pump-fixture.ts <existing-output-directory>
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
const root = await mkdtemp(join(tmpdir(), "qlab-rice-pump-fixture-"));
const worker = new WorkerSupervisor(process.cwd());
try {
  const job = topologyJob("fixture-rice-mele-pump", {
    ...TOPOLOGY_DEFAULTS, modelId: "rice_mele_pump",
  });
  await worker.start();
  const result = await worker.request("quantum.run", job);
  if (!isQuantumResult(result) || result.operation !== "topology" ||
      result.analysis.kind !== "rice_mele_pump" || !isTopologyResponse(result, job) ||
      result.analysis.status !== "defined" || result.analysis.chern !== -1 ||
      result.analysis.polarizationWinding !== -1)
    throw new Error("Unverified Rice–Mele pump result");
  const store = new RunStore(join(root, "runs"), join(root, "artifacts"));
  await store.record(job, result);
  await store.topology(result.runId);
  const scene = await store.exportScene(result.runId, resolve(destination), "standard");
  await writeFile(join(resolve(destination), "rice-mele-pump-producer-result.json"),
    await readFile(join(root, "runs", result.runId, "result.json")), { flag: "wx" });
  console.log(JSON.stringify({ scene, runId: result.runId, chern: result.analysis.chern }));
} finally {
  await worker.stop();
  await rm(root, { recursive: true, force: true });
}
