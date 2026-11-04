/** Export the pinned verified QWZ saved run into two unchanged quantum-scene/v1 readers.
 * Usage: npx tsx scripts/export-qwz-baseline.ts <existing-output-directory>
 */
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { RunStore } from "../apps/desktop/main/runs";
import { assertQuantumResultV2 } from "../packages/contracts/result-v2";

const destination = process.argv[2];
if (!destination) throw new Error("Pass an existing output directory");
const root = resolve("packages/contracts/fixtures");
const runId = "run-05ce1036d70c466eb4f900944a85c474";
const store = new RunStore(root, root);
const descriptor = await store.resultV2(runId);
const source = await readFile(resolve(root, runId, "result.json"));
assertQuantumResultV2(descriptor, source);
const curvature = await store.exportScene(runId, resolve(destination), "standard");
const bands = await store.exportScene(runId, resolve(destination), "bands");
console.log(JSON.stringify({ runId, resultSha256: descriptor.source.resultSha256, curvature, bands }));
