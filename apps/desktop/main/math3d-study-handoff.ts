import { lstat, mkdir, mkdtemp, readdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { boundedRead, readSceneBundle } from "../../../packages/quantum-scene/bundle";
import type { RunStore } from "./runs";

export type QwzStudyManifest = {
  schema: "quantum-study-handoff/v1";
  model: "qwz";
  runId: string;
  resultSha256: string;
  scenes: [
    { role: "curvature"; folder: string; sceneId: string },
    { role: "bands"; folder: string; sceneId: string },
  ];
};

/** Check the exact manifest plus both hash-verified bundles before launch. */
export async function verifyQwzStudyHandoff(directory: string, expected: QwzStudyManifest) {
  const names = new Set(["study.json", ...expected.scenes.map(scene => scene.folder)]);
  if (names.size !== 3 || expected.scenes.some(scene =>
    basename(scene.folder) !== scene.folder || !scene.folder.endsWith(".qscene")))
    throw new Error("Invalid QWZ study scene folders");
  const entries = await readdir(directory, { withFileTypes: true });
  if (entries.length !== names.size || entries.some(entry =>
    !names.has(entry.name) || entry.isSymbolicLink() ||
    (entry.name === "study.json" ? !entry.isFile() : !entry.isDirectory())))
    throw new Error("QWZ study contains missing, unexpected or linked files");
  const manifestBytes = await boundedRead(join(directory, "study.json"));
  if (!manifestBytes.equals(Buffer.from(JSON.stringify(expected, null, 2) + "\n")))
    throw new Error("QWZ study manifest changed after preparation");
  for (const declared of expected.scenes) {
    const { scene } = await readSceneBundle(join(directory, declared.folder));
    if (scene.id !== declared.sceneId || scene.provenance.runId !== expected.runId ||
        scene.provenance.resultSha256 !== expected.resultSha256 ||
        scene.provenance.model !== "qwz")
      throw new Error("QWZ study scene source or identity changed");
    const datasets = new Set(scene.datasets.map(dataset => dataset.id));
    if (declared.role === "curvature" ? !datasets.has("curvature") :
        !datasets.has("band-energy-0") || !datasets.has("band-energy-1"))
      throw new Error("QWZ study scene role changed");
  }
}

/** The handoff is a portable folder; Math3D independently verifies both bundles. */
export async function prepareQwzStudyHandoff(runs: RunStore, runId: string, resultSha256: string, parent: string) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(runId) || !/^[a-f0-9]{64}$/.test(resultSha256))
    throw new TypeError("Invalid QWZ study source identity");
  const saved = await runs.verifiedSource(runId, resultSha256);
  if (saved.result.operation !== "topology" || saved.result.model.type !== "qwz")
    throw new Error("Only a verified saved QWZ run can declare this two-scene study");
  await mkdir(dirname(parent), { recursive: true });
  try { await lstat(parent); throw new Error("QWZ study destination already exists"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const staging = await mkdtemp(join(dirname(parent), ".qwz-study-finalizing-"));
  try {
    const curvature = await runs.prepareSceneHandoff(runId, staging, "standard", resultSha256);
    const bands = await runs.prepareSceneHandoff(runId, staging, "bands", resultSha256);
    const scenes: QwzStudyManifest["scenes"] = [
      { role: "curvature", folder: basename(curvature.directory), sceneId: curvature.sceneId },
      { role: "bands", folder: basename(bands.directory), sceneId: bands.sceneId },
    ];
    const manifest: QwzStudyManifest = { schema: "quantum-study-handoff/v1", model: "qwz", runId, resultSha256, scenes };
    await writeFile(join(staging, "study.json"), JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
    await verifyQwzStudyHandoff(staging, manifest);
    await rename(staging, parent);
    return { directory: parent, manifest };
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
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
