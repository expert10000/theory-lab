import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { RunStore } from "./runs";

/** The handoff is a portable folder; Math3D independently verifies both bundles. */
export async function prepareQwzStudyHandoff(runs: RunStore, runId: string, resultSha256: string, parent: string) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(runId) || !/^[a-f0-9]{64}$/.test(resultSha256))
    throw new TypeError("Invalid QWZ study source identity");
  const saved = await runs.verifiedSource(runId, resultSha256);
  if (saved.result.operation !== "topology" || saved.result.model.type !== "qwz")
    throw new Error("Only a verified saved QWZ run can declare this two-scene study");
  await mkdir(parent, { recursive: true });
  const curvature = await runs.prepareSceneHandoff(runId, parent, "standard", resultSha256);
  const bands = await runs.prepareSceneHandoff(runId, parent, "bands", resultSha256);
  const scenes = [{ role: "curvature", folder: basename(curvature.directory), sceneId: curvature.sceneId },
    { role: "bands", folder: basename(bands.directory), sceneId: bands.sceneId }];
  const manifest = { schema: "quantum-study-handoff/v1", model: "qwz", runId, resultSha256, scenes };
  await writeFile(join(parent, "study.json"), JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
  return { directory: parent, manifest };
}

export async function prepareHofstadterStudyHandoff(runs: RunStore, runId: string, resultSha256: string, parent: string) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(runId) || !/^[a-f0-9]{64}$/.test(resultSha256))
    throw new TypeError("Invalid Hofstadter study source identity");
  const saved = await runs.verifiedSource(runId, resultSha256);
  if (saved.result.operation !== "topology" || saved.result.model.type !== "hofstadter" ||
      saved.result.model.parameters.q < 2 ||
      saved.result.analysis.kind !== "hofstadter" || !saved.result.analysis.strip)
    throw new Error("A verified saved Hofstadter run with strip samples is required");
  await mkdir(parent, { recursive: true });
  const bands = await runs.prepareSceneHandoff(runId, parent, "standard", resultSha256);
  const strip = await runs.prepareSceneHandoff(runId, parent, "strip", resultSha256);
  const scenes = [{ role: "bands", folder: basename(bands.directory), sceneId: bands.sceneId },
    { role: "strip", folder: basename(strip.directory), sceneId: strip.sceneId }];
  const manifest = { schema: "quantum-study-handoff/v2", model: "hofstadter", runId, resultSha256, scenes };
  await writeFile(join(parent, "study.json"), JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
  return { directory: parent, manifest };
}
