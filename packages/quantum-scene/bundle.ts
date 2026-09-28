import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { assertScene, verifyScenePayload, type ScenePayload } from "./index";

const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const digest = async (bytes: Uint8Array) => hash(bytes);
export async function writeSceneBundle(payload: ScenePayload, parent: string): Promise<string> {
  await verifyScenePayload(payload, digest);
  // A user-selected parent plus a validated logical ID; never overwrite a bundle.
  const directory = join(parent, `${payload.scene.id}.qscene`);
  await mkdir(directory, { recursive: false });
  try {
    const sceneBytes = Buffer.from(JSON.stringify(payload.scene, null, 2) + "\n");
    await writeFile(join(directory, "scene.json"), sceneBytes, { flag: "wx" });
    for (const d of payload.scene.datasets) await writeFile(join(directory, d.path), payload.artifacts[d.path], { flag: "wx" });
    await writeFile(join(directory, "bundle.json"), JSON.stringify({ schema: "quantum-scene-bundle/v1", scene: { path: "scene.json", bytes: sceneBytes.length, sha256: hash(sceneBytes) } }, null, 2) + "\n", { flag: "wx" });
    return directory;
  } catch (error) {
    // This exact child directory was exclusively created above by this call.
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}
async function boundedRead(path: string, expected?: number) {
  const info = await lstat(path);
  if (!info.isFile() || info.size > (expected ?? 128 * 1024) || (expected !== undefined && info.size !== expected)) throw new Error("Invalid bundle file size");
  return readFile(path);
}
export async function readSceneBundle(directory: string): Promise<ScenePayload> {
  const manifest = JSON.parse((await boundedRead(join(directory, "bundle.json"))).toString("utf8"));
  if (manifest.schema !== "quantum-scene-bundle/v1" || Object.keys(manifest).sort().join(",") !== "scene,schema" ||
      !manifest.scene || Object.keys(manifest.scene).sort().join(",") !== "bytes,path,sha256" ||
      manifest.scene.path !== "scene.json" || !Number.isInteger(manifest.scene.bytes) || manifest.scene.bytes < 1 || manifest.scene.bytes > 128 * 1024 ||
      typeof manifest.scene.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(manifest.scene.sha256)) throw new Error("Invalid scene bundle manifest");
  const bytes = await boundedRead(join(directory, "scene.json"), manifest.scene.bytes);
  if (hash(bytes) !== manifest.scene.sha256) throw new Error("Scene metadata integrity failed");
  const scene: unknown = JSON.parse(bytes.toString("utf8")); assertScene(scene);
  const artifacts: ScenePayload["artifacts"] = {};
  for (const d of scene.datasets) artifacts[d.path] = await boundedRead(join(directory, d.path), d.bytes);
  const payload = { scene, artifacts };
  await verifyScenePayload(payload, digest);
  return payload;
}
