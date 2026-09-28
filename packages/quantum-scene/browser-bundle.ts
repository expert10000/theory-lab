import { assertScene, verifyScenePayload, type ScenePayload } from "./index";
import { assertStream, MAX_STREAM_METADATA, type SceneStream } from "./stream";
export interface SelectedSceneFile {
  path: string;
  size: number;
  read: () => Promise<Uint8Array>;
}
export async function readBrowserBundle(
  files: SelectedSceneFile[],
  digest: (bytes: Uint8Array) => Promise<string>,
  signal?: AbortSignal,
): Promise<
  | { kind: "regular"; payload: ScenePayload }
  | {
      kind: "stream";
      manifest: SceneStream;
      read: (path: string, signal: AbortSignal) => Promise<Uint8Array>;
    }
> {
  signal?.throwIfAborted();
  if (files.length < 3 || files.length > 1026)
    throw new Error("Invalid scene folder file count");
  const map = new Map<string, SelectedSceneFile>();
  let root: string | undefined, depth: number | undefined;
  for (const f of files) {
    const parts = f.path.split("/");
    if (
      parts.length > 2 ||
      parts.some((p) => !p || p === "." || p === ".." || p.includes("\\")) ||
      !Number.isSafeInteger(f.size) ||
      f.size < 0
    )
      throw new Error("Nested or unsafe scene folder path");
    if (depth !== undefined && depth !== parts.length)
      throw new Error("Mixed scene folders");
    depth = parts.length;
    if (parts.length === 2) {
      if (root !== undefined && root !== parts[0])
        throw new Error("Mixed scene folders");
      root = parts[0];
    }
    const name = parts.at(-1)!;
    if (map.has(name)) throw new Error("Duplicate scene file");
    map.set(name, f);
  }
  async function read(
    path: string,
    limit: number,
    expected?: number,
    readSignal = signal,
  ) {
    readSignal?.throwIfAborted();
    const file = map.get(path);
    if (
      !file ||
      file.size > limit ||
      (expected !== undefined && file.size !== expected)
    )
      throw new Error("Invalid scene file size or missing file");
    const b = await file.read();
    readSignal?.throwIfAborted();
    if (
      !(b instanceof Uint8Array) ||
      b.length !== file.size ||
      b.length > limit
    )
      throw new Error("Scene file changed size");
    return b;
  }
  const manifest = JSON.parse(
      new TextDecoder().decode(await read("bundle.json", 128 * 1024)),
    ),
    stream = manifest.schema === "quantum-scene-stream-bundle/v1",
    key = stream ? "stream" : "scene",
    entry = manifest[key],
    path = stream ? "stream.json" : "scene.json",
    limit = stream ? MAX_STREAM_METADATA : 128 * 1024;
  if (
    !["quantum-scene-bundle/v1", "quantum-scene-stream-bundle/v1"].includes(
      manifest.schema,
    ) ||
    Object.keys(manifest).sort().join(",") !==
      ["schema", key].sort().join(",") ||
    !entry ||
    Object.keys(entry).sort().join(",") !== "bytes,path,sha256" ||
    entry.path !== path ||
    !Number.isInteger(entry.bytes) ||
    entry.bytes < 1 ||
    entry.bytes > limit ||
    typeof entry.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(entry.sha256)
  )
    throw new Error("Invalid scene bundle manifest");
  const bytes = await read(path, limit, entry.bytes);
  if ((await digest(bytes)) !== entry.sha256)
    throw new Error("Scene metadata integrity failed");
  signal?.throwIfAborted();
  const data: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (stream) {
    assertStream(data);
    const expected = new Set([
      "bundle.json",
      path,
      ...data.chunks.map((c) => c.path),
    ]);
    if (
      map.size !== expected.size ||
      [...map.keys()].some((p) => !expected.has(p))
    )
      throw new Error("Unexpected scene folder files");
    return {
      kind: "stream",
      manifest: data,
      read: async (path, signal) => {
        signal.throwIfAborted();
        const c = data.chunks.find((c) => c.path === path);
        if (!c) throw new Error("Unknown stream chunk");
        const b = await read(path, c.bytes, c.bytes, signal);
        signal.throwIfAborted();
        return b;
      },
    };
  }
  assertScene(data);
  const expected = new Set([
    "bundle.json",
    path,
    ...data.datasets.map((d) => d.path),
  ]);
  if (
    map.size !== expected.size ||
    [...map.keys()].some((p) => !expected.has(p))
  )
    throw new Error("Unexpected scene folder files");
  const artifacts: Record<string, Uint8Array> = {};
  for (const d of data.datasets)
    artifacts[d.path] = await read(d.path, d.bytes, d.bytes);
  const payload = { scene: data, artifacts };
  await verifyScenePayload(payload, digest);
  signal?.throwIfAborted();
  return { kind: "regular", payload };
}
export async function boundedResponse(
  response: Response,
  limit: number,
): Promise<Uint8Array> {
  const length = response.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > limit))
    throw new Error("Scene response exceeds byte budget");
  if (!response.body) throw new Error("Missing scene response body");
  const reader = response.body.getReader(),
    parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw new Error("Scene response exceeds byte budget");
      parts.push(value);
    }
    if (length !== null && size !== Number(length))
      throw new Error("Scene response size mismatch");
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const p of parts) {
      bytes.set(p, offset);
      offset += p.length;
    }
    return bytes;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
