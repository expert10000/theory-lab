/** Generate reproducible QI-40 Theory Lab producer evidence from the pinned QWZ run.
 * Usage: npx tsx scripts/verify-qi40-source.ts [new-output-directory]
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { RunStore } from "../apps/desktop/main/runs";
import { prepareQwzStudyHandoff, verifyQwzStudyHandoff } from "../apps/desktop/main/math3d-study-handoff";
import { readSceneBundle } from "../packages/quantum-scene/bundle";
import { QWZ_SCENE_COMPILER_VERSION, QWZ_SCENE_NUMERIC_POLICY } from "../packages/quantum-scene/recipes";

const runId = "run-05ce1036d70c466eb4f900944a85c474";
const resultSha256 = "01eb644e4a07df9f4aa6f49ce27a61a1e98d920aabd794962f57420ca2d2decf";
const goldenSceneHashes = {
  curvature: "38f8275bfd0e568251ef44742fe7ef412c958cb066e713558768cc2872af65b5",
  bands: "9759d1e5555fd8c7af7614a08e372593d55398894960f5d96eb41a349555890b",
};
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const fixtureRoot = resolve("packages/contracts/fixtures");
const store = new RunStore(fixtureRoot, fixtureRoot);

async function generate(directory: string) {
  const source = await store.inspect(runId);
  assert.equal(source.hashes.result, resultSha256);
  const sourceBytes = await readFile(join(fixtureRoot, runId, "result.json"));
  assert.equal(digest(sourceBytes), resultSha256);
  const studyDirectory = join(directory, "study");
  const handoff = await prepareQwzStudyHandoff(store, runId, resultSha256, studyDirectory);
  await verifyQwzStudyHandoff(studyDirectory, handoff.manifest);
  const scenes = [];
  for (const declared of handoff.manifest.scenes) {
    const sceneDirectory = join(studyDirectory, declared.folder);
    const payload = await readSceneBundle(sceneDirectory);
    const sceneSha256 = digest(await readFile(join(sceneDirectory, "scene.json")));
    assert.equal(sceneSha256, goldenSceneHashes[declared.role]);
    const datasets = [];
    for (const dataset of payload.scene.datasets) {
      assert.equal(digest(await readFile(join(sceneDirectory, dataset.path))), dataset.sha256);
      datasets.push({ id: dataset.id, bytes: dataset.bytes, sha256: dataset.sha256 });
    }
    scenes.push({
      role: declared.role,
      folder: declared.folder,
      sceneId: declared.sceneId,
      bundleSha256: digest(await readFile(join(sceneDirectory, "bundle.json"))),
      sceneSha256,
      datasets,
    });
  }
  return {
    schema: "theory-lab/qi40-source-evidence/v1",
    source: { runId, resultSha256 },
    compiler: { version: QWZ_SCENE_COMPILER_VERSION, numericPolicy: QWZ_SCENE_NUMERIC_POLICY },
    study: { manifestSha256: digest(await readFile(join(studyDirectory, "study.json"))), scenes },
  };
}

if (process.argv.length > 3) throw new Error("Pass at most one new output directory");
const scratch = await mkdtemp(join(tmpdir(), "qi40-source-"));
const destination = process.argv[2] ? resolve(process.argv[2]) : join(scratch, "output");
try {
  await mkdir(destination);
  const first = await generate(destination);
  const secondDirectory = join(scratch, "repeat");
  await mkdir(secondDirectory);
  const second = await generate(secondDirectory);
  assert.deepEqual(first, second, "QWZ study evidence changed between identical exports");
  const evidence = Buffer.from(JSON.stringify(first, null, 2) + "\n");
  await writeFile(join(destination, "evidence.json"), evidence, { flag: "wx" });
  process.stdout.write(`QI-40 source evidence verified: ${digest(evidence)}\n`);
  if (process.argv[2]) process.stdout.write(`Saved ${join(destination, "evidence.json")}\n`);
} finally {
  await rm(scratch, { recursive: true, force: true });
}
